"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { HowItWorks } from "@/components/HowItWorks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  ProductCard,
  type ProductCardData,
} from "@/components/product/ProductCard";

// ✅ MUST match DB categories
const CATEGORIES = [
  { key: "tvs", label: "TVs" },
  { key: "smartphones", label: "Phones" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

// ✅ MUST match DB use_cases.key values
const USE_CASES_BY_CATEGORY = {
  tvs: [
    { key: "gamers", label: "Gamers" },
    { key: "movie_lovers", label: "Movie lovers" },
    { key: "sports_fans", label: "Sports fans" },
    { key: "family", label: "Family" },
  ],
  smartphones: [
    { key: "content_creators", label: "Content creators" },
    { key: "battery_life", label: "Battery life" },
    { key: "mobile_gaming", label: "Mobile gaming" },
    { key: "best_value", label: "Best value" },
  ],
} as const;

type UseCaseKey =
  | (typeof USE_CASES_BY_CATEGORY.tvs)[number]["key"]
  | (typeof USE_CASES_BY_CATEGORY.smartphones)[number]["key"];

function getCategoryLabel(key: CategoryKey) {
  return CATEGORIES.find((c) => c.key === key)?.label ?? "TVs";
}

function getDefaultUseCase(category: CategoryKey): UseCaseKey {
  return USE_CASES_BY_CATEGORY[category][0].key;
}

function getUseCaseLabel(category: CategoryKey, useCase: UseCaseKey) {
  const list = USE_CASES_BY_CATEGORY[category];
  return list.find((u) => u.key === useCase)?.label ?? list[0].label;
}

export default function HomePage() {
  const [category, setCategory] = useState<CategoryKey>("tvs");
  const [useCase, setUseCase] = useState<UseCaseKey>(
    getDefaultUseCase("tvs")
  );

  const useCases = USE_CASES_BY_CATEGORY[category];

  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(false);

  const onCategoryChange = (next: CategoryKey) => {
    setCategory(next);
    setUseCase(getDefaultUseCase(next));
  };

  // (Optional) useful for analytics later
  const title = useMemo(() => {
    const catLabel = getCategoryLabel(category);
    const useLabel = getUseCaseLabel(category, useCase);
    return `Most popular ${catLabel} for ${useLabel}`;
  }, [category, useCase]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/featured-products?category=${encodeURIComponent(
            category
          )}&useCase=${encodeURIComponent(useCase)}`,
          { cache: "no-store" }
        );

        const json = await res.json();

        if (!cancelled) {
          setProducts((json.data ?? []) as ProductCardData[]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [category, useCase]);

  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-10 text-center">
        <p className="text-sm text-muted-foreground">Tech Decider</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
          Find the right device in 2 minutes.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
          Tell us how you’ll use it. We’ll recommend the best matches — not just
          specs.
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <Button asChild>
            <Link href="/quiz">Take the quiz</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/catalogue">Browse catalogue</Link>
          </Button>
        </div>

        {/* placeholder visual */}
        <div className="mt-10 h-56 w-full rounded-xl border bg-muted/40" />

        <p className="mt-4 text-sm text-muted-foreground">
          No spam. Affiliate-supported (no extra cost). Independent
          recommendations.
        </p>
      </section>

      {/* FEATURED / REAL DATA */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">
              Most popular{" "}
              <InlineSelect
                value={category}
                onChange={(v) => onCategoryChange(v as CategoryKey)}
                items={CATEGORIES}
                ariaLabel="Select category"
                display={getCategoryLabel(category)}
              />{" "}
              for{" "}
              <InlineSelect
                value={useCase}
                onChange={(v) => setUseCase(v as UseCaseKey)}
                items={
                  useCases as unknown as ReadonlyArray<{
                    key: string;
                    label: string;
                  }>
                }
                ariaLabel="Select use case"
                display={getUseCaseLabel(category, useCase)}
              />
            </h2>

            <p className="text-sm text-muted-foreground">
              Tap the underlined words to change options.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <ProductCard
                key={`skeleton-${i}`}
                product={{
                  id: `skeleton-${i}`,
                  category,
                  brand: "Loading",
                  model: "Loading",
                  price_hint: null,
                  image_url: null,
                  affiliate_links: null,
                }}
                variant="compact"
                showBuy={false}
              />
            ))
          ) : products.length ? (
            products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                variant="compact"
                showBuy={false}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No products found for this selection yet.
            </p>
          )}
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Catalogue is expanding daily — the quiz will recommend the best
          available matches.
        </p>
      </section>

      <section>
        <HowItWorks />
      </section>
    </div>
  );
}

/** Inline sentence select: looks like “TVs⌄” inside a heading */
function InlineSelect<T extends string>({
  value,
  onChange,
  items,
  ariaLabel,
  display,
}: {
  value: T;
  onChange: (value: T) => void;
  items: ReadonlyArray<{ key: T; label: string }>;
  ariaLabel: string;
  display: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger
        aria-label={ariaLabel}
        className={[
          "inline-flex h-auto w-auto gap-1 rounded-none border-0 bg-transparent p-0 align-baseline",
          "text-xl font-semibold tracking-tight",
          "underline underline-offset-4 decoration-muted-foreground/40 hover:decoration-muted-foreground/70",
          "focus:ring-0 focus:ring-offset-0",
        ].join(" ")}
      >
        <SelectValue>{display}</SelectValue>
      </SelectTrigger>

      <SelectContent align="start">
        {items.map((i) => (
          <SelectItem key={i.key} value={i.key}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
