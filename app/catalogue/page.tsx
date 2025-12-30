import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type SearchParams = {
  category?: "smartphones" | "tvs";
  q?: string;
};

function getRetailers(affiliateLinks: any): Array<{ key: string; url: string }> {
  if (!affiliateLinks || typeof affiliateLinks !== "object" || Array.isArray(affiliateLinks)) return [];
  return Object.entries(affiliateLinks)
    .filter(([, v]) => typeof v === "string" && v.length > 5)
    .map(([k, v]) => ({ key: k, url: v as string }));
}

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const category = sp.category ?? "tvs";
  const q = (sp.q ?? "").trim();

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("products")
    .select("id, category, brand, model, price_hint, affiliate_links")
    .eq("is_active", true)
    .eq("category", category)
    .order("updated_at", { ascending: false });

  if (q) query = query.or(`brand.ilike.%${q}%,model.ilike.%${q}%`);

  const { data: products, error } = await query;
  if (error) throw new Error(error.message);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-6 pt-16 pb-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Catalogue</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Browse active products. Use the quiz for best matches.
            </p>
          </div>

          <div className="flex gap-2">
            <Button asChild variant={category === "tvs" ? "default" : "outline"} className="rounded-full">
              <Link href={`/catalogue?category=tvs${q ? `&q=${encodeURIComponent(q)}` : ""}`}>TVs</Link>
            </Button>
            <Button
              asChild
              variant={category === "smartphones" ? "default" : "outline"}
              className="rounded-full"
            >
              <Link href={`/catalogue?category=smartphones${q ? `&q=${encodeURIComponent(q)}` : ""}`}>
                Phones
              </Link>
            </Button>
          </div>
        </div>

        <form className="mt-6 flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search brand or model…"
            className="w-full max-w-md rounded-md border bg-background px-4 py-2 text-sm"
          />
          <input type="hidden" name="category" value={category} />
          <Button type="submit" variant="secondary">Search</Button>
        </form>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(products ?? []).map((p) => {
            const retailers = getRetailers(p.affiliate_links);
            return (
              <div key={p.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-muted-foreground">{p.brand}</div>
                    <div className="text-lg font-semibold leading-tight">{p.model}</div>
                  </div>
                  <Badge variant="secondary" className="rounded-full">
                    {p.category === "tvs" ? "TV" : "Phone"}
                  </Badge>
                </div>

                <div className="mt-3 text-sm text-muted-foreground">
                  {p.price_hint ? `From ${p.price_hint}` : "Price varies by retailer"}
                </div>

                {/* Placeholder use-case tags (optional now, real later) */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full">Gaming</Badge>
                  <Badge variant="outline" className="rounded-full">Movies</Badge>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/quiz">Take the quiz</Link>
                  </Button>

                  {retailers.slice(0, 2).map((r) => (
                    <Button key={r.key} asChild size="sm">
                      <a href={`/r/${p.id}/${r.key}`} target="_blank" rel="noreferrer">
                        Buy ({r.key})
                      </a>
                    </Button>
                  ))}

                  {retailers.length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      No affiliate links yet
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {(products?.length ?? 0) === 0 && (
          <div className="mt-10 rounded-xl border p-6 text-sm text-muted-foreground">
            No products in this category yet. The catalogue is expanding — use the quiz for best available matches.
          </div>
        )}
      </div>
    </div>
  );
}
