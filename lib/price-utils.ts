/**
 * Calculate the final price based on current dollar rate
 * finalPrice = base_price * (currentDollar / base_dollar)
 */
export function calculateFinalPrice(
  basePrice: number,
  baseDollar: number,
  currentDollar: number
): number {
  if (baseDollar === 0) return basePrice
  return Math.round(basePrice * (currentDollar / baseDollar))
}

/**
 * Format price to Persian locale with thousands separator
 * e.g., 11550000 -> "۱۱,۵۵۰,۰۰۰"
 */
export function formatPriceFA(price: number): string {
  const parts = Math.floor(price)
    .toString()
    .split('')
    .reverse()
    .reduce((acc, digit, i) => {
      if (i > 0 && i % 3 === 0) acc = ',' + acc
      return digit + acc
    }, '')

  return convertToPersianDigits(parts)
}

/**
 * Convert English digits to Persian digits
 */
export function convertToPersianDigits(str: string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
  return str.replace(/\d/g, (digit) => persianDigits[parseInt(digit)])
}

/**
 * Format currency display
 */
export function formatCurrency(price: number): string {
  return `${formatPriceFA(price)} تومان`
}
