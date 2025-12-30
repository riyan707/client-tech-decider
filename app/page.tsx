// app/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FloatingQuizCTA } from "@/components/FloatingQuizCta";
import { HowItWorks } from "@/components/HowItWorks";

const USE_CASES = [
  { key: "gaming", label: "Gamers" },
  { key: "movies", label: "Movies" },
  { key: "sports", label: "Sports" },
  { key: "family", label: "Family" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <FloatingQuizCTA />

      {/* HERO */}
      <section className="mx-auto max-w-5xl px-6 pt-20 pb-10 text-center">
        <p className="text-sm text-muted-foreground">Tech Decider</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
          Find the right device in 2 minutes.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
          Tell us how you’ll use it. We’ll recommend the best matches — not just specs.
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
          No spam. Affiliate-supported (no extra cost). Independent recommendations.
        </p>
      </section>

      {/* FILTER AREA */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Most popular TVs for Gamers</h2>
          <div className="flex gap-2">
            {/* category “buttons” */}
            <Button variant="secondary" className="rounded-full">TVs</Button>
            <Button variant="secondary" className="rounded-full">Phones</Button>
          </div>
        </div>

        {/* use-case chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {USE_CASES.map((u) => (
            <Badge key={u.key} variant="secondary" className="rounded-full px-4 py-2">
              {u.label}
            </Badge>
          ))}
        </div>

        {/* product grid placeholder */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4">
              <div className="h-36 rounded-lg bg-muted/40" />
              <div className="mt-4 h-4 w-2/3 rounded bg-muted/40" />
              <div className="mt-2 h-4 w-1/2 rounded bg-muted/40" />
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm">View</Button>
                <Button size="sm">See options</Button>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Catalogue is expanding daily — the quiz will recommend the best available matches.
        </p>
        
      </section>
      <section>
        <HowItWorks />
      </section>
    </div>
  );
}
