import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { quiz_questions } from "../lib/db/schema";
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
    try {
      return JSON.parse(value.replace(/'/g, '"'));
    } catch {
      return fallback;
    }
  }
}

async function main() {
  const csvPath = path.resolve("/tmp/tech-decider-questions.csv");
  const raw = fs.readFileSync(csvPath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  
  const dataLines = lines.slice(1);
  let inserted = 0;
  
  for (const line of dataLines) {
    const cols = parseCsvLine(line);
    
    const id = cols[0]?.trim();
    const category = cols[1]?.trim();
    const question = cols[2]?.trim();
    const type = cols[3]?.trim() || "single_select";
    const options_raw = cols[4]?.trim();
    const weightings_raw = cols[5]?.trim();
    const order = parseInt(cols[6]?.trim(), 10) || 0;
    const is_active = cols[7]?.trim().toLowerCase() === "true";
    
    if (!id || !category || !question) {
      console.warn(`Skipping row with missing required fields: ${id}`);
      continue;
    }
    
    const options = parseJsonField(options_raw, []);
    const weightings = parseJsonField(weightings_raw, {});
    
    try {
      await db.insert(quiz_questions).values({
        id,
        category,
        question,
        type,
        options,
        weightings,
        order,
        is_active,
      });
      inserted++;
    } catch (err: any) {
      console.error(`Failed to insert ${id}: ${err.message}`);
    }
  }
  
  console.log(`\n✅ Quiz questions: ${inserted} rows inserted out of ${dataLines.length} CSV lines`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
