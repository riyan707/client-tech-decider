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

async function main() {
  // Check question weightings
  const questions = await db
    .select({ question: quiz_questions.question, key: quiz_questions.key, weightings: quiz_questions.weightings })
    .from(quiz_questions)
    .where(and(eq(quiz_questions.category, "tvs"), eq(quiz_questions.is_active, true)));

  console.log("=== TV Question Weightings ===\n");
  for (const q of questions) {
    const w = q.weightings as any;
    const hasModernRule = typeof w?.type === "string" && typeof w?.field === "string";
    const hasLegacy = typeof w === "object" && w !== null && Object.keys(w).length > 0;
    const status = hasModernRule ? "✅ modern rule" : hasLegacy ? "⚠️  legacy format" : "❌ empty/no weightings";
    console.log(`[${q.key ?? "NO KEY"}] ${status}`);
    console.log(`  Question: "${q.question}"`);
    console.log(`  Weightings: ${JSON.stringify(w)}\n`);
  }

  // Check a sample product's specs
  const tvProducts = await db
    .select({ brand: products.brand, model: products.model, specs: products.specs })
    .from(products)
    .where(and(eq(products.category, "tvs"), eq(products.is_active, true)))
    .limit(3);

  console.log("=== Sample TV Product Specs ===\n");
  for (const p of tvProducts) {
    console.log(`${p.brand} ${p.model}`);
    console.log(`  specs: ${JSON.stringify(p.specs)}\n`);
  }

  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
