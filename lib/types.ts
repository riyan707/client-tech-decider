export type QuizCategory = "smartphones" | "tvs";

export type QuizQuestion = {
  id: string;
  category: QuizCategory;
  question: string;
  type: "single_select";
  options: string[];         // jsonb in DB
  weightings: Record<string, number>; // jsonb in DB
  order: number;
};

export type Product = {
  id: string;
  category: QuizCategory;
  brand: string;
  model: string;
  price_hint: string | null;
  affiliate_links: Record<string, string>;
  warranty_text: string | null;
  specs: Record<string, any>;
};

export type Submission = {
  id: string;
  email: string | null;
  first_name: string | null;
  category: QuizCategory;
  answers: Record<string, any>;
  top_3: any[]; // jsonb in DB
  score_percent: number | null;
  utm: Record<string, any> | null;
  created_at: string;
};
