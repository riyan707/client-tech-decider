export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { products, quiz_submissions } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import type { Submission } from "@/lib/types";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

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
  image_url?: string | null;
};

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;

  const rows = await db
    .select()
    .from(quiz_submissions)
    .where(eq(quiz_submissions.id, submissionId))
    .limit(1);

  const data = rows[0];
  if (!data) return notFound();

  const submission = data as unknown as Submission;

  const top3: TopPickItem[] = Array.isArray((submission as any).top_3)
    ? ((submission as any).top_3 as TopPickItem[])
    : [];

  const productIds = top3
    .map((t) => t.product_id ?? t.id)
    .filter((id): id is string => !!id);

  let imageMap: Record<string, string> = {};
  if (productIds.length > 0) {
    const productRows = await db
      .select({ id: products.id, image_url: products.image_url })
      .from(products)
      .where(inArray(products.id, productIds));
    imageMap = Object.fromEntries(
      productRows.map((r) => [r.id, r.image_url ?? ""])
    );
  }

  const enrichedTop3 = top3.map((item) => ({
    ...item,
    image_url:
      item.image_url ||
      imageMap[item.product_id ?? item.id ?? ""] ||
      null,
  }));

  const best = enrichedTop3[0] ?? null;
  const overall =
    typeof (submission as any).score_percent === "number"
      ? ((submission as any).score_percent as number)
      : null;

  const category = (submission as any).category ?? "";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-2 text-sm font-medium uppercase tracking-widest text-muted-foreground">
        Your Results
      </div>
      <h1 className="text-3xl font-bold tracking-tight">
        {category === "tvs" ? "Best TVs" : category === "smartphones" ? "Best Phones" : "Top Picks"} for You
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Based on your answers — ranked by how well they match your needs.
      </p>

      {overall !== null && best && (
        <div className="mt-6 flex items-center gap-4 rounded-2xl border bg-muted/30 px-5 py-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-lg font-bold">
            {overall}%
          </div>
          <div>
            <p className="font-semibold">
              {best.brand} {best.model} is your best match
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {overall >= 80
                ? "Excellent fit for your needs."
                : overall >= 60
                ? "Strong match — covers your key priorities."
                : "Good option within your criteria."}
            </p>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-5">
        {enrichedTop3.length === 0 ? (
          <div className="rounded-xl border p-6 text-sm text-muted-foreground">
            No recommendations found.{" "}
            <Link href="/quiz" className="underline">Retake the quiz</Link>
          </div>
        ) : (
          enrichedTop3.map((item, idx) => {
            const productName = `${item.brand ?? ""} ${item.model ?? ""}`.trim();
            const productId = item.product_id ?? item.id;
            const reasons =
              Array.isArray(item.reasons) && item.reasons.length
                ? item.reasons.slice(0, 3)
                : [];
            const retailers = item.affiliate_links
              ? Object.entries(item.affiliate_links).filter(
                  ([, url]) => typeof url === "string" && (url as string).length > 5
                )
              : [];

            return (
              <div
                key={productId ?? idx}
                className={`rounded-2xl border bg-background overflow-hidden${idx === 0 ? " ring-2 ring-foreground/10" : ""}`}
              >
                <div className="flex gap-0">
                  {item.image_url ? (
                    <div className="relative w-36 shrink-0 bg-muted/40 sm:w-44">
                      <Image
                        src={item.image_url}
                        alt={productName}
                        fill
                        className="object-contain p-3"
                        sizes="180px"
                      />
                    </div>
                  ) : (
                    <div className="w-36 shrink-0 bg-muted/20 sm:w-44" />
                  )}

                  <div className="flex flex-1 flex-col justify-between p-5">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {idx === 0 && (
                            <span className="mb-1.5 inline-block rounded-full bg-foreground px-2.5 py-0.5 text-xs font-semibold text-background">
                              Top Pick
                            </span>
                          )}
                          <h2 className="text-base font-semibold leading-snug">
                            {productName || "Recommendation"}
                          </h2>
                          {item.price_hint && (
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              {item.price_hint}
                            </p>
                          )}
                        </div>
                        {item.percent != null && (
                          <div className="shrink-0 rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold">
                            {item.percent}% match
                          </div>
                        )}
                      </div>

                      {reasons.length > 0 && (
                        <ul className="mt-3 space-y-1">
                          {reasons.map((r, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-1.5 text-xs text-muted-foreground"
                            >
                              <span className="mt-0.5 text-foreground">✓</span>
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {retailers.length > 0 ? (
                        retailers.map(([retailer, url]) => (
                          <a
                            key={retailer}
                            href={
                              productId
                                ? `/r/${encodeURIComponent(productId)}/${encodeURIComponent(retailer)}`
                                : (url as string)
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Affiliate link — we may earn a small commission at no extra cost to you"
                            className="group relative inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 text-xs font-semibold text-background transition hover:opacity-80"
                          >
                            Buy on {retailer.charAt(0).toUpperCase() + retailer.slice(1)}
                            <span aria-hidden>↗</span>
                            <span className="ml-1 rounded bg-background/20 px-1 py-0.5 text-[10px] font-medium leading-none">
                              Affiliate
                            </span>
                          </a>
                        ))
                      ) : productId ? (
                        <Link
                          href={`/products/${productId}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition hover:bg-muted"
                        >
                          View details
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>

                {item.warranty_text && (
                  <div className="border-t px-5 py-3 text-xs text-muted-foreground">
                    🛡️ {item.warranty_text}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-8 space-y-3 text-center text-xs text-muted-foreground">
        <p>
          Affiliate disclosure: we may earn a small commission if you purchase through our links — at no extra cost to you.{" "}
          <Link href="/affiliate-disclosure" className="underline underline-offset-2">
            Learn more
          </Link>
        </p>
        <p>
          <Link href="/quiz" className="underline underline-offset-2">
            Retake the quiz
          </Link>{" "}
          ·{" "}
          <Link href="/catalogue" className="underline underline-offset-2">
            Browse full catalogue
          </Link>
        </p>
      </div>
    </div>
  );
}
