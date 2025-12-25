import { NextResponse } from "next/server";
import { supabaseServer } from "@/app/utils/supabase/server";
import type { QuizCategory, QuizQuestion, RecommendConfig, RecoProduct, Recommendation } from "@/lib/types";
import { buildRuleFromQuestion, recommendTopProducts } from "@/lib/recommendation";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const category = body.category as QuizCategory;
    const rawAnswers = body.answers as Record<string, unknown>;

    if (category !== "smartphones" && category !== "tvs") {
      return new NextResponse("Invalid category", { status: 400 });
    }
    if (!rawAnswers || typeof rawAnswers !== "object") {
      return new NextResponse("Invalid answers", { status: 400 });
    }

    const answers = normalizeAnswers(rawAnswers);

    const { data: products, error: prodErr } = await supabaseServer
      .from("products")
      .select("id, brand, model, price_hint, affiliate_links, warranty_text, specs, category")
      .eq("category", category)
      .eq("is_active", true)
      .order("brand", { ascending: true })
      .order("model", { ascending: true });

    if (prodErr) throw new Error(prodErr.message);

    const { data: questions, error: qErr } = await supabaseServer
      .from("quiz_questions")
      .select("id, category, question, type, options, weightings, order, key")
      .eq("category", category)
      .eq("is_active", true);

    if (qErr) throw new Error(qErr.message);

    const rules = (questions ?? []).map((q) => buildRuleFromQuestion(q as QuizQuestion));

    const config: RecommendConfig = detectTieBreakerConfig(questions as QuizQuestion[]);

    const scoredTop3: Recommendation[] = recommendTopProducts(
      (products ?? []) as unknown as RecoProduct[],
      answers,
      rules,
      config
    );

    const { data: submission, error: subErr } = await supabaseServer
      .from("quiz_submissions")
      .insert({
        category,
        answers,
        top_3: scoredTop3,
        score_percent: scoredTop3[0]?.percent ?? null,
        utm: null,
        email: null,
        first_name: null,
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

function detectTieBreakerConfig(questions: QuizQuestion[]): RecommendConfig {
  const result: RecommendConfig = {};

  const findByKey = (key: string) =>
    questions.find((q) => typeof q.key === "string" && q.key.toLowerCase() === key)?.id;

  result.brandQuestionId = findByKey("brand") ?? findQuestionIdByInference(questions, "brand");
  result.warrantyQuestionId = findByKey("warranty") ?? findQuestionIdByInference(questions, "warranty");
  result.performanceQuestionId =
    findByKey("performance") ?? findQuestionIdByInference(questions, "performance");

  return result;
}

function findQuestionIdByInference(questions: QuizQuestion[], kind: "brand" | "warranty" | "performance") {
  const match = questions.find((q) => {
    const text = q.question.toLowerCase();
    if (kind === "brand") return text.includes("brand");
    if (kind === "warranty") return text.includes("warranty");
    if (kind === "performance")
      return text.includes("performance") || q.options?.some((o) => o.toLowerCase().includes("heavy use"));
    return false;
  });
  return match?.id;
}

function normalizeAnswers(raw: Record<string, unknown>): Record<string, string> {
  return Object.entries(raw).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value === undefined || value === null) return acc;
    acc[key] = typeof value === "string" ? value : String(value);
    return acc;
  }, {});
}
