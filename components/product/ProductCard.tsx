import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type ProductCardData = {
  id: string;
  category: "tvs" | "smartphones";
  brand: string;
  model: string;
  price_hint?: string | null;
  image_url?: string | null;
  affiliate_links?: Record<string, string> | null;

  // Optional MVP trust signals
  rating?: number | null; // 0..5
  rating_count?: number | null;
};

function getRetailers(affiliateLinks: any): Array<{ key: string; url: string }> {
  if (!affiliateLinks || typeof affiliateLinks !== "object" || Array.isArray(affiliateLinks)) return [];
  return Object.entries(affiliateLinks)
    .filter(([, v]) => typeof v === "string" && v.length > 5)
    .map(([k, v]) => ({ key: k, url: v as string }));
}

function pickPrimaryRetailer(retailers: Array<{ key: string; url: string }>) {
  if (!retailers.length) return null;
  const amazon = retailers.find((r) => r.key.toLowerCase().includes("amazon"));
  return amazon ?? retailers[0];
}

function clampRating(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(5, n));
}

function Stars({ rating }: { rating: number }) {
  const r = clampRating(rating);
  const full = Math.round(r); // keep it simple for MVP
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <span className="tracking-tight">
        {"★★★★★".slice(0, full)}
        <span className="opacity-30">{"★★★★★".slice(0, 5 - full)}</span>
      </span>
      <span className="ml-1">{r.toFixed(1)}</span>
    </div>
  );
}

export function ProductCard({
  product,
  variant = "catalogue",
  showBuy = true,
}: {
  product: ProductCardData;
  variant?: "compact" | "catalogue";
  showBuy?: boolean;
}) {
  const retailers = getRetailers(product.affiliate_links);
  const primary = pickPrimaryRetailer(retailers);
  const isCompact = variant === "compact";

  return (
    <article className="group relative overflow-hidden rounded-2xl border bg-background">
      {/* Overlay link (card clickable) */}
      <Link
        href={`/products/${product.id}`}
        className="absolute inset-0 z-0"
        aria-label={`View ${product.brand} ${product.model}`}
      />

      {/* Image */}
      <div className={isCompact ? "aspect-[16/10] bg-muted/30" : "aspect-[4/3] bg-muted/30"}>
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={`${product.brand} ${product.model}`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            Image placeholder
          </div>
        )}
      </div>

      {/* Content */}
      <div className={isCompact ? "p-4" : "p-5"}>
        <div className="flex items-start justify-between gap-3">
          <div className="relative z-10">
            <div className="text-sm text-muted-foreground">{product.brand}</div>
            <h3 className={isCompact ? "mt-0.5 text-lg font-semibold leading-tight" : "mt-0.5 text-xl font-semibold leading-tight tracking-tight"}>
              {product.model}
            </h3>

            {/* Optional: rating (MVP-friendly) */}
            {typeof product.rating === "number" && (
              <div className="mt-2">
                <Stars rating={product.rating} />
                {product.rating_count ? (
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {product.rating_count.toLocaleString()} ratings
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <Badge variant="secondary" className="relative z-10 rounded-full">
            {product.category === "tvs" ? "TV" : "Phone"}
          </Badge>
        </div>

        {!isCompact && (
          <div className="mt-3 text-sm text-muted-foreground relative z-10">
            {product.price_hint ? `From ${product.price_hint}` : "Price varies by retailer"}
          </div>
        )}

        {showBuy && (
          <div className="mt-5 relative z-10">
            {primary ? (
              <Button asChild className="w-full">
                <a href={`/r/${product.id}/${primary.key}`} target="_blank" rel="noreferrer">
                  Buy ({primary.key})
                </a>
              </Button>
            ) : (
              <div className="text-xs text-muted-foreground">No affiliate links yet</div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
