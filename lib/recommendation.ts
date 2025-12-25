import type {
  FieldEqualsRule,
  LegacyWeightings,
  QuizQuestion,
  RecommendConfig,
  RecoProduct,
  Recommendation,
  WeightingRule,
} from "./types";

export type WeightedQuestionRule = {
  questionId: string;
  questionText: string;
  rule: WeightingRule;
};

const NO_PREFERENCE_VALUES = new Set(["no preference", "no_preference", ""]);

export function isNoPreference(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) return true;
  return NO_PREFERENCE_VALUES.has(normalized);
}

export function normalizeString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase();
}

function defaultReasonFromQuestion(question: string): string {
  const lower = question.toLowerCase();
  if (lower.includes("budget") || lower.includes("price")) {
    return "Fits your budget range.";
  }
  if (lower.includes("camera")) {
    return "Matches your camera priority.";
  }
  if (lower.includes("battery")) {
    return "Matches your battery priority.";
  }
  if (lower.includes("performance") || lower.includes("speed")) {
    return "Matches your performance needs.";
  }
  if (lower.includes("screen")) {
    return "Matches your preferred screen size.";
  }
  return "Matches your preference.";
}

function buildLegacyReason(question: string, option: string): string {
  const specific = defaultReasonFromQuestion(question);
  return specific || `Matches your ${option} preference.`;
}

function normalizeMatches(a: unknown, b: unknown): boolean {
  return normalizeString(a) === normalizeString(b);
}

function evaluateFieldEqualsRule(
  product: RecoProduct,
  rule: FieldEqualsRule,
  answer: string,
  questionText: string
) {
  const weight = rule.weight ?? 1;
  const points = rule.pointsByOption?.[answer] ?? 0;
  const maxPoints = points * weight;
  if (isNoPreference(answer)) {
    return { score: 0, maxPoints: 0, reason: null as string | null };
  }

  const productRecord = product as unknown as Record<string, unknown>;
  const productValue = product.specs?.[rule.field] ?? productRecord[rule.field];
  const matches = normalizeMatches(productValue, answer);
  const score = matches ? maxPoints : 0;
  const reasonSource = rule.reasonsByOption?.[answer];
  const reason = matches && maxPoints > 0 ? reasonSource ?? buildLegacyReason(questionText, answer) : null;
  return { score, maxPoints, reason };
}

export function recommendTopProducts(
  products: RecoProduct[],
  answers: Record<string, string>,
  rules: WeightedQuestionRule[],
  config: RecommendConfig = {}
): Recommendation[] {
  const answeredRules = rules.filter((r) => !isNoPreference(answers[r.questionId]));

  const totalMaxScore = answeredRules.reduce((sum, r) => {
    const answer = answers[r.questionId];
    if (!answer || isNoPreference(answer)) return sum;
    const weight = (r.rule as FieldEqualsRule).weight ?? 1;
    const points = (r.rule as FieldEqualsRule).pointsByOption?.[answer] ?? 0;
    return sum + weight * points;
  }, 0);

  const scored = products.map((product) => {
    let score = 0;
    const reasons: string[] = [];

    for (const entry of answeredRules) {
      const answer = answers[entry.questionId];
      if (entry.rule.type === "field_equals") {
        const result = evaluateFieldEqualsRule(product, entry.rule, answer, entry.questionText);
        score += result.score;
        if (result.reason) reasons.push(result.reason);
      }
    }

    const percent = totalMaxScore > 0 ? Math.round((score / totalMaxScore) * 100) : 0;
    const tieBreak = computeTieBreakScore(product, answers, config);
    return { product, score, percent, reasons, tieBreak };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // tie-breaker priority: brand > warranty > performance
    for (let i = 0; i < a.tieBreak.length; i++) {
      if (a.tieBreak[i] !== b.tieBreak[i]) {
        return b.tieBreak[i] - a.tieBreak[i];
      }
    }
    return 0;
  });

  return scored.slice(0, 3).map(({ product, score, percent, reasons }) => ({
    product_id: product.id,
    brand: product.brand,
    model: product.model,
    price_hint: product.price_hint,
    affiliate_links: product.affiliate_links ?? {},
    warranty_text: product.warranty_text,
    specs: product.specs,
    score,
    percent,
    reasons: reasons.length > 0 ? reasons : ["Matched your preferences."],
  }));
}

function computeTieBreakScore(
  product: RecoProduct,
  answers: Record<string, string>,
  config: RecommendConfig
): number[] {
  const tieFields: Array<{ questionId?: string; kind: "brand" | "warranty" | "performance" }> = [
    { questionId: config.brandQuestionId, kind: "brand" },
    { questionId: config.warrantyQuestionId, kind: "warranty" },
    { questionId: config.performanceQuestionId, kind: "performance" },
  ];

  return tieFields.map(({ questionId, kind }) => {
    if (!questionId) return 0;
    const answer = answers[questionId];
    if (!answer || isNoPreference(answer)) return 0;

    switch (kind) {
      case "brand":
        return normalizeMatches(product.brand, answer) ? 1 : 0;
      case "warranty": {
        const warrantyMonths = product.specs?.warranty_months ?? product.warranty_text;
        return normalizeMatches(warrantyMonths, answer) ? 1 : 0;
      }
      case "performance": {
        const perf = product.specs?.performance_tier ?? product.specs?.performance;
        return normalizeMatches(perf, answer) ? 1 : 0;
      }
      default:
        return 0;
    }
  });
}

export function buildRuleFromQuestion(question: QuizQuestion): WeightedQuestionRule {
  const weightings = (question.weightings ?? {}) as LegacyWeightings | WeightingRule;
  if (isModernRule(weightings)) {
    return { questionId: question.id, questionText: question.question, rule: weightings };
  }

  const legacy = weightings as LegacyWeightings;
  const [field, legacyWeight] = Object.entries(legacy)[0] ?? ["", 0];
  const weight = 1;
  const pointsByOption: Record<string, number> = {};
  const reasonsByOption: Record<string, string> = {};

  (question.options ?? []).forEach((opt) => {
    if (isNoPreference(opt)) {
      pointsByOption[opt] = 0;
    } else {
      const points = Math.round(100 * legacyWeight);
      pointsByOption[opt] = points;
      reasonsByOption[opt] = buildLegacyReason(question.question, opt);
    }
  });

  const rule: FieldEqualsRule = {
    type: "field_equals",
    field,
    weight,
    pointsByOption,
    reasonsByOption,
  };

  return { questionId: question.id, questionText: question.question, rule };
}

function isModernRule(weightings: LegacyWeightings | WeightingRule): weightings is WeightingRule {
  const candidate = weightings as { type?: unknown; field?: unknown };
  return typeof candidate.type === "string" && typeof candidate.field === "string";
}
