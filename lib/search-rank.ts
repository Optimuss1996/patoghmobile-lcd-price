import type { LCDProduct } from "./types";

function normalizeName(name: unknown): string {
  return String(name ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Price used only for ordering: same as the final price shown on the card (up to a constant). */
function orderingPrice(p: LCDProduct): number {
  const base = Number(p.base_price) || 0;
  const dollar = Number(p.base_dollar) || 0;
  return dollar > 0 ? base / dollar : base;
}

/**
 * Search relevance order:
 * 1) shortest product name first (so "iphone 13" comes before "iphone 13 pro"
 *    and "iphone 13 pro max")
 * 2) for names with the same length, the highest price first
 */
export function rankBySearch<T extends LCDProduct>(products: T[]): T[] {
  return [...products].sort((a, b) => {
    const lenDiff = normalizeName(a["نام"]).length - normalizeName(b["نام"]).length;
    if (lenDiff !== 0) return lenDiff;
    return orderingPrice(b) - orderingPrice(a);
  });
}
