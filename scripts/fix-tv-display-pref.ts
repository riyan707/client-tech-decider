import * as fs from "fs";
import * as path from "path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { products } from "../lib/db/schema";
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

// Corrections needed after the migration:
//   - MicroLED name contains "oLED" as a substring → was wrongly marked "contrast"
//   - Some OLED products don't say "OLED" in their stored model name → wrongly marked "brightness"
const OVERRIDES: { modelFragment: string; correct: "brightness" | "contrast" }[] = [
  { modelFragment: "163MX",    correct: "brightness" }, // Hisense MicroLED — NOT OLED
  { modelFragment: "Z90B",     correct: "contrast"   }, // Panasonic Z90B — is OLED
  { modelFragment: "Bravia 8 (2025)", correct: "contrast" }, // Sony Bravia 8 2025 — QD-OLED
];

async function main() {
  const tvProducts = await db
    .select({ id: products.id, brand: products.brand, model: products.model, specs: products.specs })
    .from(products)
    .where(and(eq(products.category, "tvs"), eq(products.is_active, true)));

  for (const override of OVERRIDES) {
    const match = tvProducts.find((p) => p.model.includes(override.modelFragment));
    if (!match) {
      console.log(`  ⚠️  No product found matching "${override.modelFragment}"`);
      continue;
    }

    const specs = { ...((match.specs ?? {}) as Record<string, unknown>) };
    const current = specs.display_preference;

    if (current === override.correct) {
      console.log(`  ✓  Already correct (${override.correct}) — ${match.brand} ${match.model}`);
      continue;
    }

    specs.display_preference = override.correct;
    await db.update(products).set({ specs }).where(eq(products.id, match.id));
    console.log(`  ✅ Fixed ${match.brand} ${match.model}: "${current}" → "${override.correct}"`);
  }

  console.log("\nDone.");
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
