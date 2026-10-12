/**
 * تبدیل ردیف‌های اکسل به لیست {code, in_stock}
 * - ستون کد: «کد» / code / id
 * - ستون موجودی (اختیاری): «موجودی» / «موجود» / «وضعیت» / stock / in_stock
 *   مقدارهای موجود: موجود، بله، 1، true، yes، ✓، یا هر عدد بزرگ‌تر از صفر
 *   مقدارهای ناموجود: ناموجود، خیر، 0، false، no، خالی
 * - اگر ستون موجودی در فایل نبود، همه کدهای فایل «موجود» حساب می‌شوند.
 */

const CODE_HEADERS = ["کد", "کد محصول", "code", "id", "sku"];
const STOCK_HEADERS = ["موجودی", "موجود", "وضعیت", "تعداد", "stock", "in_stock", "instock", "qty", "quantity"];

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function normalizeDigits(s: string): string {
  return s.replace(/[۰-۹٠-٩]/g, (d) => {
    const i = PERSIAN_DIGITS.indexOf(d);
    return String(i >= 0 ? i : ARABIC_DIGITS.indexOf(d));
  });
}

function normalizeHeader(h: unknown): string {
  return String(h ?? "")
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function parseStockValue(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  const raw = normalizeDigits(String(value ?? ""))
    .replace(/[ي]/g, "ی")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (!raw) return false;
  if (/^(ناموجود|نا موجود|خیر|نه|no|false|n|0|-|✗|✘|×)$/.test(raw)) return false;
  if (/ناموجود|نا موجود/.test(raw)) return false;
  if (/^(موجود|بله|بلی|هست|yes|true|y|✓|✔|x)$/.test(raw)) return true;
  const n = Number(raw.replace(/,/g, ""));
  if (!Number.isNaN(n)) return n > 0;
  return /موجود/.test(raw);
}

export interface ParsedStock {
  items: { code: string; in_stock: boolean }[];
  hasStockColumn: boolean;
  skipped: number;
}

export function parseStockRows(rows: Record<string, unknown>[]): ParsedStock {
  if (!rows.length) return { items: [], hasStockColumn: false, skipped: 0 };
  const headers = Object.keys(rows[0]);
  const codeKey = headers.find((h) => CODE_HEADERS.includes(normalizeHeader(h)));
  const stockKey = headers.find((h) => STOCK_HEADERS.includes(normalizeHeader(h)));
  if (!codeKey) throw new Error("ستون «کد» در فایل پیدا نشد");

  const items: { code: string; in_stock: boolean }[] = [];
  let skipped = 0;
  for (const row of rows) {
    const code = normalizeDigits(String(row[codeKey] ?? "")).trim();
    if (!code) {
      skipped++;
      continue;
    }
    items.push({ code, in_stock: stockKey ? parseStockValue(row[stockKey]) : true });
  }
  return { items, hasStockColumn: Boolean(stockKey), skipped };
}
