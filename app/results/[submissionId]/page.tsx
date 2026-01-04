// app/results/[submissionId]/page.tsx

import { supabaseServer } from "@/app/utils/supabase/server";
import type { Submission } from "@/lib/types";
import { notFound } from "next/navigation";

type TopPickItem = {
  product_id?: string;
  id?: string;
  brand?: string;
  model?: string;
  percent?: number | null;
  price_hint?: string | null;
  reasons?: string[] | null;
  warranty_text?: string | null;
  affiliate_links?: Record<string, string> | null;
};

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;

  const { data, error } = await supabaseServer
    .from("quiz_submissions")
    .select("*")
    .eq("id", submissionId)
    .single();

  if (error || !data) return notFound();

  const submission = data as unknown as Submission;

  const top3: TopPickItem[] = Array.isArray((submission as any).top_3)
    ? ((submission as any).top_3 as TopPickItem[])
    : [];

  const best = top3[0] ?? null;

  const overall =
    typeof (submission as any).score_percent === "number"
      ? ((submission as any).score_percent as number)
      : null;

  // Summary reasons: clamp to 4 max
  const summaryReasons: string[] =
    best?.reasons && Array.isArray(best.reasons) && best.reasons.length > 0
      ? best.reasons.slice(0, 4)
      : ["Matched your preferences."];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Your Top Recommendations</h1>

      <p className="mt-2 text-sm text-neutral-600">
        Category:{" "}
        <span className="font-medium capitalize">
          {(submission as any).category ?? "—"}
        </span>
      </p>

      {/* Overall match + summary */}
      <div className="mt-6 rounded-2xl border p-6">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-600">Overall match</p>
            <p className="mt-1 text-3xl font-semibold">
              {overall !== null ? `${overall}%` : "—"}
            </p>
          </div>

          {best ? (
            <div className="text-right">
              <p className="text-sm text-neutral-600">Best pick</p>
              <p className="mt-1 text-sm font-medium">
                {best.brand ?? "—"} {best.model ?? ""}
              </p>
            </div>
          ) : null}
        </div>

        {/* Simple progress bar */}
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full bg-neutral-900"
            style={{ width: `${Math.max(0, Math.min(100, overall ?? 0))}%` }}
          />
        </div>

        <div className="mt-5">
          <p className="text-sm font-medium text-neutral-800">
            Personalised summary
          </p>
          <ul className="mt-2 list-disc pl-5 text-sm text-neutral-700">
            {summaryReasons.map((r: string, i: number) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Cards */}
      <div className="mt-8 grid gap-4">
        {top3.length === 0 ? (
          <div className="rounded-xl border p-4 text-sm text-neutral-600">
            No recommendations found for this submission.
          </div>
        ) : (
          top3.map((item, idx) => {
            const productName = `${item.brand ?? ""} ${item.model ?? ""}`.trim();

            const reasons =
              Array.isArray(item.reasons) && item.reasons.length
                ? item.reasons
                : ["Matched your preferences."];

            // Requirement: 2–3 bullets per product
            const tightReasons = reasons.slice(0, 3);

            // Use-case language (simple heuristic)
            const useCase = buildUseCaseCopy({
              category: (submission as any).category,
              priceHint: item.price_hint ?? undefined,
              firstReason: tightReasons[0],
            });

            return (
              <div
                key={item.product_id ?? item.id ?? `${idx}`}
                className="rounded-2xl border p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">
                      #{idx + 1} — {productName || "Recommendation"}
                    </h2>

                    {item.price_hint ? (
                      <p className="mt-1 text-sm text-neutral-600">
                        Price band:{" "}
                        <span className="font-medium">{item.price_hint}</span>
                      </p>
                    ) : null}
                  </div>

                  {item.percent !== null && item.percent !== undefined ? (
                    <div className="rounded-xl bg-neutral-100 px-3 py-2 text-sm">
                      Match:{" "}
                      <span className="font-semibold">{item.percent}%</span>
                    </div>
                  ) : null}
                </div>

                {/* Why we picked this (use-case language) */}
                <div className="mt-4 rounded-xl bg-neutral-50 p-4 text-sm">
                  <p className="font-medium text-neutral-800">Why we picked this</p>
                  <p className="mt-1 text-neutral-600">{useCase}</p>
                </div>

                {/* Reasons (2–3 bullets) */}
                <div className="mt-4 text-sm text-neutral-700">
                  <p className="font-medium">Top reasons</p>
                  <ul className="mt-2 list-disc pl-5">
                    {tightReasons.map((r: string, i: number) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                {item.warranty_text ? (
                  <div className="mt-4 text-sm text-neutral-700">
                    <p className="font-medium">Warranty</p>
                    <p className="mt-1 text-neutral-600">{item.warranty_text}</p>
                  </div>
                ) : null}

                {/* CTA buttons (tracked via /r/:id/:retailer) */}
                <div className="mt-5">
                  {renderAffiliateButtons({
                    productId: item.product_id ?? item.id,
                    affiliateLinks: item.affiliate_links ?? undefined,
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function renderAffiliateButtons({
  productId,
  affiliateLinks,
}: {
  productId?: string;
  affiliateLinks?: Record<string, string>;
}) {
  // If we can't identify the product, we can't safely track redirects
  if (!productId) {
    return (
      <div className="text-sm text-neutral-500">
        Links coming soon.
      </div>
    );
  }

  const linksObj =
    affiliateLinks && typeof affiliateLinks === "object" ? affiliateLinks : {};

  // We DO NOT use the URL here — we just use the retailer keys,
  // because outbound must route through /r/:id/:retailer
  const retailersWithLinks = Object.entries(linksObj)
    .filter(([_, url]) => typeof url === "string" && url.trim().length > 0)
    .map(([retailer]) => retailer);

  // Requirement: If links missing, hide button + show “Links coming soon”
  if (retailersWithLinks.length === 0) {
    return (
      <div className="text-sm text-neutral-500">
        Links coming soon.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2">
        {retailersWithLinks.map((retailer) => (
          <a
            key={retailer}
            href={`/r/${encodeURIComponent(productId)}/${encodeURIComponent(
              retailer
            )}`}
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-white"
          >
            Buy on {retailer}
          </a>
        ))}
      </div>

      {/* Requirement: Affiliate disclosure mini line near buttons */}
      <p className="mt-2 text-xs text-neutral-500">
        Disclosure: we may earn a commission if you buy through these links (at no extra cost to you).
      </p>
    </div>
  );
}

function buildUseCaseCopy({
  category,
  priceHint,
  firstReason,
}: {
  category?: string;
  priceHint?: string;
  firstReason?: string;
}) {
  const cat = (category || "").toLowerCase();

  // Keep it simple and human. This is credibility, not “AI fluff”.
  if (cat.includes("tv")) {
    const tier = priceHint ? ` in the ${priceHint} range` : "";
    return `Best for people who want a TV${tier} that delivers the essentials without overpaying. ${
      firstReason ? `(${firstReason})` : ""
    }`;
  }

  if (cat.includes("phone") || cat.includes("smartphone")) {
    const tier = priceHint ? ` in the ${priceHint} range` : "";
    return `Best for everyday use${tier}: strong performance where it matters, with fewer compromises. ${
      firstReason ? `(${firstReason})` : ""
    }`;
  }

  return `Best fit for your answers — picked to match your priorities with minimal trade-offs. ${
    firstReason ? `(${firstReason})` : ""
  }`;
}
