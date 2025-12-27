import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type SearchParams = {
  q?: string
  category?: 'smartphones' | 'tvs' | 'all'
  active?: 'true' | 'false' | 'all'
}

async function toggleActiveAction(formData: FormData) {
  'use server'
  const id = String(formData.get('id'))
  const next = String(formData.get('next')) === 'true'

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('products')
    .update({ is_active: next })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/products')
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const q = (sp.q ?? '').trim()
  const category = sp.category ?? 'all'
  const active = sp.active ?? 'all'

  const supabase = await createSupabaseServerClient()

  let query = supabase
    .from('products')
    .select('id, category, brand, model, is_active, updated_at')
    .order('updated_at', { ascending: false })

  if (category !== 'all') query = query.eq('category', category)
  if (active !== 'all') query = query.eq('is_active', active === 'true')
  if (q) query = query.or(`brand.ilike.%${q}%,model.ilike.%${q}%`)

  const { data: products, error } = await query

  if (error) throw new Error(error.message)

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Products</h1>
        <Link href="/admin/products/new">+ New product</Link>
      </div>

      {/* Filters */}
      <form style={{ display: 'flex', gap: 12, margin: '16px 0' }}>
        <input
          name="q"
          defaultValue={q}
          placeholder="Search brand or model…"
          style={{ padding: 10, width: 260 }}
        />

        <select name="category" defaultValue={category} style={{ padding: 10 }}>
          <option value="all">All categories</option>
          <option value="smartphones">Smartphones</option>
          <option value="tvs">TVs</option>
        </select>

        <select name="active" defaultValue={active} style={{ padding: 10 }}>
          <option value="all">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>

        <button type="submit" style={{ padding: 10 }}>Filter</button>
      </form>

      {/* Table */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.6fr 1fr 1fr 1fr', padding: 12, fontWeight: 600, background: '#f9fafb' }}>
          <div>Brand</div>
          <div>Model</div>
          <div>Category</div>
          <div>Status</div>
          <div>Actions</div>
        </div>

        {(products ?? []).map((p) => (
          <div
            key={p.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1.3fr 1.6fr 1fr 1fr 1fr',
              padding: 12,
              borderTop: '1px solid #e5e7eb',
              alignItems: 'center',
            }}
          >
            <div>{p.brand}</div>
            <div>{p.model}</div>
            <div>{p.category}</div>
            <div>{p.is_active ? 'Active' : 'Inactive'}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link href={`/admin/products/${p.id}`}>Edit</Link>

              <form action={toggleActiveAction}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="next" value={(!p.is_active).toString()} />
                <button type="submit">
                  {p.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </form>
            </div>
          </div>
        ))}

        {products?.length === 0 && (
          <div style={{ padding: 16 }}>No products found.</div>
        )}
      </div>
    </div>
  )
}
