export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, product_tags, product_use_cases } from "@/lib/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const useCase = searchParams.get("useCase");

  if (!category) {
    return NextResponse.json(
      { error: "Missing category" },
      { status: 400 }
    );
  }

  try {
    // If a useCase key is provided, find matching products via the tags/use_cases junction
    if (useCase) {
      const tagRows = await db
        .select({ id: product_tags.id })
        .from(product_tags)
        .where(
          and(
            eq(product_tags.key, useCase),
            eq(product_tags.category, category),
            eq(product_tags.is_active, true)
          )
        )
        .limit(1);

      const tag = tagRows[0];

      if (tag) {
        // Join products through the product_use_cases junction table
        const rows = await db
          .select({
            id: products.id,
            category: products.category,
            brand: products.brand,
            model: products.model,
            price_hint: products.price_hint,
            image_url: products.image_url,
            affiliate_links: products.affiliate_links,
            warranty_text: products.warranty_text,
            specs: products.specs,
            is_active: products.is_active,
            relevance_score: product_use_cases.relevance_score,
          })
          .from(product_use_cases)
          .innerJoin(products, eq(product_use_cases.product_id, products.id))
          .where(
            and(
              eq(product_use_cases.use_case_id, tag.id),
              eq(products.is_active, true)
            )
          )
          .orderBy(desc(product_use_cases.relevance_score), asc(products.brand))
          .limit(6);

        return NextResponse.json({ data: rows });
      }
    }

    // Fallback: just return active products for the category
    const rows = await db
      .select()
      .from(products)
      .where(and(eq(products.category, category), eq(products.is_active, true)))
      .orderBy(asc(products.brand))
      .limit(6);

    return NextResponse.json({ data: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Query failed" }, { status: 500 });
  }
}
