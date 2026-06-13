export const dynamic = "force-dynamic";
import Link from 'next/link'
import { db } from "@/lib/db"
import { products, quiz_submissions } from "@/lib/db/schema"
import { eq, gte, desc, count, sql } from "drizzle-orm"

export default async function AdminDashboardPage() {
  // 1) Total products
  const [totalRow] = await db
    .select({ count: count() })
    .from(products);

  // 2) Active products
  const [activeRow] = await db
    .select({ count: count() })
    .from(products)
    .where(eq(products.is_active, true));

  // 3) Submissions 7d / 30d
  const now = new Date();
  const daysAgo = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d;
  };

  const [sub7Row] = await db
    .select({ count: count() })
    .from(quiz_submissions)
    .where(gte(quiz_submissions.created_at, daysAgo(7)));

  const [sub30Row] = await db
    .select({ count: count() })
    .from(quiz_submissions)
    .where(gte(quiz_submissions.created_at, daysAgo(30)));

  // 4) Top recommended products (count)
  const recentSubs = await db
    .select({ top_3: quiz_submissions.top_3 })
    .from(quiz_submissions)
    .orderBy(desc(quiz_submissions.created_at))
    .limit(500);

  const counts = new Map<string, number>();

  for (const row of recentSubs) {
    const top3 = Array.isArray(row.top_3) ? row.top_3 as any[] : [];
    for (const item of top3) {
      const brand = item?.brand ?? '';
      const model = item?.model ?? '';
      const id = item?.id ?? '';

      const key =
        (brand && model) ? `${brand} ${model}` :
        id ? `Product ${id}` :
        'Unknown product';

      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const topRecommended = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total products" value={totalRow?.count ?? 0} sub="+0% this month" />
        <StatCard title="Active products" value={activeRow?.count ?? 0} sub="Live in catalogue" />
        <StatCard title="Submissions (7d)" value={sub7Row?.count ?? 0} sub="Last 7 days" />
        <StatCard title="Submissions (30d)" value={sub30Row?.count ?? 0} sub="Last 30 days" />
      </div>
    
      {/* Lower grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border bg-white p-5">
          <div className="mb-1 text-sm font-semibold text-neutral-900">Weekly Overview</div>
          <div className="text-xs text-neutral-500">Sales performance for this week (placeholder)</div>
    
          <div className="mt-4 flex h-64 items-center justify-center rounded-xl border border-dashed text-sm text-neutral-500">
            Chart placeholder (add Recharts later)
          </div>
        </div>
    
        <div className="rounded-2xl border bg-white p-5">
          <div className="mb-1 text-sm font-semibold text-neutral-900">Top recommended</div>
          <div className="text-xs text-neutral-500">Last 500 submissions</div>
    
          <div className="mt-4 space-y-3">
            {topRecommended.length === 0 ? (
              <div className="text-sm text-neutral-500">No submission data yet.</div>
            ) : (
              topRecommended.map(([name, c]) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm text-neutral-800">{name}</div>
                  </div>
                  <div className="rounded-lg bg-neutral-100 px-2 py-1 text-sm font-semibold text-neutral-900">
                    {c}
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="mt-4 text-xs text-neutral-400">
            Note: counts occurrences inside top_3 across recent submissions.
          </div>
        </div>
      </div>
    </div>
  );
  
  function StatCard({
    title,
    value,
    sub,
  }: {
    title: string;
    value: number;
    sub?: string;
  }) {
    return (
      <div className="rounded-2xl border bg-white p-5">
        <div className="text-xs text-neutral-500">{title}</div>
        <div className="mt-2 text-2xl font-semibold text-neutral-900">{value}</div>
        {sub ? <div className="mt-1 text-xs text-neutral-500">{sub}</div> : null}
      </div>
    );
  }
  
}
