import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ productId: string; retailer: string }> }
) {
  const { productId, retailer } = await params

  // Server client without cookies is fine here (public route)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get() { return null },
        set() {},
        remove() {},
      },
    }
  )

  // Fetch product + affiliate link
  const { data: product, error } = await supabase
    .from('products')
    .select('id, category, affiliate_links')
    .eq('id', productId)
    .single()

  if (error || !product) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  const links = product.affiliate_links || {}

  // Support object-map style: { "amazon": "https://..." }
  const url = typeof links === 'object' && !Array.isArray(links) ? links[retailer] : null

  if (!url || typeof url !== 'string') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Log click (don’t block redirect if logging fails)
  await supabase.from('affiliate_clicks').insert({
    product_id: product.id,
    category: product.category,
    retailer,
    url,
  })

  return NextResponse.redirect(url, { status: 302 })
}
