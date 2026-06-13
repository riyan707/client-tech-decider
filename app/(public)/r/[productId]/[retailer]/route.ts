export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { db } from "@/lib/db";
import { products, affiliate_clicks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ productId: string; retailer: string }> }
) {
  const { productId, retailer } = await params;

  const rows = await db
    .select({
      id: products.id,
      category: products.category,
      affiliate_links: products.affiliate_links,
    })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  const product = rows[0];

  if (!product) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const links = (product.affiliate_links as Record<string, unknown>) || {};
  const url = typeof links === 'object' && !Array.isArray(links) ? links[retailer] : null;

  if (!url || typeof url !== 'string') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  try {
    await db.insert(affiliate_clicks).values({
      product_id: product.id,
      retailer,
    });
  } catch {
    // Silently ignore
  }

  return NextResponse.redirect(url, { status: 302 });
}
