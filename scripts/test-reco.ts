// scripts/test-reco.ts
import { buildRuleFromQuestion, recommendTopProducts } from "../lib/recommendation";
import type { QuizQuestion, RecoProduct } from "../lib/types";

function runCase(name: string, answers: Record<string, string>, products: RecoProduct[], questions: QuizQuestion[]) {
  const rules = questions.map((q) => buildRuleFromQuestion(q));

  // Tie-breakers point to question IDs (UUIDs or any string IDs you use in test)
  const config = {
    brandQuestionId: "q_brand",
    warrantyQuestionId: "q_warranty",
    performanceQuestionId: "q_perf",
  };

  const top3 = recommendTopProducts(products, answers, rules as any, config as any);

  console.log(`\n=== ${name} ===`);
  for (const r of top3) {
    console.log(
      `${r.brand} ${r.model} | score=${r.score} | percent=${r.percent}% | reasons=${(r.reasons ?? []).join(" | ")}`
    );
  }
}

function main() {
  // Minimal sample products mirroring your DB schema
  const products: RecoProduct[] = [
    {
      id: "p1",
      category: "smartphones",
      brand: "Apple",
      model: "iPhone 15 Pro",
      price_hint: "£900+",
      affiliate_links: { amazon: "https://example.com/iphone15pro" },
      warranty_text: "Typically 12 months manufacturer warranty.",
      specs: {
        price_band: "£900+",
        screen_size_band: "medium",
        performance_tier: 5,
        warranty_months: 12,
      },
    },
    {
      id: "p2",
      category: "smartphones",
      brand: "Google",
      model: "Pixel 8",
      price_hint: "£600–£900",
      affiliate_links: { amazon: "https://example.com/pixel8" },
      warranty_text: "Typically 24 months via many UK retailers.",
      specs: {
        price_band: "£600–£900",
        screen_size_band: "medium",
        performance_tier: 4,
        warranty_months: 24,
      },
    },
    {
      id: "p3",
      category: "smartphones",
      brand: "Samsung",
      model: "S24",
      price_hint: "£900+",
      affiliate_links: { amazon: "https://example.com/s24" },
      warranty_text: "Typically 24 months via many UK retailers.",
      specs: {
        price_band: "£900+",
        screen_size_band: "large",
        performance_tier: 5,
        warranty_months: 24,
      },
    },
  ];

  // Minimal sample questions with LEGACY weightings (your real-world case)
  const questions: QuizQuestion[] = [
    {
      id: "q_budget",
      category: "smartphones",
      question: "What is your budget?",
      type: "single_select",
      options: JSON.stringify(["£600–£900", "£900+", "No preference"]),
      weightings: { price_band: 0.25 } as any,
      order: 1,
      is_active: true,
    } as any,
    {
      id: "q_brand",
      category: "smartphones",
      question: "Which brand do you prefer?",
      type: "single_select",
      options: JSON.stringify(["Apple", "Samsung", "Google", "No preference"]),
      weightings: { brand: 0.15 } as any,
      order: 2,
      is_active: true,
    } as any,
    {
      id: "q_warranty",
      category: "smartphones",
      question: "Preferred warranty?",
      type: "single_select",
      options: JSON.stringify(["12", "24", "No preference"]),
      weightings: { warranty_months: 0.1 } as any,
      order: 3,
      is_active: true,
    } as any,
    {
      id: "q_perf",
      category: "smartphones",
      question: "How heavy is your usage?",
      type: "single_select",
      options: JSON.stringify(["Heavy use (gaming, multitasking)", "No preference"]),
      // NOTE: this is legacy field_equals; product has performance_tier numeric.
      // For now this will mostly influence maxScore, not tie-break. That's fine for Step 5.
      weightings: { performance_tier: 0.2 } as any,
      order: 4,
      is_active: true,
    } as any,
  ];

  runCase(
    "Case 1: High budget + Apple",
    {
      q_budget: "£900+",
      q_brand: "Apple",
      q_warranty: "12",
      q_perf: "Heavy use (gaming, multitasking)",
    },
    products,
    questions
  );

  runCase(
    "Case 2: Mid budget + Google + 24 months",
    {
      q_budget: "£600–£900",
      q_brand: "Google",
      q_warranty: "24",
      q_perf: "No preference",
    },
    products,
    questions
  );

  runCase(
    "Case 3: No preference everywhere",
    {
      q_budget: "No preference",
      q_brand: "No preference",
      q_warranty: "No preference",
      q_perf: "No preference",
    },
    products,
    questions
  );
}

main();
