import * as fs from "fs";
import * as path from "path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { quiz_questions, products } from "../lib/db/schema";
import { eq, and } from "drizzle-orm";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// ─── Price band normalisation ─────────────────────────────────────────────────
const PRICE_BAND_MAP: Record<string, string> = {
  "£0–£500":        "under_500",
  "£500–£1,000":    "500_1000",
  "£1,000–£2,000":  "1000_2000",
  "£2,000+":        "2000_plus",
};

// ─── Modern field_equals rules for each keyed question ───────────────────────
const QUESTION_RULES: Record<string, object> = {
  price_band: {
    type: "field_equals",
    field: "price_band",
    weight: 1,
    pointsByOption: {
      under_500:   25,
      "500_1000":  25,
      "1000_2000": 25,
      "2000_plus": 25,
    },
    reasonsByOption: {
      under_500:   "Fits your under £500 budget.",
      "500_1000":  "Fits your £500–£1,000 budget.",
      "1000_2000": "Fits your £1,000–£2,000 budget.",
      "2000_plus": "Fits your £2,000+ budget.",
    },
  },
  screen_size_pref: {
    type: "field_equals",
    field: "screen_size_fit",
    weight: 1,
    pointsByOption: { small: 15, medium: 15, large: 15 },
    reasonsByOption: {
      small:  "Compact size — under 50\".",
      medium: "Mid-size — 50\"–65\".",
      large:  "Large screen — 65\" and above.",
    },
  },
  gaming: {
    type: "field_equals",
    field: "gaming_fit",
    weight: 1,
    pointsByOption: { serious: 15, occasional: 15, no: 15 },
    reasonsByOption: {
      serious:    "Gaming-optimised with 120Hz and VRR support.",
      occasional: "Solid gaming performance for casual play.",
      no:         "Focused on picture quality over gaming features.",
    },
  },
  display_preference: {
    type: "field_equals",
    field: "display_preference",
    weight: 1,
    pointsByOption: { brightness: 15, contrast: 15 },
    reasonsByOption: {
      brightness: "Performs well in bright and well-lit rooms.",
      contrast:   "Deep blacks and vivid contrast for dark-room viewing.",
    },
  },
  // brand_preference: handled by the brand boost in recommendation.ts — skip here
};

function isOled(model: string): boolean {
  return /oled/i.test(model);
}

function normalisePriceBand(current: string): string | null {
  return PRICE_BAND_MAP[current] ?? null;
}

function normaliseScreenSize(current: string): string | null {
  if (current === "standard") return "medium";
  if (current === "large")    return "large";
  if (current === "small")    return "small";
  return null;
}

function inferGamingFit(perfFit: string): string {
  if (perfFit === "high") return "serious";
  if (perfFit === "mid")  return "occasional";
  return "no"; // entry
}

async function main() {
  console.log("=== Step 1: Updating product specs ===\n");

  const tvProducts = await db
    .select({ id: products.id, brand: products.brand, model: products.model, specs: products.specs })
    .from(products)
    .where(and(eq(products.category, "tvs"), eq(products.is_active, true)));

  let prodUpdated = 0;

  for (const p of tvProducts) {
    const specs = { ...((p.specs ?? {}) as Record<string, unknown>) };
    const changes: string[] = [];

    // 1. Normalise price_band
    const rawPrice = specs.price_band as string | undefined;
    if (rawPrice) {
      const normalised = normalisePriceBand(rawPrice);
      if (normalised && normalised !== rawPrice) {
        specs.price_band = normalised;
        changes.push(`price_band: "${rawPrice}" → "${normalised}"`);
      }
    }

    // 2. Normalise screen_size_fit
    const rawSize = specs.screen_size_fit as string | undefined;
    if (rawSize) {
      const normalised = normaliseScreenSize(rawSize);
      if (normalised && normalised !== rawSize) {
        specs.screen_size_fit = normalised;
        changes.push(`screen_size_fit: "${rawSize}" → "${normalised}"`);
      }
    }

    // 3. Add gaming_fit from performance_fit
    const perfFit = specs.performance_fit as string | undefined;
    if (perfFit && !specs.gaming_fit) {
      const gaming = inferGamingFit(perfFit);
      specs.gaming_fit = gaming;
      changes.push(`gaming_fit: added "${gaming}" (from performance_fit "${perfFit}")`);
    }

    // 4. Add display_preference from product name
    if (!specs.display_preference) {
      const dp = isOled(p.model) ? "contrast" : "brightness";
      specs.display_preference = dp;
      changes.push(`display_preference: added "${dp}"`);
    }

    if (changes.length === 0) {
      console.log(`  ✓  ${p.brand} ${p.model} — no changes needed`);
      continue;
    }

    await db.update(products).set({ specs }).where(eq(products.id, p.id));
    console.log(`  ✅ ${p.brand} ${p.model}`);
    for (const c of changes) console.log(`       ${c}`);
    prodUpdated++;
  }

  console.log(`\nProducts: ${prodUpdated} updated\n`);

  // ─── Step 2: Upgrade question weightings ────────────────────────────────────
  console.log("=== Step 2: Upgrading question weightings ===\n");

  const questions = await db
    .select({ id: quiz_questions.id, question: quiz_questions.question, key: quiz_questions.key, weightings: quiz_questions.weightings })
    .from(quiz_questions)
    .where(and(eq(quiz_questions.category, "tvs"), eq(quiz_questions.is_active, true)));

  let qUpdated = 0;

  for (const q of questions) {
    const key = q.key as string | null;
    if (!key || !QUESTION_RULES[key]) {
      console.log(`  —  Skipping [${key ?? "NO KEY"}] "${q.question}"`);
      continue;
    }

    const rule = QUESTION_RULES[key];
    const existing = q.weightings as any;
    if (existing?.type === "field_equals") {
      console.log(`  ✓  Already modern [${key}]`);
      continue;
    }

    await db.update(quiz_questions).set({ weightings: rule }).where(eq(quiz_questions.id, q.id));
    console.log(`  ✅ Upgraded [${key}] "${q.question}"`);
    qUpdated++;
  }

  console.log(`\nQuestions: ${qUpdated} upgraded\n`);
  console.log("Migration complete.");
  process.exit(0);
}

main().catch((err) => { console.error("Migration failed:", err); process.exit(1); });
