import { NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

// تغییر وضعیت موجودی یک محصول
export async function PATCH(request: NextRequest) {
  if (!(await isAdmin())) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const code = body?.code;
  const inStock = body?.in_stock;
  if ((typeof code !== "string" && typeof code !== "number") || typeof inStock !== "boolean") {
    return Response.json({ error: "داده نامعتبر" }, { status: 400 });
  }
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("list-lcd")
      .update({ in_stock: inStock })
      .eq("کد", code);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e: any) {
    console.error("[admin] stock error:", e);
    return Response.json({ error: e?.message ?? "خطا" }, { status: 500 });
  }
}
