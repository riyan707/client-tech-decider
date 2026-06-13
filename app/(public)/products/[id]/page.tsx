export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ProductRow = {
  id: string;
  category: "tvs" | "smartphones";
  brand: string;
  model: string;
  price_hint: string | null;
  image_url: string | null;
  affiliate_links: Record<string, string> | null;
  warranty_text: string | null;
  specs: Record<string, unknown> | null;
};

function getRetailers(affiliateLinks: any): Array<{ key: string; url: string }> {
  if (!affiliateLinks || typeof affiliateLinks !== "object" || Array.isArray(affiliateLinks)) return [];
  return Object.entries(affiliateLinks)
    .filter(([, v]) => typeof v === "string" && v.length > 5)
    .map(([k, v]) => ({ key: k, url: v as string }));
}

function formatLabel(key: string) {
  const map: Record<string, string> = {
    os: "Operating system",
    vrr: "VRR (Variable Refresh Rate)",
    hdr_tier: "HDR quality",
  };
  const cleaned = key.trim().toLowerCase();
  if (map[cleaned]) return map[cleaned];
  return cleaned
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatValue(key: string, raw: unknown) {
  const k = key.trim().toLowerCase();

  if (typeof raw === "boolean") {
    return raw ? "Yes" : "No";
  }

  if (typeof raw === "number") {
    if (k === "hdr_tier") {
      const tier = raw;
      if (tier <= 1) return `Basic (Tier ${tier})`;
      if (tier === 2) return `Decent (Tier 2)`;
      if (tier === 3) return `Good (Tier 3)`;
      return `Excellent (Tier ${tier})`;
    }
    return String(raw);
  }

  if (typeof raw === "string") {
    if (k === "os" && raw.toLowerCase().includes("fire")) {
      return "Amazon Fire TV (built-in apps + Alexa)";
    }
    return raw;
  }

  if (Array.isArray(raw)) return raw.map(String).join(", ");
  if (raw && typeof raw === "object") return JSON.stringify(raw);
  return "";
}

function normalizeSpecs(specs: Record<string, unknown> | null) {
  if (!specs || typeof specs !== "object") return [];
  return Object.entries(specs)
    .map(([k, v]) => ({
      key: k,
      label: formatLabel(k),
      value: formatValue(k, v),
    }))
    .filter((row) => row.value && row.value.trim() !== "");
}

function getGoodFor(product: { category: ProductRow["category"]; specs: Record<string, unknown> | null }) {
  const specs = product.specs ?? {};
  const os = typeof specs.os === "string" ? specs.os.toLowerCase() : "";
  const vrr = typeof specs.vrr === "boolean" ? specs.vrr : null;
  const hdrTier = typeof specs.hdr_tier === "number" ? specs.hdr_tier : null;

  const bullets: string[] = [];

  if (product.category === "tvs") {
    if (os.includes("fire")) bullets.push("People who want built-in streaming apps with minimal setup.");
    else bullets.push("Everyday TV use: movies, shows, and family viewing.");

    if (hdrTier !== null) {
      if (hdrTier >= 3) bullets.push("HDR movies and series (stronger contrast/highlights than basic HDR).");
      else bullets.push("Casual HDR viewing (fine, but not a 'wow' HDR experience).");
    }

    if (vrr === true) bullets.push("Console gaming (PS5/Xbox) with smoother motion thanks to VRR.");
    if (vrr === false) bullets.push("Casual gaming — not ideal if you specifically want VRR.");
  }

  if (product.category === "smartphones") {
    bullets.push("Everyday use: social media, messaging, browsing, and photos.");
  }

  if (bullets.length === 0) bullets.push("General everyday use.");
  return bullets.slice(0, 4);
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
    })
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  const data = rows[0] as ProductRow | undefined;

  if (!data) {
    return notFound();
  }

  const retailers = getRetailers(data.affiliate_links);
  const specsRows = normalizeSpecs(data.specs);
  const goodFor = getGoodFor({ category: data.category, specs: data.specs });

  // Blog card — only for TVs
  const tvBlogPost = data.category === "tvs" ? {
    slug: "oled-vs-qled-vs-miniled-explained",
    title: "OLED vs QLED vs Mini-LED vs MicroLED: Which Is Right for You?",
    excerpt: "TV shopping is confusing. We break down every display technology in plain English so you can make the right choice.",
  } : null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Top */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link href="/catalogue" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to catalogue
        </Link>

        <Badge variant="secondary" className="rounded-full">
          {data.category === "tvs" ? "TV" : "Phone"}
        </Badge>
      </div>

      {/* Title */}
      <div className="mb-6">
        <div className="text-sm text-muted-foreground">{data.brand}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{data.model}</h1>
        <div className="mt-2 text-sm text-muted-foreground">
          {data.price_hint ? `From ${data.price_hint}` : "Price varies by retailer"}
        </div>
      </div>

      {/* Row 1: Image -> Affiliate links */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Image card */}
        <div className="md:col-span-5">
          <div className="overflow-hidden rounded-2xl border bg-muted/20">
            {data.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.image_url}
                alt={`${data.brand} ${data.model}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center text-sm text-muted-foreground">
                Image placeholder
              </div>
            )}
          </div>

          <div className="mt-3 text-xs text-muted-foreground">
            Links may be affiliate links. Prices and availability can change.
          </div>
        </div>

        {/* Affiliate links */}
        <div className="md:col-span-7">
          <div className="rounded-2xl border bg-background p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Where to buy</h2>
                <div className="mt-1 text-sm text-muted-foreground">
                  Choose a retailer below.
                </div>
              </div>

              <Badge variant="secondary" className="rounded-full">
                Best price varies
              </Badge>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {retailers.length ? (
                retailers.map((r) => (
                  <Button key={r.key} asChild className="w-full justify-between">
                    <a href={`/r/${data.id}/${r.key}`} target="_blank" rel="noreferrer">
                      <span>Buy on {r.key}</span>
                      <span className="opacity-70">→</span>
                    </a>
                  </Button>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No affiliate links yet.</div>
              )}
            </div>

            <div className="mt-4 text-xs text-muted-foreground">
              Tip: open 2 retailers to compare price + delivery time.
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: All info */}
      <div className="mt-8 grid gap-6 md:grid-cols-12">
        {/* Good for + Blog card */}
        <div className="md:col-span-5 flex flex-col gap-6">
          <div className="rounded-2xl border bg-background p-5">
            <h2 className="text-sm font-semibold">Good for</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {goodFor.map((b, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {tvBlogPost && (
            <div className="rounded-2xl border bg-background p-5 flex flex-col">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Guide</span>
              <h3 className="mt-2 text-sm font-semibold leading-snug">{tvBlogPost.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-3">{tvBlogPost.excerpt}</p>
              <div className="mt-4 flex justify-end">
                <Link
                  href={`/blog/${tvBlogPost.slug}`}
                  className="text-xs font-medium text-foreground underline underline-offset-2 hover:opacity-70"
                >
                  Continue reading →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Important features (specs) */}
        <div className="md:col-span-7">
          <div className="rounded-2xl border bg-background p-5">
            <h2 className="text-sm font-semibold">Important features</h2>

            {specsRows.length ? (
              <div className="mt-4 overflow-hidden rounded-xl border">
                <div className="divide-y">
                  {specsRows.map((row) => (
                    <div key={row.key} className="flex items-start justify-between gap-6 px-4 py-3">
                      <div className="text-sm text-muted-foreground">{row.label}</div>
                      <div className="text-sm font-medium text-foreground text-right">{row.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-muted-foreground">No specs added yet.</div>
            )}

            {data.warranty_text ? (
              <div className="mt-6">
                <h3 className="text-sm font-semibold">Warranty</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {data.warranty_text}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
