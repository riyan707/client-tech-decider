/**
 * Simulates the TV quiz submit flow locally against the real DB.
 * Run: npx tsx scripts/test-tv-scoring.ts
 */
import * as fs from "fs";
import * as path from "path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { quiz_questions, products } from "../lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { buildRuleFromQuestion, recommendTopProducts } from "../lib/recommendation";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const k = trimmed.slice(0, eqIdx).trim();
    const v = trimmed.slice(eqIdx + 1).trim();
    if (k && !(k in process.env)) process.env[k] = v;
  }
}

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const TEST_CASES: Array<{ label: string; answers: Record<string, string> }> = [
  {
    label: "Samsung QLED mid-budget large-screen no gaming",
    answers: {
      display_preference: "brightness",
      colour_preference: "vivid",
      price_band: "500_1000",
      screen_size_pref: "large",
      gaming: "no",
      brand_preference: "samsung",
    },
  },
  {
    label: "Sony OLED dark room £1000-£2000",
    answers: {
      display_preference: "contrast",
      oled_brightness: "midrange",
      price_band: "1000_2000",
      screen_size_pref: "medium",
      gaming: "occasional",
      brand_preference: "sony",
    },
  },
  {
    label: "Budget TV no preference",
    answers: {
      display_preference: "no_preference",
      price_band: "under_500",
      screen_size_pref: "medium",
      gaming: "no",
      brand_preference: "no_preference",
    },
  },
];

async function main() {
  const questionRows = await db
    .select({
      id: quiz_questions.id,
      category: quiz_questions.category,
      question: quiz_questions.question,
      type: quiz_questions.type,
      options: quiz_questions.options,
      weightings: quiz_questions.weightings,
      order: quiz_questions.order,
      key: quiz_questions.key,
    })
    .from(quiz_questions)
    .where(and(eq(quiz_questions.category, "tvs"), eq(quiz_questions.is_active, true)))
    .orderBy(asc(quiz_questions.order));

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
    .where(and(eq(products.category, "tvs"), eq(products.is_active, true)))
    .orderBy(asc(products.brand), asc(products.model));

  console.log(`\n=== DB state ===`);
  console.log(`Questions: ${questionRows.length}`);
  for (const q of questionRows) {
    const w = q.weightings as any;
    const hasModern = w?.type === "field_equals";
    console.log(`  [key=${q.key ?? "MISSING"}] ${hasModern ? "✓ modern" : "✗ LEGACY"} — "${q.question}"`);
  }

  console.log(`\nProducts: ${productRows.length}`);
  const specCoverage: Record<string, { set: number; missing: number }> = {};
  const SPEC_FIELDS = ["display_preference", "price_band", "screen_size_fit", "gaming_fit"];
  for (const p of productRows) {
    const specs = (p.specs ?? {}) as Record<string, unknown>;
    for (const f of SPEC_FIELDS) {
      if (!specCoverage[f]) specCoverage[f] = { set: 0, missing: 0 };
      if (specs[f] != null && specs[f] !== "") specCoverage[f].set++;
      else specCoverage[f].missing++;
    }
  }
  for (const [f, c] of Object.entries(specCoverage)) {
    const icon = c.missing === 0 ? "✓" : "✗";
    console.log(`  ${icon} spec[${f}]: ${c.set} set, ${c.missing} missing`);
  }

  const rules = questionRows.map((q) => buildRuleFromQuestion(q as any));

  console.log(`\n=== Question rules ===`);
  for (const r of rules) {
    console.log(`  questionId="${r.questionId}"  field="${(r.rule as any).field}"  points=${JSON.stringify((r.rule as any).pointsByOption)}`);
  }

  for (const tc of TEST_CASES) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`TEST: ${tc.label}`);
    console.log(`Answers: ${JSON.stringify(tc.answers)}`);

    const config = {
      brandQuestionId: tc.answers.brand_preference !== undefined ? "brand_preference" : undefined,
    };

    const results = recommendTopProducts(productRows as any, tc.answers, rules, config as any);
    console.log(`\nTop 3 recommendations:`);
    results.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.brand} ${r.model} — score=${r.score} percent=${r.percent}%`);
      console.log(`     reasons: ${r.reasons.join("; ")}`);
    });
  }

  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
