import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

async function updateProductAction(formData: FormData) {
  'use server'

  const id = String(formData.get('id'))
  const category = String(formData.get('category'))
  const brand = String(formData.get('brand')).trim()
  const model = String(formData.get('model')).trim()
  const price_hint = String(formData.get('price_hint') || '').trim() || null
  const warranty_text = String(formData.get('warranty_text') || '').trim() || null
  const is_active = String(formData.get('is_active')) === 'on'

  const affiliate_links_raw = String(formData.get('affiliate_links') || '{}')
  const specs_raw = String(formData.get('specs') || '{}')

  let affiliate_links: any
  let specs: any

  try {
    affiliate_links = JSON.parse(affiliate_links_raw)
  } catch {
    throw new Error('affiliate_links must be valid JSON')
  }

  try {
    specs = JSON.parse(specs_raw)
  } catch {
    throw new Error('specs must be valid JSON')
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('products')
    .update({
      category,
      brand,
      model,
      price_hint,
      warranty_text,
      affiliate_links,
      specs,
      is_active,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  redirect('/admin/products')
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  if (!product) throw new Error('Product not found')

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <h1>Edit product</h1>

      <form action={updateProductAction} style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        <input type="hidden" name="id" value={product.id} />

        <label>
          Category
          <select name="category" defaultValue={product.category} style={{ display: 'block', width: '100%', padding: 10 }}>
            <option value="smartphones">Smartphones</option>
            <option value="tvs">TVs</option>
          </select>
        </label>

        <label>
          Brand *
          <input name="brand" required defaultValue={product.brand} style={{ display: 'block', width: '100%', padding: 10 }} />
        </label>

        <label>
          Model *
          <input name="model" required defaultValue={product.model} style={{ display: 'block', width: '100%', padding: 10 }} />
        </label>

        <label>
          Price hint
          <input name="price_hint" defaultValue={product.price_hint ?? ''} style={{ display: 'block', width: '100%', padding: 10 }} />
        </label>

        <label>
          Warranty text
          <textarea name="warranty_text" rows={3} defaultValue={product.warranty_text ?? ''} style={{ display: 'block', width: '100%', padding: 10 }} />
        </label>

        <label>
          Affiliate links (JSON)
          <textarea
            name="affiliate_links"
            rows={5}
            defaultValue={JSON.stringify(product.affiliate_links ?? {}, null, 2)}
            style={{ display: 'block', width: '100%', padding: 10, fontFamily: 'monospace' }}
          />
        </label>

        <label>
          Specs (JSON)
          <textarea
            name="specs"
            rows={8}
            defaultValue={JSON.stringify(product.specs ?? {}, null, 2)}
            style={{ display: 'block', width: '100%', padding: 10, fontFamily: 'monospace' }}
          />
        </label>

        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" name="is_active" defaultChecked={product.is_active} />
          Active
        </label>

        <button type="submit" style={{ padding: 10 }}>Save changes</button>
      </form>
    </div>
  )
}
