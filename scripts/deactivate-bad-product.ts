import * as fs from "fs";
import * as path from "path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { products } from "../lib/db/schema";
import { eq } from "drizzle-orm";

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

// Malformed product entry: brand=LG, model="48","", missing price_band/screen_size_fit/gaming_fit
// Deactivating rather than deleting so it can be audited or corrected later
const BAD_ID = "8e6ed8bc-37cf-410d-b548-1c4140e8a944";

async function main() {
  const [row] = await db.select({ brand: products.brand, model: products.model }).from(products).where(eq(products.id, BAD_ID));
  if (!row) { console.log("Product not found — already removed?"); process.exit(0); }
  console.log(`Deactivating: ${row.brand} "${row.model}" (${BAD_ID})`);
  await db.update(products).set({ is_active: false }).where(eq(products.id, BAD_ID));
  console.log("Done.");
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
