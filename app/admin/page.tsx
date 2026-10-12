"use client";

import useSWR from "swr";
import { useRef, useState } from "react";
import { Search, X, Download, Upload, LogOut, Plus, Pencil, Trash2, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { calculateFinalPrice, convertToPersianDigits, formatPriceFA } from "@/lib/price-utils";
import { parseStockRows } from "@/lib/stock-excel";
import type { LCDProduct } from "@/lib/types";

const FALLBACK_DOLLAR = 222000;
const PAGE_SIZE = 50;

class UnauthorizedError extends Error {}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (res.status === 401) throw new UnauthorizedError("unauthorized");
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "error");
  return res.json();
};

const convertDigits = (v: string) =>
  v.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

// همان گرد کردن قیمت در کارت محصولات سایت
const roundPriceUp = (price: number) => Math.ceil(price / 100_000) * 100_000;

function LoginForm({ onDone }: { onDone: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // از <form> واقعی با autocomplete استفاده شده تا مرورگر/گوشی
  // پیشنهاد «ذخیره رمز عبور» بدهد و دفعات بعد خودش پر کند.
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, remember }),
    });
    setBusy(false);
    if (res.ok) {
      // پیشنهاد ذخیره رمز در مرورگرهایی که پشتیبانی می‌کنند (کروم/اندروید)
      try {
        const PC = (window as any).PasswordCredential;
        if (remember && PC && navigator.credentials) {
          await navigator.credentials.store(new PC({ id: username, password, name: "مدیریت پاتوق موبایل" }));
        }
      } catch {
        // مهم نیست؛ ورود انجام شده است
      }
      return onDone();
    }
    setError((await res.json().catch(() => ({}))).error ?? "خطا در ورود");
  }

  return (
    <main dir="rtl" className="min-h-screen bg-background">
      <form className="login-box" onSubmit={submit} method="post" action="/admin">
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>ورود به مدیریت</h1>
        <input
          type="text"
          name="username"
          id="username"
          inputMode="numeric"
          autoComplete="username"
          value={username}
          placeholder="نام کاربری"
          onChange={(e) => setUsername(e.target.value)}
          dir="ltr"
          autoFocus
        />
        <input
          type="password"
          name="password"
          id="password"
          autoComplete="current-password"
          value={password}
          placeholder="رمز عبور"
          onChange={(e) => setPassword(e.target.value)}
          dir="ltr"
        />
        {error && <p style={{ margin: 0, color: "oklch(0.5 0.2 25)", fontSize: 12 }}>{error}</p>}
        <button type="submit" className="admin-btn primary" disabled={busy || !username || !password}>
          ورود
        </button>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            style={{ width: 16, height: 16, padding: 0 }}
          />
          ذخیره رمز عبور برای ورود بعدی
        </label>
      </form>
    </main>
  );
}

export default function AdminPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [markOthersOut, setMarkOthersOut] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", brand: "", color: "", price: "", base_dollar: "" });
  const dollarQuery = useSWR("/api/dollar-rate", fetcher, { revalidateOnFocus: false });
  const liveDollar: number | null = Number(dollarQuery.data?.rate) || null;
  const [editCode, setEditCode] = useState<string | number | null>(null);
  const [editValue, setEditValue] = useState("");

  const params = new URLSearchParams({
    page: String(page),
    ...(search.trim() ? { search: search.trim() } : {}),
  }).toString();
  const { data, error, isLoading, mutate } = useSWR(`/api/admin/products?${params}`, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  if (error instanceof UnauthorizedError) {
    return <LoginForm onDone={() => mutate()} />;
  }

  const products = (data?.products ?? []) as LCDProduct[];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function toggle(product: LCDProduct, value: boolean) {
    // نمایش فوری، بعد ذخیره
    mutate(
      (cur: any) =>
        cur && {
          ...cur,
          products: cur.products.map((p: LCDProduct) =>
            p["کد"] === product["کد"] ? { ...p, in_stock: value } : p,
          ),
        },
      { revalidate: false },
    );
    const res = await fetch("/api/admin/stock", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: product["کد"], in_stock: value }),
    });
    if (!res.ok) {
      setMessage({ type: "error", text: "ذخیره موجودی انجام نشد. دوباره تلاش کنید." });
      mutate();
    }
  }

  async function exportExcel() {
    setBusy(true);
    setMessage(null);
    try {
      const [productsRes, dollarRes, XLSX] = await Promise.all([
        fetch("/api/admin/products?all=1").then((r) => {
          if (!r.ok) throw new Error("خطا در دریافت محصولات");
          return r.json();
        }),
        fetch("/api/dollar-rate")
          .then((r) => r.json())
          .catch(() => null),
        import("xlsx"),
      ]);
      const dollar = Number(dollarRes?.rate) || FALLBACK_DOLLAR;
      const rows = (productsRes.products as LCDProduct[]).map((p) => ({
        "کد": p["کد"],
        "نام": p["نام"],
        "برند": p["برند"],
        "رنگ": p["رنگ"],
        "قیمت (تومان)": roundPriceUp(
          calculateFinalPrice(Number(p.base_price), Number(p.base_dollar), dollar),
        ),
        "موجودی": p.in_stock === false ? "ناموجود" : "موجود",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 10 }, { wch: 38 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 10 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "محصولات");
      (wb as any).Workbook = { Views: [{ RTL: true }] };
      const date = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `products-${date}.xlsx`);
      setMessage({ type: "ok", text: `${convertToPersianDigits(String(rows.length))} محصول در فایل اکسل ذخیره شد.` });
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message ?? "خروجی اکسل انجام نشد" });
    } finally {
      setBusy(false);
    }
  }

  async function importExcel(file: File) {
    setBusy(true);
    setMessage(null);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const parsed = parseStockRows(rows);
      if (!parsed.items.length) throw new Error("هیچ کدی در فایل پیدا نشد");

      const note = parsed.hasStockColumn
        ? ""
        : "\n(ستون موجودی در فایل نبود؛ همه کدهای فایل «موجود» ثبت می‌شوند.)";
      const warn = markOthersOut ? "\nمحصولاتی که در فایل نیستند «ناموجود» می‌شوند." : "";
      const ok = window.confirm(
        `${parsed.items.length} ردیف خوانده شد. موجودی محصولات بروزرسانی شود؟${note}${warn}`,
      );
      if (!ok) return;

      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: parsed.items, markOthersOut }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error ?? "ورود اطلاعات انجام نشد");

      const missing = result.notFoundCount
        ? ` | کد پیدا نشد (${convertToPersianDigits(String(result.notFoundCount))}): ${result.notFound
            .slice(0, 10)
            .join("، ")}${result.notFoundCount > 10 ? " …" : ""}`
        : "";
      setMessage({
        type: "ok",
        text: `موجود: ${convertToPersianDigits(String(result.inStock))} | ناموجود: ${convertToPersianDigits(
          String(result.outOfStock),
        )}${missing}`,
      });
      mutate();
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message ?? "ورود اکسل انجام نشد" });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function savePrice(product: LCDProduct) {
    const price = Number(convertDigits(editValue).replace(/[,\s]/g, ""));
    if (!(price > 0)) return setMessage({ type: "error", text: "قیمت معتبر وارد کنید." });
    if (!liveDollar) {
      return setMessage({
        type: "error",
        text: "نرخ آنلاین دلار الان در دسترس نیست؛ کمی بعد دوباره تلاش کنید.",
      });
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: product["کد"], price, base_dollar: liveDollar }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error ?? "تغییر قیمت انجام نشد");
      setMessage({ type: "ok", text: `قیمت «${product["نام"]}» ذخیره شد و از این به بعد با دلار آنلاین تغییر می‌کند.` });
      setEditCode(null);
      mutate();
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message ?? "تغییر قیمت انجام نشد" });
    } finally {
      setBusy(false);
    }
  }

  async function deleteProduct(product: LCDProduct) {
    if (!window.confirm(`محصول «${product["نام"]}» (کد ${product["کد"]}) برای همیشه حذف شود؟`)) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/products?code=${encodeURIComponent(String(product["کد"]))}`, {
        method: "DELETE",
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error ?? "حذف انجام نشد");
      setMessage({ type: "ok", text: `محصول «${product["نام"]}» حذف شد.` });
      mutate();
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message ?? "حذف انجام نشد" });
    } finally {
      setBusy(false);
    }
  }

  async function addProduct() {
    if (!form.base_dollar && !liveDollar) {
      return setMessage({
        type: "error",
        text: "نرخ آنلاین دلار در دسترس نیست؛ نرخ دلار پایه را دستی وارد کنید.",
      });
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: Number(form.price.replace(/,/g, "")),
          base_dollar: Number(form.base_dollar || liveDollar),
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error ?? "افزودن محصول انجام نشد");
      setMessage({ type: "ok", text: `محصول «${form.name}» اضافه شد.` });
      setForm({ code: "", name: "", brand: "", color: "", price: "", base_dollar: "" });
      setShowAdd(false);
      mutate();
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message ?? "افزودن محصول انجام نشد" });
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    mutate();
  }

  return (
    <main dir="rtl" className="min-h-screen bg-background">
      <div className="admin-wrap">
        <div className="admin-top">
          <h1>مدیریت موجودی</h1>
          <div className="admin-actions">
            <button className="admin-btn" onClick={() => setShowAdd((v) => !v)}>
              <Plus size={15} /> افزودن محصول
            </button>
            <button className="admin-btn" onClick={exportExcel} disabled={busy}>
              <Download size={15} /> خروجی اکسل محصولات
            </button>
            <button className="admin-btn primary" onClick={() => fileRef.current?.click()} disabled={busy}>
              <Upload size={15} /> ورودی اکسل موجودی
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              hidden
              onChange={(e) => e.target.files?.[0] && importExcel(e.target.files[0])}
            />
            <button className="admin-btn" onClick={logout}>
              <LogOut size={15} /> خروج
            </button>
          </div>
        </div>

        <div className="admin-panel">
          <label>
            <input
              type="checkbox"
              checked={markOthersOut}
              onChange={(e) => setMarkOthersOut(e.target.checked)}
            />
            هنگام ورود اکسل، محصولاتی که در فایل نیستند «ناموجود» شوند
          </label>
          <div style={{ color: "var(--muted-foreground)" }}>
            فایل اکسل باید ستون «کد» داشته باشد. ستون «موجودی» (موجود / ناموجود یا ۱ / ۰) اختیاری است؛
            اگر نبود، همه کدهای فایل موجود ثبت می‌شوند.
          </div>
        </div>

        {showAdd && (
          <div className="admin-panel">
            <div className="add-grid">
              <input placeholder="کد محصول *" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} inputMode="numeric" />
              <input placeholder="نام محصول *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input placeholder="برند (مثلاً Apple)" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              <input placeholder="رنگ" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
              <input placeholder="قیمت امروز (تومان) *" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} inputMode="numeric" />
              <input
                placeholder={`نرخ دلار پایه (پیش‌فرض: دلار امروز ${liveDollar ?? "—"})`}
                value={form.base_dollar}
                onChange={(e) => setForm({ ...form, base_dollar: e.target.value })}
                inputMode="numeric"
              />
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
              <button className="admin-btn primary" onClick={addProduct} disabled={busy || !form.code || !form.name || !form.price}>
                ثبت محصول
              </button>
              <span style={{ color: "var(--muted-foreground)" }}>
                قیمت را به نرخ دلار امروز وارد کنید؛ سایت بعداً خودش با تغییر دلار قیمت را بروز می‌کند. محصول جدید «موجود» ثبت می‌شود.
              </span>
            </div>
          </div>
        )}

        {message && <div className={`admin-panel ${message.type}`}>{message.text}</div>}

        <div className="search-shell">
          <Search size={20} className="text-primary" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="نام یا کد محصول را جستجو کنید..."
            aria-label="جستجو"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              aria-label="پاک کردن جستجو"
            >
              <X size={17} />
            </button>
          )}
        </div>

        {error ? (
          <div className="empty-state">
            <h3>خطا در دریافت محصولات</h3>
            <p>{(error as Error).message}</p>
            <button onClick={() => mutate()}>تلاش دوباره</button>
          </div>
        ) : (
          <div className="admin-table">
            <div className="admin-row head">
              <span>کد</span>
              <span>نام</span>
              <span className="hide-sm">برند</span>
              <span className="hide-sm">رنگ</span>
              <span className="tools-cell">قیمت / حذف</span>
              <span>موجود در فروشگاه</span>
            </div>
            {isLoading && !data && <p className="text-sm text-muted-foreground">در حال دریافت...</p>}
            {products.map((p, i) => {
              const inStock = p.in_stock !== false;
              return (
                <div className="admin-row" key={`${p["کد"]}-${i}`}>
                  <span>{convertToPersianDigits(String(p["کد"]))}</span>
                  <span className="name">{p["نام"] || "بدون نام"}</span>
                  <span className="hide-sm">{p["برند"] || "—"}</span>
                  <span className="hide-sm">{p["رنگ"] || "—"}</span>
                  <span className="tools-cell">
                    {editCode === p["کد"] ? (
                      <>
                        <input
                          className="price-input"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && savePrice(p)}
                          inputMode="numeric"
                          placeholder="قیمت امروز"
                          autoFocus
                        />
                        <button className="icon-btn ok" onClick={() => savePrice(p)} disabled={busy} aria-label="ذخیره قیمت">
                          <Check size={14} />
                        </button>
                        <button className="icon-btn" onClick={() => setEditCode(null)} aria-label="انصراف">
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <strong className="price-text">
                          {formatPriceFA(
                            roundPriceUp(
                              calculateFinalPrice(Number(p.base_price), Number(p.base_dollar), liveDollar ?? FALLBACK_DOLLAR),
                            ),
                          )}
                        </strong>
                        <button
                          className="icon-btn"
                          onClick={() => {
                            setEditCode(p["کد"]);
                            setEditValue("");
                          }}
                          aria-label="تغییر قیمت"
                        >
                          <Pencil size={14} />
                        </button>
                        <button className="icon-btn danger" onClick={() => deleteProduct(p)} disabled={busy} aria-label="حذف محصول">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </span>
                  <label className={`stock-toggle ${inStock ? "" : "out"}`}>
                    <input
                      type="checkbox"
                      checked={inStock}
                      onChange={(e) => toggle(p, e.target.checked)}
                    />
                    {inStock ? "موجود" : "ناموجود"}
                  </label>
                </div>
              );
            })}
            {!isLoading && !products.length && (
              <p className="text-sm text-muted-foreground">محصولی پیدا نشد.</p>
            )}
          </div>
        )}

        {total > 0 && (
          <nav className="mt-8 flex items-center justify-center gap-4" aria-label="صفحه‌بندی">
            <button className="page-button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="صفحه قبل">
              <ChevronRight size={18} />
            </button>
            <span className="text-sm text-muted-foreground">
              صفحه {convertToPersianDigits(String(page))} از {convertToPersianDigits(String(totalPages))}
            </span>
            <button className="page-button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label="صفحه بعد">
              <ChevronLeft size={18} />
            </button>
          </nav>
        )}
      </div>
    </main>
  );
}
