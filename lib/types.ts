export type QuizCategory = "smartphones" | "tvs";

export type QuizQuestion = {
  id: string;
  category: QuizCategory;
  question: string;
  type: "single_select";
  options: string[]; // jsonb in DB
  weightings: LegacyWeightings | WeightingRule; // jsonb in DB
  order: number;
  key?: string | null;
};

export type LegacyWeightings = Record<string, number>;

export type FieldEqualsRule = {
  type: "field_equals";
  field: string;
  weight?: number;
  pointsByOption: Record<string, number>;
  reasonsByOption?: Record<string, string>;
};

export type WeightingRule = FieldEqualsRule;

export type Product = {
  id: string;
  category: QuizCategory;
  brand: string;
  model: string;
  price_hint: string | null;
  affiliate_links: Record<string, string>;
  warranty_text: string | null;
  specs: Record<string, unknown>;
};

export type Submission = {
  id: string;
  email: string | null;
  first_name: string | null;
  category: QuizCategory;
  answers: Record<string, unknown>;
  top_3: Recommendation[]; // jsonb in DB
  score_percent: number | null;
  utm: Record<string, unknown> | null;
  created_at: string;
};

export type RecoProduct = Product & {
  specs: Record<string, unknown>;
};

export type Recommendation = {
  product_id: string;
  brand: string;
  model: string;
  price_hint: string | null;
  affiliate_links: Record<string, string>;
  warranty_text: string | null;
  specs?: Record<string, unknown>;
  score: number;
  percent: number;
  reasons: string[];
};

export type RecommendConfig = {
  brandQuestionId?: string;
  warrantyQuestionId?: string;
  performanceQuestionId?: string;
  questionFieldMap?: Record<string, string>;
};
