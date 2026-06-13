export const dynamic = "force-dynamic";
import { redirect } from 'next/navigation'
import { db } from "@/lib/db"
import { products } from "@/lib/db/schema"

async function createProductAction(formData: FormData) {
  'use server'

  const category = String(formData.get('category'))
  const brand = String(formData.get('brand')).trim()
  const model = String(formData.get('model')).trim()
  const price_hint = String(formData.get('price_hint') || '').trim() || null
  const image_url = String(formData.get('image_url') || '').trim() || null
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

  if (!brand || !model) throw new Error('brand and model are required')

  await db.insert(products).values({
    category,
    brand,
    model,
    price_hint,
    image_url,
    warranty_text,
    affiliate_links,
    specs,
    is_active,
  })

  redirect('/admin/products')
}

export default function NewProductPage() {
  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <h1>New product</h1>

      <form action={createProductAction} style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        <label>
          Category
          <select name="category" defaultValue="smartphones" style={{ display: 'block', width: '100%', padding: 10 }}>
            <option value="smartphones">Smartphones</option>
            <option value="tvs">TVs</option>
          </select>
        </label>

        <label>
          Brand *
          <input name="brand" required style={{ display: 'block', width: '100%', padding: 10 }} />
        </label>

        <label>
          Model *
          <input name="model" required style={{ display: 'block', width: '100%', padding: 10 }} />
        </label>

        <label>
          Price hint
          <input name="price_hint" placeholder="e.g. £799" style={{ display: 'block', width: '100%', padding: 10 }} />
        </label>

        <label>
          Image URL
          <input name="image_url" placeholder="https://..." style={{ display: 'block', width: '100%', padding: 10 }} />
        </label>

        <label>
          Warranty text
          <textarea name="warranty_text" rows={3} style={{ display: 'block', width: '100%', padding: 10 }} />
        </label>

        <label>
          Affiliate links (JSON)
          <textarea
            name="affiliate_links"
            rows={5}
            defaultValue={`{}`}
            style={{ display: 'block', width: '100%', padding: 10, fontFamily: 'monospace' }}
          />
        </label>

        <label>
          Specs (JSON)
          <textarea
            name="specs"
            rows={8}
            defaultValue={`{}`}
            style={{ display: 'block', width: '100%', padding: 10, fontFamily: 'monospace' }}
          />
        </label>

        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" name="is_active" defaultChecked />
          Active
        </label>

        <button type="submit" style={{ padding: 10 }}>Create</button>
      </form>
    </div>
  )
}
