// lib/recommendation.ts

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

const NO_PREFERENCE_VALUES = new Set([
  "no preference",
  "no_preference",
  "none",
  "", // empty string
]);

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

function normalizeMatches(a: unknown, b: unknown): boolean {
  return normalizeString(a) === normalizeString(b);
}

function defaultReasonFromQuestion(question: string): string {
  const lower = question.toLowerCase();

  if (lower.includes("budget") || lower.includes("price") || lower.includes("cost")) {
    return "Fits your budget range.";
  }
  if (lower.includes("camera")) {
    return "Matches your camera priority.";
  }
  if (lower.includes("battery")) {
    return "Matches your battery priority.";
  }
  if (lower.includes("performance") || lower.includes("speed") || lower.includes("gaming")) {
    return "Matches your performance needs.";
  }
  if (lower.includes("screen") || lower.includes("size") || lower.includes("display")) {
    return "Matches your preferred screen size.";
  }
  if (lower.includes("brand")) {
    return "Matches your brand preference.";
  }
  if (lower.includes("warranty")) {
    return "Matches your warranty preference.";
  }

  return "Matches your preference.";
}

function buildLegacyReason(questionText: string, _option: string): string {
  // Keep it simple and deterministic: reason based on question text.
  return defaultReasonFromQuestion(questionText);
}

/**
 * quiz_questions.options is often stored as a JSON string in Supabase.
 * This makes sure we always end up with a string[].
 */
function safeOptionsArray(options: unknown): string[] {
  if (Array.isArray(options)) return options.map(String);

  if (typeof options === "string") {
    try {
      const parsed = JSON.parse(options);
      if (Array.isArray(parsed)) return parsed.map(String);
      // If it's a plain string (not JSON array), treat as single option
      if (options.trim().length) return [options];
    } catch {
      if (options.trim().length) return [options];
    }
  }

  return [];
}

function evaluateFieldEqualsRule(
  product: RecoProduct,
  rule: FieldEqualsRule,
  answer: string,
  questionText: string
) {
  const weight = rule.weight ?? 1;
  const points = rule.pointsByOption?.[answer] ?? 0;

  if (isNoPreference(answer)) {
    return { score: 0, maxPoints: 0, reason: null as string | null };
  }

  const maxPoints = points * weight;

  // Look in product.specs first, then fall back to top-level product fields
  const productRecord = product as unknown as Record<string, unknown>;
  const productValue = product.specs?.[rule.field] ?? productRecord[rule.field];

  const matches = normalizeMatches(productValue, answer);
  const score = matches ? maxPoints : 0;

  // reasonsByOption can be stored as string OR string[]
  const reasonSource = (rule.reasonsByOption as any)?.[answer];
  const reason =
    matches && maxPoints > 0
      ? (Array.isArray(reasonSource) ? reasonSource[0] : reasonSource) ??
        buildLegacyReason(questionText, answer)
      : null;

  return { score, maxPoints, reason };
}

export function recommendTopProducts(
  products: RecoProduct[],
  answers: Record<string, string>,
  rules: WeightedQuestionRule[],
  config: RecommendConfig = {}
): Recommendation[] {
  const answeredRules = rules.filter((r) => !isNoPreference(answers[r.questionId]));

  // Compute max possible score for this submission (skip no preference)
  const totalMaxScore = answeredRules.reduce((sum, r) => {
    const answer = answers[r.questionId];
    if (!answer || isNoPreference(answer)) return sum;

    if (r.rule.type !== "field_equals") return sum;

    const rule = r.rule as FieldEqualsRule;
    const weight = rule.weight ?? 1;
    const points = rule.pointsByOption?.[answer] ?? 0;
    return sum + weight * points;
  }, 0);

  const scored = products.map((product) => {
    let score = 0;
    const reasons: string[] = [];

    for (const entry of answeredRules) {
      const answer = answers[entry.questionId];
      if (!answer || isNoPreference(answer)) continue;

      if (entry.rule.type === "field_equals") {
        const result = evaluateFieldEqualsRule(product, entry.rule as FieldEqualsRule, answer, entry.questionText);
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
      if (a.tieBreak[i] !== b.tieBreak[i]) return b.tieBreak[i] - a.tieBreak[i];
    }

    // final stable tiebreaker (deterministic)
    return String(a.product.id).localeCompare(String(b.product.id));
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
        // Best effort: if your question answers are like "12 months" this works.
        // If answers are "Very important" then warranty shouldn't be a tie-breaker anyway.
        const warrantyMonths = (product.specs as any)?.warranty_months ?? product.warranty_text;
        return normalizeMatches(warrantyMonths, answer) ? 1 : 0;
      }

      case "performance": {
        // If your performance question options are strings like "Heavy use (gaming, multitasking)"
        // you probably want to store a matching string in specs.performance_tier or specs.performance_label.
        const perf = (product.specs as any)?.performance_tier ?? (product.specs as any)?.performance;
        return normalizeMatches(perf, answer) ? 1 : 0;
      }

      default:
        return 0;
    }
  });
}

/**
 * Converts quiz_questions rows into a WeightedQuestionRule.
 * Supports:
 * - Modern WeightingRule format (already has type + field)
 * - Legacy format: {"price_band": 0.25}
 */
export function buildRuleFromQuestion(question: QuizQuestion): WeightedQuestionRule {
  const weightings = (question.weightings ?? {}) as LegacyWeightings | WeightingRule;

  // Modern rule stored in DB
  if (isModernRule(weightings)) {
    return { questionId: question.id, questionText: question.question, rule: weightings };
  }

  // Legacy: {"some_field": 0.25}
  const legacy = weightings as LegacyWeightings;
  const [field, legacyWeightRaw] = Object.entries(legacy)[0] ?? ["", 0];
  const legacyWeight = Number(legacyWeightRaw || 0);

  const options = safeOptionsArray(question.options);

  const pointsByOption: Record<string, number> = {};
  const reasonsByOption: Record<string, string> = {};

  for (const opt of options) {
    if (isNoPreference(opt)) {
      pointsByOption[opt] = 0;
      continue;
    }

    // Example: 0.25 -> 25 points, deterministic
    const points = Math.round(100 * legacyWeight);
    pointsByOption[opt] = points;

    reasonsByOption[opt] = buildLegacyReason(question.question, opt);
  }

  const rule: FieldEqualsRule = {
    type: "field_equals",
    field,
    weight: 1,
    pointsByOption,
    reasonsByOption,
  };

  return { questionId: question.id, questionText: question.question, rule };
}

function isModernRule(weightings: LegacyWeightings | WeightingRule): weightings is WeightingRule {
  const candidate = weightings as { type?: unknown; field?: unknown };
  return typeof candidate.type === "string" && typeof candidate.field === "string";
}
