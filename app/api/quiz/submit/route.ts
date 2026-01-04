import { NextResponse } from "next/server";
import { supabaseServer } from "@/app/utils/supabase/server";
import type {
  QuizCategory,
  QuizQuestion,
  RecommendConfig,
  RecoProduct,
  Recommendation,
} from "@/lib/types";
import { buildRuleFromQuestion, recommendTopProducts } from "@/lib/recommendation";

type UtmPayload = {
  source?: string;
  campaign?: string;
  adset?: string;
  content?: string;
};

const REQUIRE_AFFILIATE_LINK = false; // ✅ Step 10.4 toggle (set true when ready)

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const category = body.category as QuizCategory;
    const rawAnswers = body.answers as Record<string, unknown>;

    // ✅ Lead fields (required)
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const first_name = typeof body.first_name === "string" ? body.first_name.trim() : "";

    // ✅ Optional UTM (sanitised)
    const utm: UtmPayload | null =
      body.utm && typeof body.utm === "object" && !Array.isArray(body.utm)
        ? {
            source: typeof body.utm.source === "string" ? body.utm.source : undefined,
            campaign: typeof body.utm.campaign === "string" ? body.utm.campaign : undefined,
            adset: typeof body.utm.adset === "string" ? body.utm.adset : undefined,
            content: typeof body.utm.content === "string" ? body.utm.content : undefined,
          }
        : null;

    // ✅ Validate category + answers
    if (category !== "smartphones" && category !== "tvs") {
      return new NextResponse("Invalid category", { status: 400 });
    }
    if (!rawAnswers || typeof rawAnswers !== "object") {
      return new NextResponse("Invalid answers", { status: 400 });
    }

    // ✅ Require identity (target quiz)
    if (!first_name) return new NextResponse("First name required", { status: 400 });
    if (!email) return new NextResponse("Email required", { status: 400 });

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) return new NextResponse("Invalid email", { status: 400 });

    const answers = normalizeAnswers(rawAnswers);

    // ✅ Fetch products (already includes is_active = true)
    const { data: products, error: prodErr } = await supabaseServer
      .from("products")
      .select("id, brand, model, price_hint, affiliate_links, warranty_text, specs, category")
      .eq("category", category)
      .eq("is_active", true) // ✅ Step 10.4 guardrail A
      .order("brand", { ascending: true })
      .order("model", { ascending: true });

    if (prodErr) throw new Error(prodErr.message);

    // ✅ Fetch questions
    const { data: questions, error: qErr } = await supabaseServer
      .from("quiz_questions")
      .select("id, category, question, type, options, weightings, order")
      .eq("category", category)
      .eq("is_active", true)
      .order("order", { ascending: true });

    if (qErr) throw new Error(qErr.message);

    const typedQuestions = (questions ?? []) as unknown as QuizQuestion[];
    const typedProductsAll = (products ?? []) as unknown as RecoProduct[];

    if (typedQuestions.length === 0) {
      return new NextResponse("No active questions for this category", { status: 400 });
    }
    if (typedProductsAll.length === 0) {
      return new NextResponse("No active products for this category", { status: 400 });
    }

    /** ---------------------------------------
     * ✅ Step 10.4 — Data quality guardrails
     * -------------------------------------- */

    // B) Optionally require at least 1 affiliate link
    const { qualifiedProducts, qualityNotes } = applyDataQualityGuardrails(
      typedProductsAll,
      { requireAffiliateLink: REQUIRE_AFFILIATE_LINK }
    );

    if (qualifiedProducts.length === 0) {
      // Don’t recommend anything if everything is dead
      return new NextResponse(
        REQUIRE_AFFILIATE_LINK
          ? "No products with affiliate links are available right now"
          : "No qualifying products are available right now",
        { status: 400 }
      );
    }

    // ✅ Build rules + config
    const rules = typedQuestions.map((q) => buildRuleFromQuestion(q));
    const config: RecommendConfig = detectTieBreakerConfig(typedQuestions);

    // ✅ Score and select top N (N = min(3, qualified count))
    const desiredCount = Math.min(3, qualifiedProducts.length);

    // recommendTopProducts currently returns top 3; we slice after
    const scored: Recommendation[] = recommendTopProducts(
      qualifiedProducts,
      answers,
      rules,
      config
    );

    const scoredTop = scored.slice(0, desiredCount);

    // C) If fewer than 3 qualify → show fewer and say why
    if (desiredCount < 3) {
      qualityNotes.push(
        `Only ${desiredCount} product${desiredCount === 1 ? "" : "s"} qualified, so we’re showing fewer recommendations.`
      );
    }

    const bestPercent = scoredTop[0]?.percent ?? null;

    // ✅ Persist submission
    // Recommended: add a column quiz_submissions.quality_notes (text[]) OR meta (jsonb)
    // If you don't want a migration right now, you can omit this field safely.
    const insertPayload: any = {
      category,
      answers,
      top_3: scoredTop,
      score_percent: bestPercent,
      utm,
      email,
      first_name,
      quality_notes: qualityNotes.length ? qualityNotes : null, // ⚠️ requires DB column
    };

    const { data: submission, error: subErr } = await supabaseServer
      .from("quiz_submissions")
      .insert(insertPayload)
      .select("id")
      .single();

    if (subErr) {
      // If you haven't added the column yet, Supabase will error.
      // Quick fallback: retry insert without quality_notes.
      if ((subErr.message || "").toLowerCase().includes("quality_notes")) {
        delete insertPayload.quality_notes;
        const { data: retry, error: retryErr } = await supabaseServer
          .from("quiz_submissions")
          .insert(insertPayload)
          .select("id")
          .single();
        if (retryErr) throw new Error(retryErr.message);
        return NextResponse.json({ submissionId: retry.id });
      }
      throw new Error(subErr.message);
    }

    return NextResponse.json({ submissionId: submission.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return new NextResponse(message, { status: 500 });
  }
}

/** ---------------------------
 *  Helpers
 *  -------------------------- */

function normalizeAnswers(raw: Record<string, unknown>): Record<string, string> {
  return Object.entries(raw).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value === undefined || value === null) return acc;
    acc[key] = typeof value === "string" ? value : String(value);
    return acc;
  }, {});
}

function detectTieBreakerConfig(questions: QuizQuestion[]): RecommendConfig {
  return {
    brandQuestionId: findQuestionIdByInference(questions, "brand"),
    warrantyQuestionId: findQuestionIdByInference(questions, "warranty"),
    performanceQuestionId: findQuestionIdByInference(questions, "performance"),
    noPreferenceValues: [null, "", "No preference", "no preference", "no_preference", "none"],
  } as RecommendConfig;
}

function findQuestionIdByInference(
  questions: QuizQuestion[],
  kind: "brand" | "warranty" | "performance"
) {
  const match = questions.find((q) => {
    const text = (q.question ?? "").toLowerCase();
    const optionsArr = safeOptionsArray(q.options);

    if (kind === "brand") {
      return (
        text.includes("brand") ||
        optionsArr.some((o) =>
          ["apple", "samsung", "google", "sony", "lg"].includes(o.toLowerCase())
        )
      );
    }

    if (kind === "warranty") return text.includes("warranty");

    if (kind === "performance") {
      return (
        text.includes("performance") ||
        optionsArr.some(
          (o) => o.toLowerCase().includes("heavy use") || o.toLowerCase().includes("gaming")
        )
      );
    }

    return false;
  });

  return match?.id;
}

function safeOptionsArray(options: unknown): string[] {
  if (Array.isArray(options)) return options.map(String);

  if (typeof options === "string") {
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }

  return [];
}

/** ---------------------------------------
 * ✅ Step 10.4 guardrails implementation
 * -------------------------------------- */

function applyDataQualityGuardrails(
  products: RecoProduct[],
  opts: { requireAffiliateLink: boolean }
): { qualifiedProducts: RecoProduct[]; qualityNotes: string[] } {
  const qualityNotes: string[] = [];

  let qualified = products;

  if (opts.requireAffiliateLink) {
    const before = qualified.length;
    qualified = qualified.filter((p: any) => hasAtLeastOneAffiliateLink(p?.affiliate_links));
    const removed = before - qualified.length;
    if (removed > 0) {
      qualityNotes.push(`${removed} product${removed === 1 ? "" : "s"} removed due to missing affiliate links.`);
    }
  }

  return { qualifiedProducts: qualified, qualityNotes };
}

function hasAtLeastOneAffiliateLink(affiliateLinks: unknown): boolean {
  if (!affiliateLinks || typeof affiliateLinks !== "object") return false;
  return Object.values(affiliateLinks as Record<string, unknown>).some(
    (v) => typeof v === "string" && v.trim().length > 0
  );
}
