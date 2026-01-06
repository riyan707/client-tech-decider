import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type ProductCountRow = { count: number | null }
type SubmissionCountRow = { count: number | null }

type SubmissionRow = {
  top_3: Array<{
    id?: string
    brand?: string
    model?: string
  }> | any
}

function safeCount(row: ProductCountRow | SubmissionCountRow | null) {
  return row?.count ?? 0
}

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient()

  // 1) Total products
  const { count: totalProducts, error: e1 } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
  if (e1) throw new Error(e1.message)

  // 2) Active products
  const { count: activeProducts, error: e2 } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
  if (e2) throw new Error(e2.message)

  // 3) Submissions 7d / 30d
  const now = new Date()
  const daysAgo = (n: number) => {
    const d = new Date(now)
    d.setDate(d.getDate() - n)
    return d.toISOString()
  }

  const { count: sub7, error: e3 } = await supabase
    .from('quiz_submissions')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', daysAgo(7))
  if (e3) throw new Error(e3.message)

  const { count: sub30, error: e4 } = await supabase
    .from('quiz_submissions')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', daysAgo(30))
  if (e4) throw new Error(e4.message)

  // 4) Top recommended products (count)
  // We’ll read recent submissions and count occurrences inside top_3.
  // MVP: last 500 submissions.
  const { data: recentSubs, error: e5 } = await supabase
    .from('quiz_submissions')
    .select('top_3')
    .order('created_at', { ascending: false })
    .limit(500)
  if (e5) throw new Error(e5.message)

  const counts = new Map<string, number>()

  for (const row of (recentSubs ?? []) as SubmissionRow[]) {
    const top3 = Array.isArray(row.top_3) ? row.top_3 : []
    for (const item of top3) {
      // Try to build a stable display key even if structure differs
      const brand = item?.brand ?? ''
      const model = item?.model ?? ''
      const id = item?.id ?? ''

      const key =
        (brand && model) ? `${brand} ${model}` :
        id ? `Product ${id}` :
        'Unknown product'

      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }

  const topRecommended = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

    return (
    <div className="space-y-6">
      {/* Top stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total products" value={totalProducts ?? 0} sub="+0% this month" />
        <StatCard title="Active products" value={activeProducts ?? 0} sub="Live in catalogue" />
        <StatCard title="Submissions (7d)" value={sub7 ?? 0} sub="Last 7 days" />
        <StatCard title="Submissions (30d)" value={sub30 ?? 0} sub="Last 30 days" />
      </div>
    
      {/* Lower grid like the screenshot (left chart area placeholder, right activity list) */}
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
