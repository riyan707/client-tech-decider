import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STEPS = [
  {
    title: "Tell us your use case",
    desc: "We ask a few questions about how you’ll actually use the device — not just specs.",
  },
  {
    title: "We match against real products",
    desc: "Your answers are scored against active products in our catalogue, updated via admin.",
  },
  {
    title: "Get your top 3 picks",
    desc: "We show your best matches with clear reasons and retailer links (affiliate-supported).",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-14">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Fast, simple, and built around use-cases — not spec sheets.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((s) => (
          <Card key={s.title} className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">{s.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {s.desc}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
