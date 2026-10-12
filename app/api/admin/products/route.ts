import { NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const COLUMNS = 'کد,نام,رنگ,برند,base_price,base_dollar,in_stock';

export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const params = request.nextUrl.searchParams;
  const search = params.get("search")?.trim();
  const all = params.get("all") === "1";
  const page = Math.max(1, Number(params.get("page") ?? 1));
  const pageSize = 50;

  try {
    const supabase = createAdminClient();

    const build = () => {
      let q = supabase.from("list-lcd").select(COLUMNS, { count: "exact" });
      if (search) {
        const numericCode = /^\d+$/.test(search) ? Number(search) : null;
        q =
          numericCode === null
            ? q.ilike("نام", `%${search}%`)
            : q.or(`نام.ilike.%${search}%,کد.eq.${numericCode}`);
      }
      return q.order("کد", { ascending: true });
    };

    if (all) {
      // خروجی اکسل: همه محصولات
      const CHUNK = 1000;
      const rows: unknown[] = [];
      for (let offset = 0; ; offset += CHUNK) {
        const { data, error } = await build().range(offset, offset + CHUNK - 1);
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < CHUNK) break;
      }
      return Response.json({ products: rows, total: rows.length });
    }

    const from = (page - 1) * pageSize;
    const { data, count, error } = await build().range(from, from + pageSize - 1);
    if (error) throw error;
    return Response.json({ products: data ?? [], total: count ?? 0, page, pageSize });
  } catch (e: any) {
    console.error("[admin] products error:", e);
    return Response.json({ error: e?.message ?? "خطا" }, { status: 500 });
  }
}

// افزودن محصول جدید
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const code = String(body?.code ?? "").trim();
  const name = String(body?.name ?? "").trim();
  const brand = String(body?.brand ?? "").trim();
  const color = String(body?.color ?? "").trim();
  const price = Number(body?.price);
  const baseDollar = Number(body?.base_dollar);
  if (!code || !name || !(price > 0) || !(baseDollar > 0)) {
    return Response.json(
      { error: "کد، نام، قیمت و نرخ دلار پایه الزامی است" },
      { status: 400 },
    );
  }
  try {
    const supabase = createAdminClient();
    const codeValue = /^\d+$/.test(code) ? Number(code) : code;

    const { count, error: dupErr } = await supabase
      .from("list-lcd")
      .select("کد", { count: "exact", head: true })
      .eq("کد", codeValue);
    if (dupErr) throw dupErr;
    if ((count ?? 0) > 0) {
      return Response.json({ error: "این کد قبلاً ثبت شده است" }, { status: 409 });
    }

    const row: Record<string, unknown> = {
      "کد": codeValue,
      "نام": name,
      "برند": brand || null,
      "رنگ": color || null,
      base_price: price,
      base_dollar: baseDollar,
      in_stock: true,
    };
    let res = await supabase.from("list-lcd").insert({ ...row, "قیمت فروش": price });
    if (res.error) {
      // اگر ستون «قیمت فروش» قابل نوشتن نبود، بدون آن تلاش می‌کنیم
      res = await supabase.from("list-lcd").insert(row);
    }
    if (res.error) throw res.error;
    return Response.json({ ok: true });
  } catch (e: any) {
    console.error("[admin] add product error:", e);
    return Response.json({ error: e?.message ?? "خطا" }, { status: 500 });
  }
}

// تغییر قیمت یک محصول: قیمت امروز + نرخ دلار امروز ذخیره می‌شود،
// بعد از آن قیمت سایت خودش با نرخ آنلاین دلار تغییر می‌کند.
export async function PATCH(request: NextRequest) {
  if (!(await isAdmin())) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const code = body?.code;
  const price = Number(body?.price);
  const baseDollar = Number(body?.base_dollar);
  if ((typeof code !== "string" && typeof code !== "number") || !(price > 0) || !(baseDollar > 0)) {
    return Response.json({ error: "داده نامعتبر" }, { status: 400 });
  }
  try {
    const supabase = createAdminClient();
    let res = await supabase
      .from("list-lcd")
      .update({ base_price: price, base_dollar: baseDollar, "قیمت فروش": price })
      .eq("کد", code);
    if (res.error) {
      res = await supabase
        .from("list-lcd")
        .update({ base_price: price, base_dollar: baseDollar })
        .eq("کد", code);
    }
    if (res.error) throw res.error;
    return Response.json({ ok: true });
  } catch (e: any) {
    console.error("[admin] price error:", e);
    return Response.json({ error: e?.message ?? "خطا" }, { status: 500 });
  }
}

// حذف محصول
export async function DELETE(request: NextRequest) {
  if (!(await isAdmin())) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const code = request.nextUrl.searchParams.get("code")?.trim();
  if (!code) return Response.json({ error: "کد محصول مشخص نیست" }, { status: 400 });
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("list-lcd")
      .delete()
      .eq("کد", code)
      .select("کد");
    if (error) throw error;
    if (!data?.length) return Response.json({ error: "محصولی با این کد پیدا نشد" }, { status: 404 });
    return Response.json({ ok: true, deleted: data.length });
  } catch (e: any) {
    console.error("[admin] delete error:", e);
    return Response.json({ error: e?.message ?? "خطا" }, { status: 500 });
  }
}
