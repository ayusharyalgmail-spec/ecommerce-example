import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "@/ui";
import { supabase } from "@/lib/supabase";
import { useT, pick } from "@/lib/i18n";
import { useQuery } from "@/lib/useQuery";
import { useCategories } from "@/lib/queries";
import { CARD_COLUMNS, ProductCard, type CardProduct } from "@/components/Product";
import { Loading, useTitle } from "@/components/ui";

const PAGE = 12;

export default function Shop() {
  const { t, locale } = useT();
  const [sp, setSp] = useSearchParams();
  useTitle(t("shop.title"));
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const sort = sp.get("sort") ?? "newest";
  const category = sp.get("category") ?? "";
  const q = sp.get("q") ?? "";
  const searchRef = useRef<HTMLInputElement>(null);
  const wantsFocus = sp.get("focus") === "search";
  useEffect(() => { if (wantsFocus) searchRef.current?.focus(); }, [wantsFocus]);

  const cats = useCategories();
  const res = useQuery(async () => {
    let query = supabase.from("products").select(CARD_COLUMNS, { count: "exact" }).eq("status", "published");
    const cat = cats.data?.find((c) => c.slug === category);
    if (category && cat) query = query.eq("category_id", cat.id);
    const term = q.trim().replace(/[%,()]/g, " ");
    if (term.length >= 2) query = query.or(`name_en.ilike.%${term}%,name_ne.ilike.%${term}%,description_en.ilike.%${term}%,description_ne.ilike.%${term}%`);
    query = sort === "price_asc" ? query.order("price_paisa") : sort === "price_desc" ? query.order("price_paisa", { ascending: false }) : query.order("published_at", { ascending: false });
    const { data, count } = await query.range((page - 1) * PAGE, page * PAGE - 1);
    return { products: (data ?? []) as CardProduct[], count: count ?? 0 };
  }, [category, q, sort, page, cats.data]);

  const pages = Math.max(1, Math.ceil((res.data?.count ?? 0) / PAGE));
  const go = (over: Record<string, string>) => { const n = new URLSearchParams(sp); Object.entries(over).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); setSp(n); };

  return (
    <main className="container-page space-y-4">
      <h1 className="text-3xl font-bold">{t("shop.title")}</h1>
      <form className="grid gap-2 sm:grid-cols-[1fr_auto_auto]" role="search" onSubmit={(e) => e.preventDefault()}>
        <input ref={searchRef} defaultValue={q} key={q} placeholder={t("shop.search")} aria-label={t("shop.search")}
          onKeyDown={(e) => { if (e.key === "Enter") go({ q: e.currentTarget.value, page: "" }); }}
          onBlur={(e) => { if (e.target.value !== q) go({ q: e.target.value, page: "" }); }} />
        <select value={category} onChange={(e) => go({ category: e.target.value, page: "" })} aria-label={t("nav.shop")}>
          <option value="">{t("shop.all")}</option>
          {cats.data?.map((c) => <option key={c.id} value={c.slug}>{pick(locale, c.name_en, c.name_ne)}</option>)}
        </select>
        <select value={sort} onChange={(e) => go({ sort: e.target.value, page: "" })} aria-label={t("shop.sort")}>
          <option value="newest">{t("shop.sort.newest")}</option>
          <option value="price_asc">{t("shop.sort.price_asc")}</option>
          <option value="price_desc">{t("shop.sort.price_desc")}</option>
        </select>
      </form>

      {res.loading && !res.data ? <Loading /> : res.data?.products.length ? (
        <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 md:grid-cols-3 lg:grid-cols-4">
          {res.data.products.map((p) => <ProductCard key={p.id} p={p} locale={locale} />)}
        </ul>
      ) : (
        <div className="py-16 text-center">
          <Search aria-hidden size={40} strokeWidth={1.5} className="mx-auto" />
          <p className="mt-2 font-medium">{t("shop.none")}</p>
          <p className="muted">{t("shop.none.hint")}</p>
          <Link to="/shop" className="btn btn-secondary mt-4">{t("shop.clear")}</Link>
        </div>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-3" aria-label="Pagination">
          {page > 1 && <button className="btn btn-secondary" onClick={() => go({ page: String(page - 1) })}>{t("shop.prev")}</button>}
          <span className="muted text-sm">{page} / {pages}</span>
          {page < pages && <button className="btn btn-secondary" onClick={() => go({ page: String(page + 1) })}>{t("shop.next")}</button>}
        </nav>
      )}
    </main>
  );
}
