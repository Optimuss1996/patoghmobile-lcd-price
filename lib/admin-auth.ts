import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "admin_session";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // ۳۰ روز (مرا به خاطر بسپار)

function sessionToken(): string | null {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) return null;
  return createHmac("sha256", `${username}:${password}`)
    .update("patogh-admin-session-v2")
    .digest("hex");
}

// ارقام فارسی/عربی -> انگلیسی و حذف فاصله و کوتیشن اطراف (کیبورد گوشی)
function normalizeCred(v: string): string {
  return v
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .trim();
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function checkCredentials(username: string, password: string): boolean {
  const u = process.env.ADMIN_USERNAME;
  const p = process.env.ADMIN_PASSWORD;
  if (!u || !p) return false;
  // هر دو را بررسی می‌کنیم تا زمان پاسخ چیزی لو ندهد
  const okUser = safeEqual(normalizeCred(username), normalizeCred(u));
  const okPass = safeEqual(normalizeCred(password), normalizeCred(p));
  return okUser && okPass;
}

export function createSessionToken(): string | null {
  return sessionToken();
}

export async function isAdmin(): Promise<boolean> {
  const expected = sessionToken();
  if (!expected) return false;
  const store = await cookies();
  const value = store.get(ADMIN_COOKIE)?.value;
  if (!value) return false;
  return safeEqual(value, expected);
}
