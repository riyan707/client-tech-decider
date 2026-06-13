export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, and, or, ilike, asc, desc, sql } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductCard, type ProductCardData } from "@/components/product/ProductCard";

type Category = "smartphones" | "tvs" | "all";

type SearchParams = {
  category?: Category;
  q?: string;
  brand?: string;
};

function buildQueryString(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v && v.trim().length) sp.set(k, v);
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const category: Category = sp.category ?? "all";
  const q = (sp.q ?? "").trim();
  const brand = (sp.brand ?? "").trim();

  // Sidebar brands
  const brandConditions = [eq(products.is_active, true)];
  if (category !== "all") {
    brandConditions.push(eq(products.category, category));
  }

  const brandRows = await db
    .selectDistinct({ brand: products.brand })
    .from(products)
    .where(and(...brandConditions));

  const brands = Array.from(
    new Set(brandRows.map((r) => (r.brand ?? "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  // Products query
  const conditions = [eq(products.is_active, true)];
  if (category !== "all") conditions.push(eq(products.category, category));
  if (brand) conditions.push(eq(products.brand, brand));
  if (q) {
    conditions.push(
      or(
        ilike(products.brand, `%${q}%`),
        ilike(products.model, `%${q}%`)
      )!
    );
  }

  const productRows = await db
    .select({
      id: products.id,
      category: products.category,
      brand: products.brand,
      model: products.model,
      price_hint: products.price_hint,
      image_url: products.image_url,
      affiliate_links: products.affiliate_links,
    })
    .from(products)
    .where(and(...conditions))
    .orderBy(desc(products.updated_at));

  const activeFiltersCount = (category !== "all" ? 1 : 0) + (brand ? 1 : 0) + (q ? 1 : 0);

  const cardProducts: ProductCardData[] = productRows.map((p) => ({
    id: p.id,
    category: p.category as "tvs" | "smartphones",
    brand: p.brand,
    model: p.model,
    price_hint: p.price_hint,
    image_url: p.image_url,
    affiliate_links: p.affiliate_links as Record<string, string> | null,
  }));

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-6 pt-16 pb-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Catalogue</h1>
          <p className="text-sm text-muted-foreground">
            Browse active products. Filters update results instantly.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* SIDEBAR */}
          <aside className="h-fit rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Filters</div>

              <Link
                className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                href={buildQueryString({ category: "all", brand: "", q: "" })}
                title="Clear all filters"
              >
                Clear
              </Link>
            </div>

            <div className="mt-4 space-y-5">
              {/* SEARCH */}
              <div>
                <div className="text-xs font-medium text-muted-foreground">Search</div>

                <form className="mt-2 flex gap-2">
                  <input type="hidden" name="category" value={category} />
                  <input type="hidden" name="brand" value={brand} />

                  <input
                    name="q"
                    defaultValue={q}
                    placeholder="Brand or model…"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                  <Button type="submit" variant="secondary">
                    Go
                  </Button>
                </form>

                {q && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Searching: <span className="text-foreground">{q}</span>
                  </div>
                )}
              </div>

              {/* Product type */}
              <div>
                <div className="text-xs font-medium text-muted-foreground">Product type</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    asChild
                    size="sm"
                    variant={category === "all" ? "default" : "outline"}
                    className="rounded-full"
                  >
                    <Link href={buildQueryString({ category: "all", brand: "", q })}>
                      Any
                    </Link>
                  </Button>

                  <Button
                    asChild
                    size="sm"
                    variant={category === "tvs" ? "default" : "outline"}
                    className="rounded-full"
                  >
                    <Link href={buildQueryString({ category: "tvs", brand: "", q })}>
                      TVs
                    </Link>
                  </Button>

                  <Button
                    asChild
                    size="sm"
                    variant={category === "smartphones" ? "default" : "outline"}
                    className="rounded-full"
                  >
                    <Link href={buildQueryString({ category: "smartphones", brand: "", q })}>
                      Phones
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Brand */}
              <div>
                <div className="text-xs font-medium text-muted-foreground">Brand</div>

                <form className="mt-2">
                  <input type="hidden" name="category" value={category} />
                  <input type="hidden" name="q" value={q} />

                  <select
                    name="brand"
                    defaultValue={brand}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">All brands</option>
                    {brands.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>

                  <Button type="submit" variant="secondary" className="mt-2 w-full">
                    Apply
                  </Button>
                </form>
              </div>

              {/* Active filters indicator */}
              <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
                Active filters:{" "}
                <span className="text-foreground font-medium">{activeFiltersCount}</span>

                <div className="mt-2 flex flex-wrap gap-2">
                  {category !== "all" && (
                    <Badge variant="secondary" className="rounded-full">
                      {category === "tvs" ? "TVs" : "Phones"}
                    </Badge>
                  )}

                  {brand && (
                    <Badge variant="secondary" className="rounded-full">
                      {brand}
                    </Badge>
                  )}

                  {q && (
                    <Badge variant="secondary" className="rounded-full">
                      &ldquo;{q}&rdquo;
                    </Badge>
                  )}

                  {activeFiltersCount === 0 && (
                    <Badge variant="secondary" className="rounded-full">
                      No filters
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* RESULTS */}
          <section>
            <div className="mb-5 flex items-end justify-between">
              <div className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="text-foreground font-medium">{cardProducts.length}</span>{" "}
                results
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {cardProducts.map((p) => (
                <ProductCard key={p.id} product={p} variant="catalogue" />
              ))}
            </div>

            {cardProducts.length === 0 && (
              <div className="mt-10 rounded-xl border p-6 text-sm text-muted-foreground">
                No products match those filters yet. Try clearing brand/search.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
