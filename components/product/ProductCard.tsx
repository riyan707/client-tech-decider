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

function formatRetailerLabel(key: string) {
  return "Buy on " + key.charAt(0).toUpperCase() + key.slice(1);
}

function clampRating(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(5, n));
}

function Stars({ rating }: { rating: number }) {
  const r = clampRating(rating);
  const full = Math.round(r);
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
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border bg-background">
      {/* Full-card overlay link — sits below interactive children */}
      <Link
        href={`/products/${product.id}`}
        className="absolute inset-0 z-10"
        aria-label={`View ${product.brand} ${product.model}`}
      />

      {/* Image */}
      <div
        className={[
          "relative overflow-hidden bg-muted/30",
          "flex items-center justify-center",
          isCompact ? "aspect-16/10" : "aspect-4/3",
        ].join(" ")}
      >
        {product.image_url ? (
          <div className="relative h-full w-full p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.image_url}
              alt={`${product.brand} ${product.model}`}
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
      </div>

      {/* Content — flex-col so bottom elements always align */}
      <div className={["flex flex-1 flex-col", isCompact ? "p-4" : "p-5"].join(" ")}>

        {/* Top row: brand/title + category badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="relative z-20 min-w-0 flex-1">
            <div className="text-xs font-medium text-muted-foreground">{product.brand}</div>
            {/* line-clamp-2 keeps all cards the same title height */}
            <h3 className={[
              "mt-0.5 line-clamp-2",
              isCompact
                ? "text-base font-semibold leading-snug"
                : "text-[15px] font-semibold leading-snug tracking-tight",
            ].join(" ")}>
              {product.model}
            </h3>

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

          <Badge variant="secondary" className="relative z-20 shrink-0 rounded-full">
            {product.category === "tvs" ? "TV" : "Phone"}
          </Badge>
        </div>

        {/* Price — always rendered in catalogue variant to keep cards aligned */}
        {!isCompact && (
          <div className="relative z-20 mt-3 text-sm text-muted-foreground">
            {product.price_hint ? `From ${product.price_hint}` : "See retailer for price"}
          </div>
        )}

        {/* Spacer pushes buy button to bottom of card */}
        <div className="flex-1" />

        {/* Buy button — z-20 sits above the z-10 overlay so clicks register */}
        {showBuy && (
          <div className="relative z-20 mt-4">
            {primary ? (
              <Button asChild className="w-full">
                <a href={`/r/${product.id}/${primary.key}`} target="_blank" rel="noreferrer">
                  {formatRetailerLabel(primary.key)}
                </a>
              </Button>
            ) : (
              <div className="text-xs text-muted-foreground">No purchase links yet</div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
