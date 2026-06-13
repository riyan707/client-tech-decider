import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { product_tags, product_use_cases } from "../lib/db/schema";
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

async function main() {
  // --- Seed product_tags ---
  const tagsPath = path.resolve("/tmp/tech-decider-tags.csv");
  const tagsRaw = fs.readFileSync(tagsPath, "utf-8");
  const tagsLines = tagsRaw.split("\n").filter((l) => l.trim().length > 0);
  const tagsData = tagsLines.slice(1);
  let tagsInserted = 0;
  
  for (const line of tagsData) {
    const cols = parseCsvLine(line);
    
    const id = cols[0]?.trim();
    const category = cols[1]?.trim();
    const key = cols[2]?.trim();
    const label = cols[3]?.trim();
    const is_active = cols[4]?.trim().toLowerCase() === "true";
    
    if (!id || !category || !key || !label) {
      console.warn(`Skipping tag row with missing fields: ${id}`);
      continue;
    }
    
    try {
      await db.insert(product_tags).values({
        id,
        category,
        key,
        label,
        is_active,
      });
      tagsInserted++;
    } catch (err: any) {
      console.error(`Failed to insert tag ${id}: ${err.message}`);
    }
  }
  
  console.log(`✅ Product tags: ${tagsInserted} rows inserted out of ${tagsData.length} CSV lines`);
  
  // --- Seed product_use_cases ---
  const ucPath = path.resolve("/tmp/tech-decider-product-tags.csv");
  const ucRaw = fs.readFileSync(ucPath, "utf-8");
  const ucLines = ucRaw.split("\n").filter((l) => l.trim().length > 0);
  const ucData = ucLines.slice(1);
  let ucInserted = 0;
  
  for (const line of ucData) {
    const cols = parseCsvLine(line);
    
    const product_id = cols[0]?.trim();
    const use_case_id = cols[1]?.trim();
    const relevance_score = parseInt(cols[2]?.trim(), 10) || 0;
    
    if (!product_id || !use_case_id) {
      console.warn(`Skipping use_case row with missing fields`);
      continue;
    }
    
    try {
      await db.insert(product_use_cases).values({
        product_id,
        use_case_id,
        relevance_score,
      });
      ucInserted++;
    } catch (err: any) {
      console.error(`Failed to insert use_case ${product_id}/${use_case_id}: ${err.message}`);
    }
  }
  
  console.log(`✅ Product use cases: ${ucInserted} rows inserted out of ${ucData.length} CSV lines`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
