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
  // All TV questions with options
  const questions = await db
    .select({ question: quiz_questions.question, key: quiz_questions.key, options: quiz_questions.options, weightings: quiz_questions.weightings })
    .from(quiz_questions)
    .where(and(eq(quiz_questions.category, "tvs"), eq(quiz_questions.is_active, true)));

  console.log("=== TV Questions + Options ===\n");
  for (const q of questions) {
    console.log(`[${q.key ?? "NO KEY"}] "${q.question}"`);
    console.log(`  options:    ${JSON.stringify(q.options)}`);
    console.log(`  weightings: ${JSON.stringify(q.weightings)}\n`);
  }

  // All TV products with full specs
  const tvProducts = await db
    .select({ brand: products.brand, model: products.model, specs: products.specs })
    .from(products)
    .where(and(eq(products.category, "tvs"), eq(products.is_active, true)));

  console.log(`=== All TV Products (${tvProducts.length} total) ===\n`);
  for (const p of tvProducts) {
    console.log(`${p.brand} ${p.model}`);
    console.log(`  ${JSON.stringify(p.specs)}`);
  }

  // Collect all distinct values per spec field
  const fieldValues: Record<string, Set<string>> = {};
  for (const p of tvProducts) {
    const specs = (p.specs ?? {}) as Record<string, unknown>;
    for (const [field, val] of Object.entries(specs)) {
      if (!fieldValues[field]) fieldValues[field] = new Set();
      fieldValues[field].add(String(val));
    }
  }

  console.log("\n=== Distinct values per spec field ===\n");
  for (const [field, vals] of Object.entries(fieldValues)) {
    console.log(`  ${field}: ${[...vals].join(" | ")}`);
  }

  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
