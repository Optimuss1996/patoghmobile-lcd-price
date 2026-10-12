import { NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

type Item = { code: string | number; in_stock: boolean };

const CHUNK = 200;

// ورودی اکسل موجودی: لیست کد + وضعیت
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const items: Item[] = Array.isArray(body?.items) ? body.items : [];
  const markOthersOut = body?.markOthersOut === true;
  if (!items.length) {
    return Response.json({ error: "فایل خالی است یا کدی پیدا نشد" }, { status: 400 });
  }

  // اگر یک کد چند بار آمده بود، آخرین مقدار معتبر است
  const state = new Map<string, boolean>();
  for (const it of items) {
    if (it == null || it.code === "" || it.code == null) continue;
    state.set(String(it.code).trim(), Boolean(it.in_stock));
  }
  const inCodes = [...state].filter(([, v]) => v).map(([k]) => k);
  const outCodes = [...state].filter(([, v]) => !v).map(([k]) => k);

  try {
    const supabase = createAdminClient();
    const found = new Set<string>();

    if (markOthersOut) {
      const { error } = await supabase
        .from("list-lcd")
        .update({ in_stock: false })
        .not("کد", "is", null);
      if (error) throw error;
    }

    const apply = async (codes: string[], value: boolean) => {
      for (let i = 0; i < codes.length; i += CHUNK) {
        const part = codes.slice(i, i + CHUNK);
        const { data, error } = await supabase
          .from("list-lcd")
          .update({ in_stock: value })
          .in("کد", part)
          .select("کد");
        if (error) throw error;
        for (const row of data ?? []) found.add(String((row as any)["کد"]));
      }
    };
    await apply(inCodes, true);
    await apply(outCodes, false);

    const notFound = [...state.keys()].filter((c) => !found.has(c));
    return Response.json({
      ok: true,
      inStock: inCodes.length,
      outOfStock: outCodes.length,
      matched: found.size,
      notFound: notFound.slice(0, 50),
      notFoundCount: notFound.length,
    });
  } catch (e: any) {
    console.error("[admin] import error:", e);
    return Response.json({ error: e?.message ?? "خطا" }, { status: 500 });
  }
}
