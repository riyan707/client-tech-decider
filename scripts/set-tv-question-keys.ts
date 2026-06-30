import * as fs from "fs";
import * as path from "path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { quiz_questions } from "../lib/db/schema";
import { eq, and } from "drizzle-orm";

// Load .env.local since dotenv isn't a project dependency
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// Maps question text to tree node ID — more specific patterns first
const KEY_RULES: { pattern: RegExp; key: string }[] = [
  { pattern: /oled|peak brightness/i,                        key: "oled_brightness" },
  { pattern: /brightness|deeper black|contrast/i,            key: "display_preference" },
  { pattern: /how bright.*room|room.*bright|lighting/i,      key: "display_preference" },
  { pattern: /vivid|punchy|accurate|colour|color/i,          key: "colour_preference" },
  { pattern: /budget|price/i,                                key: "price_band" },
  { pattern: /screen size|how big/i,                         key: "screen_size_pref" },
  { pattern: /gaming|120hz|vrr/i,                            key: "gaming" },
  { pattern: /preferred brand|brand preference|brand/i,      key: "brand_preference" },
];

function inferKey(questionText: string): string | null {
  for (const { pattern, key } of KEY_RULES) {
    if (pattern.test(questionText)) return key;
  }
  return null;
}

async function main() {
  const rows = await db
    .select({ id: quiz_questions.id, question: quiz_questions.question, key: quiz_questions.key })
    .from(quiz_questions)
    .where(and(eq(quiz_questions.category, "tvs"), eq(quiz_questions.is_active, true)));

  if (rows.length === 0) {
    console.log("No active TV questions found.");
    process.exit(0);
  }

  console.log(`Found ${rows.length} active TV questions:\n`);

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const inferredKey = inferKey(row.question);

    if (!inferredKey) {
      console.log(`  ⚠️  No match — "${row.question}"`);
      skipped++;
      continue;
    }

    if (row.key === inferredKey) {
      console.log(`  ✓  Already set (${inferredKey}) — "${row.question}"`);
      continue;
    }

    await db
      .update(quiz_questions)
      .set({ key: inferredKey })
      .where(eq(quiz_questions.id, row.id));

    console.log(`  ✅ key="${inferredKey}" → "${row.question}"`);
    updated++;
  }

  console.log(`\nDone. ${updated} updated, ${skipped} could not be matched.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
