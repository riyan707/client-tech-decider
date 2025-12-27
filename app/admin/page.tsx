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
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Admin</h1>

        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/admin/products">Products</Link>
          <Link href="/admin/questions">Questions</Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginTop: 16 }}>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Total products</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{totalProducts ?? 0}</div>
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Active products</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{activeProducts ?? 0}</div>
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Submissions (7d)</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{sub7 ?? 0}</div>
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Submissions (30d)</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{sub30 ?? 0}</div>
        </div>
      </div>

      <div style={{ marginTop: 18, border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Top recommended products (last 500 submissions)</div>

        {topRecommended.length === 0 ? (
          <div style={{ color: '#6b7280' }}>No submission data yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {topRecommended.map(([name, c]) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>{name}</div>
                <div style={{ fontWeight: 700 }}>{c}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, color: '#6b7280', fontSize: 12 }}>
        Note: “Top recommended” counts occurrences inside top_3 across recent submissions.
      </div>
    </div>
  )
}
