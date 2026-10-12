export interface LCDProduct {
  id?: string
  'کد': string
  'نام': string
  'رنگ': string
  'برند': string
  'قیمت فروش': number
  wholesale_price?: number
  base_price: number
  base_dollar: number
  in_stock?: boolean
}

export interface PriceListFilter {
  search: string
  brand?: string
  color?: string
  sortBy?: 'price' | 'name' | 'code'
}
