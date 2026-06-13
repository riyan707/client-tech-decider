export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, quiz_questions, quiz_submissions } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import type {
  QuizCategory,
  QuizQuestion,
  RecommendConfig,
  RecoProduct,
  Recommendation,
} from "@/lib/types";
import { buildRuleFromQuestion, recommendTopProducts } from "@/lib/recommendation";
import { sendResultsEmail } from "@/lib/email";

type UtmPayload = {
  source?: string;
  campaign?: string;
  adset?: string;
  content?: string;
};

const REQUIRE_AFFILIATE_LINK = false;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const category = body.category as QuizCategory;
    const rawAnswers = body.answers as Record<string, unknown>;

    const email = typeof body.email === "string" ? body.email.trim() : "";
    const first_name = typeof body.first_name === "string" ? body.first_name.trim() : "";

    const utm: UtmPayload | null =
      body.utm && typeof body.utm === "object" && !Array.isArray(body.utm)
        ? {
            source: typeof body.utm.source === "string" ? body.utm.source : undefined,
            campaign: typeof body.utm.campaign === "string" ? body.utm.campaign : undefined,
            adset: typeof body.utm.adset === "string" ? body.utm.adset : undefined,
            content: typeof body.utm.content === "string" ? body.utm.content : undefined,
          }
        : null;

    if (category !== "smartphones" && category !== "tvs") {
      return new NextResponse("Invalid category", { status: 400 });
    }
    if (!rawAnswers || typeof rawAnswers !== "object") {
      return new NextResponse("Invalid answers", { status: 400 });
    }

    // Email and first name are optional — use sensible fallbacks
    const safeName = first_name || "Friend";
    const safeEmail = email || "anonymous@techdecider.com";

    if (email) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!emailOk) return new NextResponse("Invalid email", { status: 400 });
    }

    const answers = normalizeAnswers(rawAnswers);

    // Fetch products
    const productRows = await db
      .select({
        id: products.id,
        brand: products.brand,
        model: products.model,
        price_hint: products.price_hint,
        image_url: products.image_url,
        affiliate_links: products.affiliate_links,
        warranty_text: products.warranty_text,
        specs: products.specs,
        category: products.category,
      })
      .from(products)
      .where(and(eq(products.category, category), eq(products.is_active, true)))
      .orderBy(asc(products.brand), asc(products.model));

    // Fetch questions
    const questionRows = await db
      .select({
        id: quiz_questions.id,
        category: quiz_questions.category,
        question: quiz_questions.question,
        type: quiz_questions.type,
        options: quiz_questions.options,
        weightings: quiz_questions.weightings,
        order: quiz_questions.order,
      })
      .from(quiz_questions)
      .where(and(eq(quiz_questions.category, category), eq(quiz_questions.is_active, true)))
      .orderBy(asc(quiz_questions.order));

    const typedQuestions = questionRows as unknown as QuizQuestion[];
    const typedProductsAll = productRows as unknown as RecoProduct[];

    if (typedQuestions.length === 0) {
      return new NextResponse("No active questions for this category", { status: 400 });
    }
    if (typedProductsAll.length === 0) {
      return new NextResponse("No active products for this category", { status: 400 });
    }

    const { qualifiedProducts, qualityNotes } = applyDataQualityGuardrails(
      typedProductsAll,
      { requireAffiliateLink: REQUIRE_AFFILIATE_LINK }
    );

    if (qualifiedProducts.length === 0) {
      return new NextResponse(
        REQUIRE_AFFILIATE_LINK
          ? "No products with affiliate links are available right now"
          : "No qualifying products are available right now",
        { status: 400 }
      );
    }

    const rules = typedQuestions.map((q) => buildRuleFromQuestion(q));
    const config: RecommendConfig = detectTieBreakerConfig(typedQuestions);

    const desiredCount = Math.min(3, qualifiedProducts.length);

    const scored: Recommendation[] = recommendTopProducts(
      qualifiedProducts,
      answers,
      rules,
      config
    );

    const scoredTop = scored.slice(0, desiredCount);

    if (desiredCount < 3) {
      qualityNotes.push(
        `Only ${desiredCount} product${desiredCount === 1 ? "" : "s"} qualified, so we're showing fewer recommendations.`
      );
    }

    const bestPercent = scoredTop[0]?.percent ?? null;

    const insertPayload: any = {
      category,
      answers,
      top_3: scoredTop,
      score_percent: bestPercent,
      utm,
      email: safeEmail,
      first_name: safeName,
      quality_notes: qualityNotes.length ? qualityNotes : null,
    };

    const [submission] = await db
      .insert(quiz_submissions)
      .values(insertPayload)
      .returning({ id: quiz_submissions.id });

    // Only send email if user actually provided one
    if (email) sendResultsEmail({
      to: safeEmail,
      firstName: safeName,
      category,
      picks: scoredTop,
      submissionId: submission.id,
    }).catch(() => {});

    return NextResponse.json({ submissionId: submission.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return new NextResponse(message, { status: 500 });
  }
}

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
