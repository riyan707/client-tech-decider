import { buildRuleFromQuestion, recommendTopProducts } from "../lib/recommendation";
import type { QuizQuestion, RecoProduct } from "../lib/types";

const questionIds = {
  budget: "11111111-1111-1111-1111-111111111111",
  brand: "22222222-2222-2222-2222-222222222222",
  performance: "33333333-3333-3333-3333-333333333333",
};

const questions: QuizQuestion[] = [
  {
    id: questionIds.budget,
    category: "smartphones",
    question: "What's your budget?",
    type: "single_select",
    options: ["£900+", "£600-£899", "No preference"],
    weightings: { price_band: 0.25 },
    order: 1,
  },
  {
    id: questionIds.brand,
    category: "smartphones",
    question: "Any brand preference?",
    type: "single_select",
    options: ["Brand A", "Brand B", "No preference"],
    weightings: {
      type: "field_equals",
      field: "brand",
      weight: 1,
      pointsByOption: { "Brand A": 80, "Brand B": 80, "No preference": 0 },
      reasonsByOption: { "Brand A": "Matches your chosen brand.", "Brand B": "Matches your chosen brand." },
    },
    order: 2,
  },
  {
    id: questionIds.performance,
    category: "smartphones",
    question: "How will you use the phone?",
    type: "single_select",
    options: ["Heavy use", "Light use", "No preference"],
    weightings: { performance_tier: 0.2 },
    order: 3,
  },
];

const products: RecoProduct[] = [
  {
    id: "p1",
    category: "smartphones",
    brand: "Brand A",
    model: "Alpha",
    price_hint: "£900+",
    affiliate_links: {},
    warranty_text: "24 months",
    specs: { price_band: "£900+", performance_tier: "Heavy use", warranty_months: "24" },
  },
  {
    id: "p2",
    category: "smartphones",
    brand: "Brand B",
    model: "Bravo",
    price_hint: "£600-£899",
    affiliate_links: {},
    warranty_text: "12 months",
    specs: { price_band: "£600-£899", performance_tier: "Light use", warranty_months: "12" },
  },
  {
    id: "p3",
    category: "smartphones",
    brand: "Brand C",
    model: "Charlie",
    price_hint: "£900+",
    affiliate_links: {},
    warranty_text: "12 months",
    specs: { price_band: "£900+", performance_tier: "Light use", warranty_months: "12" },
  },
];

const rules = questions.map((q) => buildRuleFromQuestion(q));

function runScenario(name: string, answers: Record<string, string>) {
  const results = recommendTopProducts(products, answers, rules, {
    brandQuestionId: questionIds.brand,
    performanceQuestionId: questionIds.performance,
  });

  console.log(`\\nScenario: ${name}`);
  results.forEach((r, idx) => {
    console.log(`#${idx + 1}:`, {
      product_id: r.product_id,
      score: r.score,
      percent: r.percent,
      reasons: r.reasons,
    });
  });
}

runScenario("Budget £900+, Brand A, Heavy use", {
  [questionIds.budget]: "£900+",
  [questionIds.brand]: "Brand A",
  [questionIds.performance]: "Heavy use",
});

runScenario("Budget mid, Brand B, Light use", {
  [questionIds.budget]: "£600-£899",
  [questionIds.brand]: "Brand B",
  [questionIds.performance]: "Light use",
});

runScenario("No preference brand, heavy use focus", {
  [questionIds.budget]: "£900+",
  [questionIds.brand]: "No preference",
  [questionIds.performance]: "Heavy use",
});
