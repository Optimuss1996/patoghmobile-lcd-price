import { createClient } from '@/lib/supabase/server'
import type { LCDProduct, PriceListFilter } from './types'

export async function getProducts(
  filter?: PriceListFilter,
  limit = 50,
  offset = 0
) {
  const supabase = await createClient()

  let query = supabase.from('list-lcd').select('*', { count: 'exact' })

  // Apply search filter
  if (filter?.search) {
    const search = filter.search.toLowerCase()
    query = query.or(
      `"کد".ilike.%${search}%,"نام".ilike.%${search}%`
    )
  }

  // Apply brand filter
  if (filter?.brand) {
    query = query.eq('برند', filter.brand)
  }

  // Apply color filter
  if (filter?.color) {
    query = query.eq('رنگ', filter.color)
  }

  // Apply sorting
  if (filter?.sortBy === 'price') {
    query = query.order('base_price', { ascending: true })
  } else if (filter?.sortBy === 'name') {
    query = query.order('نام', { ascending: true })
  } else {
    query = query.order('کد', { ascending: true })
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1)

  const { data, count, error } = await query

  if (error) {
    console.error('[v0] Products fetch error:', error)
    throw error
  }

  return {
    products: (data || []) as LCDProduct[],
    total: count || 0,
  }
}

export async function getBrands() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('list-lcd')
    .select('برند', { count: 'exact' })
    .neq('برند', null)
    .order('برند', { ascending: true })

  if (error) {
    console.error('[v0] Brands fetch error:', error)
    return []
  }

  const brands = Array.from(
    new Map(data?.map((item: any) => [item.برند, item.برند])).values()
  )
  return brands as string[]
}

export async function getColors() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('list-lcd')
    .select('رنگ', { count: 'exact' })
    .neq('رنگ', null)
    .order('رنگ', { ascending: true })

  if (error) {
    console.error('[v0] Colors fetch error:', error)
    return []
  }

  const colors = Array.from(
    new Map(data?.map((item: any) => [item.رنگ, item.رنگ])).values()
  )
  return colors as string[]
}
