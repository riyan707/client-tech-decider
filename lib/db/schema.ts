import { pgTable, text, boolean, integer, jsonb, timestamp, uuid, real, primaryKey } from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: text("category").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  price_hint: text("price_hint"),
  image_url: text("image_url"),
  affiliate_links: jsonb("affiliate_links").notNull().default({}),
  warranty_text: text("warranty_text"),
  specs: jsonb("specs").notNull().default({}),
  is_active: boolean("is_active").notNull().default(true),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const quiz_questions = pgTable("quiz_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: text("category").notNull(),
  question: text("question").notNull(),
  type: text("type").notNull().default("single_select"),
  options: jsonb("options").notNull().default([]),
  weightings: jsonb("weightings").notNull().default({}),
  order: integer("order").notNull().default(0),
  key: text("key"),
  is_active: boolean("is_active").notNull().default(true),
});

export const quiz_submissions = pgTable("quiz_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email"),
  first_name: text("first_name"),
  category: text("category").notNull(),
  answers: jsonb("answers").notNull().default({}),
  top_3: jsonb("top_3").notNull().default([]),
  score_percent: real("score_percent"),
  utm: jsonb("utm"),
  quality_notes: jsonb("quality_notes"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const affiliate_clicks = pgTable("affiliate_clicks", {
  id: uuid("id").primaryKey().defaultRandom(),
  product_id: uuid("product_id").notNull(),
  retailer: text("retailer").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const product_tags = pgTable("product_tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: text("category").notNull(),
  key: text("key").notNull(),
  label: text("label").notNull(),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const product_use_cases = pgTable("product_use_cases", {
  product_id: uuid("product_id").notNull().references(() => products.id),
  use_case_id: uuid("use_case_id").notNull().references(() => product_tags.id),
  relevance_score: integer("relevance_score").notNull().default(0),
  created_at: timestamp("created_at").notNull().defaultNow(),
});
