import { createClient } from "@supabase/supabase-js";

/**
 * فقط در سمت سرور (API های مدیریت) استفاده شود.
 * کلید SUPABASE_SERVICE_ROLE_KEY هرگز نباید با NEXT_PUBLIC_ شروع شود.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY تنظیم نشده است");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
