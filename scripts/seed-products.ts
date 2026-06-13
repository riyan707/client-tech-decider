import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { products } from "../lib/db/schema";
import { eq, and } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

function parseJsonField(value: string, fallback: any): any {
  if (!value || value.trim() === "") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    // Try single-quote replacement
    try {
      return JSON.parse(value.replace(/'/g, '"'));
    } catch {
      return fallback;
    }
  }
}

function cleanModel(model: string): string {
  // Fix the malformed "48" entry
  if (model === '"48"') return '48"';
  return model;
}

async function main() {
  const csvPath = path.resolve("/tmp/tech-decider-products.csv");
  const raw = fs.readFileSync(csvPath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  
  // Skip header
  const dataLines = lines.slice(1);
  let inserted = 0;
  
  for (const line of dataLines) {
    const cols = parseCsvLine(line);
    
    const id = cols[0]?.trim();
    const category = cols[1]?.trim();
    const brand = cols[2]?.trim();
    let model = cols[3]?.trim();
    const price_hint = cols[4]?.trim() || null;
    const affiliate_links_raw = cols[5]?.trim();
    const warranty_text = cols[6]?.trim() || null;
    const specs_raw = cols[7]?.trim();
    const is_active = cols[8]?.trim().toLowerCase() === "true";
    const created_at = cols[9]?.trim();
    const updated_at = cols[10]?.trim();
    const image_url = cols[11]?.trim() || null;
    
    model = cleanModel(model);
    
    if (!id || !category || !brand || !model) {
      console.warn(`Skipping row with missing required fields: ${id}`);
      continue;
    }
    
    const affiliate_links = parseJsonField(affiliate_links_raw, {});
    const specs = parseJsonField(specs_raw, {});
    
    try {
      await db.insert(products).values({
        id,
        category,
        brand,
        model,
        price_hint,
        image_url,
        affiliate_links,
        warranty_text,
        specs,
        is_active,
      });
      inserted++;
    } catch (err: any) {
      console.error(`Failed to insert ${id} (${brand} ${model}): ${err.message}`);
    }
  }
  
  console.log(`\n✅ Products: ${inserted} rows inserted out of ${dataLines.length} CSV lines`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
