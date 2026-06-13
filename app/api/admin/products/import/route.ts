import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Row = Record<string, any>;

function toBool(v: any, defaultVal = true) {
  if (v === undefined || v === null || v === "") return defaultVal;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  return ["true", "1", "yes", "y", "on"].includes(s);
}

function parseJsonField(value: any, fallback: any) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;

  const s0 = String(value).trim();
  if (!s0) return fallback;

  try {
    return JSON.parse(s0);
  } catch {}

  const s1 = s0.replace(/^\uFEFF/, "").replace(/'/g, '"');
  try {
    return JSON.parse(s1);
  } catch {
    throw new Error("Invalid JSON");
  }
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function cleanKey(k: string) {
  return String(k || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase();
}

function normalizeRow(r: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(r || {})) {
    out[cleanKey(k)] = typeof v === "string" ? v.trim() : v;
  }

  if (out["product_category"] && !out["category"]) out["category"] = out["product_category"];
  if (out["cat"] && !out["category"]) out["category"] = out["cat"];
  if (out["make"] && !out["brand"]) out["brand"] = out["make"];
  if (out["name"] && !out["model"]) out["model"] = out["name"];
  if (out["product"] && !out["model"]) out["model"] = out["product"];
  if (out["image"] && !out["image_url"]) out["image_url"] = out["image"];
  if (out["imageurl"] && !out["image_url"]) out["image_url"] = out["imageurl"];
  if (out["price"] && !out["price_hint"]) out["price_hint"] = out["price"];
  if (out["affiliate"] && !out["affiliate_links"]) out["affiliate_links"] = out["affiliate"];
  if (out["links"] && !out["affiliate_links"]) out["affiliate_links"] = out["links"];

  return out;
}

export async function POST(req: Request) {
  const started = Date.now();

  try {
    const body = await req.json();
    const rawRows: Row[] = Array.isArray(body?.rows) ? body.rows : [];

    if (!rawRows.length) {
      return NextResponse.json({ error: "No rows to import." }, { status: 400 });
    }

    const rows = rawRows.map(normalizeRow);

    const errors: any[] = [];
    const records: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = i + 2;

      const category = String(r.category || "").trim();
      const brand = String(r.brand || "").trim();
      const model = String(r.model || "").trim();

      if (!category || !brand || !model) {
        errors.push({
          row: rowNum,
          error: "Missing required: category, brand, model",
          got: { category: r.category ?? null, brand: r.brand ?? null, model: r.model ?? null },
        });
        continue;
      }

      const price_hint = String(r.price_hint || "").trim() || null;
      const image_url = String(r.image_url || "").trim() || null;
      const warranty_text = String(r.warranty_text || "").trim() || null;
      const is_active = toBool(r.is_active, true);

      let affiliate_links: any = {};
      let specs: any = {};

      try {
        affiliate_links = parseJsonField(r.affiliate_links, {});
      } catch {
        errors.push({ row: rowNum, error: "Invalid JSON in affiliate_links" });
        continue;
      }

      try {
        specs = parseJsonField(r.specs, {});
      } catch {
        errors.push({ row: rowNum, error: "Invalid JSON in specs" });
        continue;
      }

      records.push({
        category,
        brand,
        model,
        price_hint,
        image_url,
        warranty_text,
        affiliate_links,
        specs,
        is_active,
      });
    }

    if (!records.length) {
      return NextResponse.json(
        {
          error: "All rows failed validation.",
          upserted: 0,
          errors: errors.slice(0, 25),
          firstRowKeys: Object.keys(rows[0] || {}),
          ms: Date.now() - started,
        },
        { status: 400 }
      );
    }

    // Dedupe by (category, brand, model)
    const dedupedMap = new Map<string, any>();
    for (const rec of records) {
      const key = `${rec.category}||${rec.brand}||${rec.model}`.toLowerCase();
      dedupedMap.set(key, rec);
    }
    const dedupedRecords = Array.from(dedupedMap.values());
    const skippedDuplicates = records.length - dedupedRecords.length;

    const batches = chunk(dedupedRecords, 50);
    let upserted = 0;

    for (let b = 0; b < batches.length; b++) {
      try {
        // Use ON CONFLICT for upsert via raw SQL approach through drizzle
        for (const rec of batches[b]) {
          const existing = await db
            .select({ id: products.id })
            .from(products)
            .where(
              and(
                eq(products.category, rec.category),
                eq(products.brand, rec.brand),
                eq(products.model, rec.model)
              )
            )
            .limit(1);

          if (existing.length > 0) {
            await db
              .update(products)
              .set({
                price_hint: rec.price_hint,
                image_url: rec.image_url,
                warranty_text: rec.warranty_text,
                affiliate_links: rec.affiliate_links,
                specs: rec.specs,
                is_active: rec.is_active,
              })
              .where(eq(products.id, existing[0].id));
          } else {
            await db.insert(products).values(rec);
          }
          upserted++;
        }
      } catch (batchErr: any) {
        return NextResponse.json(
          {
            error: `Batch ${b + 1} failed: ${batchErr?.message}`,
            upserted,
            skipped_duplicates: skippedDuplicates,
            errors: errors.slice(0, 25),
            ms: Date.now() - started,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      upserted,
      skipped_duplicates: skippedDuplicates,
      errors,
      ms: Date.now() - started,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Import failed.", upserted: 0, skipped_duplicates: 0, errors: [], ms: Date.now() - started },
      { status: 500 }
    );
  }
}
