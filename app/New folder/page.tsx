"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  RefreshCw,
  Smartphone,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpLeft,
} from "lucide-react";
import {
  calculateFinalPrice,
  formatCurrency,
  formatPriceFA,
  convertToPersianDigits,
} from "@/lib/price-utils";
import type { LCDProduct } from "@/lib/types";

const WHATSAPP_NUMBER = "989360979989";
const FALLBACK_DOLLAR = 222000;
const PAGE_SIZE = 24;

const fetcher = (url: string) =>
  fetch(url).then(async (res) => {
    if (!res.ok) throw new Error("products");
    return res.json();
  });

function ProductCard({
  product,
  dollar,
}: {
  product: LCDProduct;
  dollar: number;
}) {
  const BALE_USERNAME = "YOUR_BALE_USERNAME";

  function roundPriceUp(price: number) {
    return Math.ceil(price / 10_000) * 10_000;
  }

  const finalPrice = calculateFinalPrice(
    Number(product.base_price),
    Number(product.base_dollar),
    dollar,
  );

  const roundPrice = roundPriceUp(finalPrice);

  const productMessage = `سلام وقت بخیر 👋

در مورد محصول زیر سوال داشتم:

📱 محصول: ${product["نام"] || "بدون نام"}
🏷 برند: ${product["برند"] || "—"}
🎨 رنگ: ${product["رنگ"] || "—"}
🔢 کد محصول: ${product["کد"] || "—"}
💰 قیمت: ${formatCurrency(roundPrice)}

لطفاً راهنمایی بفرمایید.`;

  const handleWhatsApp = () => {
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      productMessage,
    )}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const handleBale = async () => {
    try {
      await navigator.clipboard.writeText(productMessage);
    } catch {
      // اگر Clipboard در مرورگر در دسترس نبود، باز هم چت بله باز می‌شود.
    }

    window.open(
      `https://ble.ir/${BALE_USERNAME}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <article className="product-card">
      <div className="product-info">
        <div className="product-heading">
          <h3>{product["نام"] || "بدون نام"}</h3>
          <span className="product-type">LCD / عمده</span>
        </div>

        <div className="product-meta">
          <span>{product["برند"] || "—"}</span>
          <i />
          <span>{product["رنگ"] || "—"}</span>
        </div>
      </div>

      <div className="product-price">
        <span>قیمت نهایی</span>
        <strong>{formatCurrency(roundPrice)}</strong>
        <small>تومان</small>
      </div>

      <div className="product-code">
        <span>کد</span>
        <strong>{convertToPersianDigits(String(product["کد"]))}</strong>
      </div>

      <div className="product-actions">
        <button
          type="button"
          className="action-button bale-button"
          onClick={handleBale}
          aria-label="استعلام در بله"
        >
          <img src="/bale.png" alt="" />
          <span>بله</span>
        </button>

        <button
          type="button"
          className="action-button whatsapp-button"
          onClick={handleWhatsApp}
          aria-label="استعلام در واتساپ"
        >
          <img src="/whatsApp.png" alt="" />
          <span>واتساپ</span>
        </button>
      </div>
    </article>
  );
}

export default function Page() {
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");
  const [color, setColor] = useState("");
  const [sort, setSort] = useState("price");
  const [page, setPage] = useState(1);
  const params = useMemo(
    () =>
      new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(brand ? { brand } : {}),
        ...(color ? { color } : {}),
        sort,
      }).toString(),
    [page, search, brand, color, sort],
  );
  const { data, error, isLoading, mutate } = useSWR(
    `/api/products?${params}`,
    fetcher,
    { keepPreviousData: true },
  );
  const dollarQuery = useSWR("/api/dollar-rate", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000,
  });
  const dollar = dollarQuery.data?.rate || FALLBACK_DOLLAR;
  const products = (data?.products ?? []) as LCDProduct[];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = search || brand || color || sort !== "code";
  const clearFilters = () => {
    setSearch("");
    setBrand("");
    setColor("");
    setSort("code");
    setPage(1);
  };
  return (
    <main dir="rtl" className="min-h-screen bg-background">
      <header className="site-header">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="brand-mark">
              <Smartphone size={22} />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-foreground">
                پاتوق موبایل
              </h1>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                مرجع قیمت قطعات موبایل
              </p>
            </div>
          </div>
          <div className="dollar-panel">
            <span className="dollar-label">دلار امروز</span>
            <strong>
              {formatPriceFA(dollar)} <small>تومان</small>
            </strong>
            <span className="update-dot">
              <i /> {dollarQuery.error ? "نرخ پیش‌فرض" : "بروزرسانی خودکار"}
            </span>
          </div>
        </div>
      </header>
      <section className="mx-auto w-full max-w-6xl px-4 pb-10 pt-8 sm:px-6 md:pb-14 md:pt-14">
        <div className="hero-row mb-8">
          <div>
            <p className="eyebrow">MOBILE PARTS / WHOLESALE</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-5xl">
              قیمت‌نامه LCD
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
              لیست قیمت انواع LCD های موبایل
            </p>
          </div>
          <div className="last-update">
            <span>آخرین بروزرسانی</span>
            <strong>{dollarQuery.data ? "همین الان" : "نرخ پیش‌فرض"}</strong>
            <RefreshCw size={14} />
          </div>
        </div>
        <div className="search-shell">
          <Search size={20} className="text-primary" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="نام یا کد محصول را جستجو کنید..."
            aria-label="جستجو در لیست محصولات"
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
          <kbd>⌘ K</kbd>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="filter-group">
            <SlidersHorizontal size={16} className="text-muted-foreground" />
            <select
              value={brand}
              onChange={(e) => {
                setBrand(e.target.value);
                setPage(1);
              }}
              aria-label="فیلتر برند"
            >
              <option value="">همه برندها</option>
              {["Apple", "Samsung", "Xiaomi", "Oppo", "Huawei"].map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <select
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                setPage(1);
              }}
              aria-label="فیلتر رنگ"
            >
              <option value="">همه رنگ‌ها</option>
              {["مشکی", "سفید", "آبی", "طلایی", "سبز"].map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              aria-label="مرتب‌سازی"
            >
              <option value="price">مرتب‌سازی: قیمت</option>
              <option value="code">مرتب‌سازی: کد</option>
              <option value="name">مرتب‌سازی: نام</option>
            </select>
          </div>
          {hasFilters && (
            <button className="clear-button" onClick={clearFilters}>
              پاک کردن فیلترها <X size={14} />
            </button>
          )}
        </div>
        <div className="results-bar mt-8">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">
              {convertToPersianDigits(String(total))}
            </strong>{" "}
            محصول موجود
          </p>
          <p className="hidden text-xs text-muted-foreground sm:block">
            قیمت‌ها به تومان محاسبه می‌شوند
          </p>
        </div>
        {error ? (
          <div className="empty-state">
            <h3>خطا در دریافت محصولات</h3>
            <p>ارتباط با فهرست قیمت برقرار نشد.</p>
            <button onClick={() => mutate()}>تلاش دوباره</button>
          </div>
        ) : isLoading && !data ? (
          <div className="empty-state">
            <RefreshCw className="animate-spin text-primary" size={28} />
            <h3>در حال دریافت محصولات</h3>
            <p>لطفاً چند لحظه صبر کنید.</p>
          </div>
        ) : (
          <>
            <div className="product-grid mt-4">
              {products.map((product, index) => (
                <ProductCard
                  key={`${product["کد"]}-${index}`}
                  product={product}
                  dollar={dollar}
                />
              ))}
            </div>
            {!products.length && (
              <div className="empty-state">
                <Search size={28} />
                <h3>محصولی پیدا نشد</h3>
                <p>فیلترها را تغییر دهید یا جستجوی دیگری امتحان کنید.</p>
                <button onClick={clearFilters}>نمایش همه محصولات</button>
              </div>
            )}
          </>
        )}
        {total > 0 && (
          <nav
            className="mt-8 flex items-center justify-center gap-4"
            aria-label="صفحه‌بندی"
          >
            <button
              className="page-button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="صفحه قبل"
            >
              <ChevronRight size={18} />
            </button>
            <span className="text-sm text-muted-foreground">
              صفحه {convertToPersianDigits(String(page))} از{" "}
              {convertToPersianDigits(String(totalPages))}
            </span>
            <button
              className="page-button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="صفحه بعد"
            >
              <ChevronLeft size={18} />
            </button>
          </nav>
        )}
      </section>
      <div className="hidden" aria-hidden="true">
        <ArrowUpLeft />
      </div>
    </main>
  );
}
