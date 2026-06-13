"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { HowItWorks } from "@/components/HowItWorks";
import { FadeUp, ScrollReveal, motion } from "@/components/ui/motion";
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

const CATEGORIES = [
  { key: "tvs", label: "TVs" },
  { key: "smartphones", label: "Phones" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

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
  const [useCase, setUseCase] = useState<UseCaseKey>(getDefaultUseCase("tvs"));
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(false);

  const useCases = USE_CASES_BY_CATEGORY[category];

  const onCategoryChange = (next: CategoryKey) => {
    setCategory(next);
    setUseCase(getDefaultUseCase(next));
  };

  const title = useMemo(() => {
    return `Most popular ${getCategoryLabel(category)} for ${getUseCaseLabel(category, useCase)}`;
  }, [category, useCase]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/featured-products?category=${encodeURIComponent(category)}&useCase=${encodeURIComponent(useCase)}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (!cancelled) setProducts((json.data ?? []) as ProductCardData[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [category, useCase]);

  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section className="relative mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 -z-10 flex items-start justify-center overflow-hidden">
          <div className="h-[400px] w-[700px] rounded-full bg-foreground/[0.03] blur-3xl" />
        </div>

        <FadeUp delay={0}>
          <span className="inline-block rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
            Phones &amp; TVs · Updated weekly
          </span>
        </FadeUp>

        <FadeUp delay={0.1}>
          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            Find your perfect device.
            <br />
            <span className="text-muted-foreground">In 2 minutes.</span>
          </h1>
        </FadeUp>

        <FadeUp delay={0.2}>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">
            Answer a few questions about how you actually use tech. We match you to the best device for your needs — not just the most popular.
          </p>
        </FadeUp>

        <FadeUp delay={0.3}>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/quiz">Take the quiz →</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="/catalogue">Browse catalogue</Link>
            </Button>
          </div>
        </FadeUp>

        <FadeUp delay={0.4}>
          <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span>✓ No registration required</span>
            <span>✓ Independent recommendations</span>
            <span>✓ No extra cost to you</span>
          </div>
        </FadeUp>
      </section>

      {/* FEATURED */}
      <ScrollReveal>
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
                  items={useCases as unknown as ReadonlyArray<{ key: string; label: string }>}
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
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <motion.div
                    key={`skel-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.5, 0.3, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                    className="aspect-[4/3] rounded-2xl border bg-muted/40"
                  />
                ))
              : products.length
              ? products.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.07 }}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  >
                    <ProductCard product={p} variant="compact" showBuy={false} />
                  </motion.div>
                ))
              : (
                <p className="text-sm text-muted-foreground">
                  No products found for this selection yet.
                </p>
              )}
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            Catalogue is expanding daily — the quiz will recommend the best available matches.
          </p>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        <section>
          <HowItWorks />
        </section>
      </ScrollReveal>
    </div>
  );
}

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
