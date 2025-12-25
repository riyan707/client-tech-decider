import { supabaseServer } from "@/app/utils/supabase/server";
import type { Submission } from "@/lib/types";
import { notFound } from "next/navigation";

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
  const top3 = Array.isArray(submission.top_3) ? submission.top_3 : [];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Your Top Recommendations</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Category: <span className="font-medium capitalize">{submission.category}</span>
        {submission.score_percent !== null ? (
          <> • Overall match: <span className="font-medium">{submission.score_percent}%</span></>
        ) : null}
      </p>

      <div className="mt-8 grid gap-4">
        {top3.length === 0 ? (
          <div className="rounded-xl border p-4 text-sm text-neutral-600">
            No recommendations found for this submission.
          </div>
        ) : (
          top3.map((item: any, idx: number) => (
            <div key={item.product_id ?? idx} className="rounded-2xl border p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    #{idx + 1} — {item.brand} {item.model}
                  </h2>
                  {item.price_hint ? (
                    <p className="mt-1 text-sm text-neutral-600">
                      Price band: <span className="font-medium">{item.price_hint}</span>
                    </p>
                  ) : null}
                </div>

                {item.percent !== null ? (
                  <div className="rounded-xl bg-neutral-100 px-3 py-2 text-sm">
                    Match: <span className="font-semibold">{item.percent}%</span>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 text-sm text-neutral-700">
                <p className="font-medium">Why this was picked</p>
                <ul className="mt-2 list-disc pl-5">
                  {(item.reasons ?? ["Placeholder explanation (Step 5 adds scoring)."]).map(
                    (r: string, i: number) => (
                      <li key={i}>{r}</li>
                    )
                  )}
                </ul>
              </div>

              {item.warranty_text ? (
                <div className="mt-4 text-sm text-neutral-700">
                  <p className="font-medium">Warranty</p>
                  <p className="mt-1 text-neutral-600">{item.warranty_text}</p>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                {renderAffiliateButtons(item.affiliate_links)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function renderAffiliateButtons(affiliateLinks?: Record<string, string>) {
  if (!affiliateLinks || typeof affiliateLinks !== "object") return null;

  const entries = Object.entries(affiliateLinks).filter(
    ([_, url]) => typeof url === "string" && url.trim().length > 0
  );

  if (entries.length === 0)
    return <span className="text-sm text-neutral-500">No affiliate links yet.</span>;

  return entries.map(([name, url]) => (
    <a
      key={name}
      href={url}
      target="_blank"
      rel="noreferrer"
      className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-white"
    >
      View on {name}
    </a>
  ));
}
