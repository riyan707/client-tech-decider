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

    // ✅ Fetch products
    const { data: products, error: prodErr } = await supabaseServer
      .from("products")
      .select("id, brand, model, price_hint, affiliate_links, warranty_text, specs, category")
      .eq("category", category)
      .eq("is_active", true)
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
    const typedProducts = (products ?? []) as unknown as RecoProduct[];

    if (typedQuestions.length === 0) {
      return new NextResponse("No active questions for this category", { status: 400 });
    }
    if (typedProducts.length === 0) {
      return new NextResponse("No active products for this category", { status: 400 });
    }

    // ✅ Build rules + config
    const rules = typedQuestions.map((q) => buildRuleFromQuestion(q));
    const config: RecommendConfig = detectTieBreakerConfig(typedQuestions);

    // ✅ Score and select top 3
    const scoredTop3: Recommendation[] = recommendTopProducts(
      typedProducts,
      answers,
      rules,
      config
    );

    const bestPercent = scoredTop3[0]?.percent ?? null;

    // ✅ Persist submission
    const { data: submission, error: subErr } = await supabaseServer
      .from("quiz_submissions")
      .insert({
        category,
        answers,
        top_3: scoredTop3,
        score_percent: bestPercent,
        utm,
        email,
        first_name,
      })
      .select("id")
      .single();

    if (subErr) throw new Error(subErr.message);

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
    // Keep only if RecommendConfig supports it
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
