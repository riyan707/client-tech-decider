/**
 * Find the product(s) missing spec fields and print/fix them.
 * Run: npx tsx scripts/fix-missing-product.ts
 */
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
    const k = trimmed.slice(0, eqIdx).trim();
    const v = trimmed.slice(eqIdx + 1).trim();
    if (k && !(k in process.env)) process.env[k] = v;
  }
}

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const REQUIRED_FIELDS = ["display_preference", "price_band", "screen_size_fit", "gaming_fit"];

async function main() {
  const tvProducts = await db
    .select({ id: products.id, brand: products.brand, model: products.model, specs: products.specs, is_active: products.is_active })
    .from(products)
    .where(eq(products.category, "tvs"));

  const incomplete = tvProducts.filter((p) => {
    const specs = (p.specs ?? {}) as Record<string, unknown>;
    return REQUIRED_FIELDS.some((f) => specs[f] == null || specs[f] === "");
  });

  if (incomplete.length === 0) {
    console.log("All products have complete spec data. Nothing to fix.");
    process.exit(0);
  }

  console.log(`\nFound ${incomplete.length} product(s) with missing specs:\n`);
  for (const p of incomplete) {
    const specs = (p.specs ?? {}) as Record<string, unknown>;
    const missing = REQUIRED_FIELDS.filter((f) => specs[f] == null || specs[f] === "");
    console.log(`  [active=${p.is_active}] ${p.brand} ${p.model}`);
    console.log(`    id: ${p.id}`);
    console.log(`    missing: ${missing.join(", ")}`);
    console.log(`    specs: ${JSON.stringify(specs)}`);
  }

  // If any look like obviously bad data (empty/placeholder model), deactivate them
  const junkProducts = incomplete.filter(
    (p) => !p.model || p.model.trim().length < 3 || p.model.includes('","')
  );

  if (junkProducts.length > 0) {
    console.log(`\nDeactivating ${junkProducts.length} junk product(s):`);
    for (const p of junkProducts) {
      await db.update(products).set({ is_active: false }).where(eq(products.id, p.id));
      console.log(`  ✅ Deactivated: ${p.brand} "${p.model}"`);
    }
  }

  // For any remaining incomplete products that aren't junk, report them
  const remaining = incomplete.filter((p) => !junkProducts.includes(p));
  if (remaining.length > 0) {
    console.log(`\n${remaining.length} product(s) still need manual spec review (not auto-fixed).`);
  }

  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
