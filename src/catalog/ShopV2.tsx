import { useMemo, useState, useSyncExternalStore } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Alert, ArrowUpDown, Button, Checkbox, Chip, EmptyState, Input, Search, Select, Sheet, SkeletonGroup, Skeleton, SlidersHorizontal, cn } from "@/ui";
import { useT, pick } from "@/lib/i18n";
import { useTitle } from "@/components/ui";
import { PAGE, useCategoryArt, useShopPage, useShopPages, type ShopFilters } from "./data";
import { CardGrid, ProductCardV2 } from "./ProductCardV2";
import { SearchBox } from "./SearchBox";
import { categoryIcon } from "./categoryIcon";
import { PAGE_X } from "./layout";

function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia(query); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia(query).matches, () => false);
}

const num = (v: string | null) => { const n = v === null || v === "" ? NaN : Number(v); return Number.isFinite(n) && n >= 0 ? n : null; };
const SORTS = ["newest", "best", "price_asc", "price_desc", "name"] as const;

function readFilters(sp: URLSearchParams): ShopFilters {
  const sort = sp.get("sort") ?? "newest";
  return { q: sp.get("q") ?? "", category: sp.get("category") ?? "", sort: (SORTS as readonly string[]).includes(sort) ? sort : "newest", min: num(sp.get("min")), max: num(sp.get("max")), stock: sp.get("stock") === "1", sale: sp.get("sale") === "1" };
}

type Apply = (o: Record<string, string>) => void;
type Cat = { id: string; slug: string; label: string };

function SortSelect({ f, apply, className }: { f: ShopFilters; apply: Apply; className?: string }) {
  const { t } = useT();
  return (
    <label className={cn("relative block", className)}>
      <span className="sr-only-text">{t("shop.sort")}</span>
      <ArrowUpDown aria-hidden size={18} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <Select value={f.sort} onChange={(e) => apply({ sort: e.target.value, page: "" })} style={{ paddingLeft: 38 }} className="rounded-md font-semibold">
        <option value="newest">{t("shop.sort.newest")}</option>
        <option value="best">{t("shop.sort.best")}</option>
        <option value="price_asc">{t("shop.sort.price_asc")}</option>
        <option value="price_desc">{t("shop.sort.price_desc")}</option>
        <option value="name">{t("shop.sort.name")}</option>
      </Select>
    </label>
  );
}

/** Price and availability. Price applies on blur or Enter so typing "1500" does not fire four queries. */
function Refine({ f, apply }: { f: ShopFilters; apply: Apply }) {
  const { t } = useT();
  const [min, setMin] = useState(f.min?.toString() ?? "");
  const [max, setMax] = useState(f.max?.toString() ?? "");
  const invalid = min !== "" && max !== "" && Number(min) > Number(max);
  const price = () => { if (!invalid) apply({ min, max, page: "" }); };
  return (
    <div className="flex flex-col gap-5">
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="mb-2 p-0 text-sm font-bold text-ink">{t("shop.price")}</legend>
        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); price(); }}>
          <Input type="number" inputMode="numeric" min={0} value={min} placeholder={t("shop.min")} aria-label={t("shop.min")} invalid={invalid} onChange={(e) => setMin(e.target.value)} onBlur={price} />
          <span aria-hidden className="text-muted">–</span>
          <Input type="number" inputMode="numeric" min={0} value={max} placeholder={t("shop.max")} aria-label={t("shop.max")} invalid={invalid} onChange={(e) => setMax(e.target.value)} onBlur={price} />
          <button type="submit" className="sr-only-text">{t("shop.apply")}</button>
        </form>
        {invalid && <p role="alert" className="m-0 mt-1 text-sm font-semibold text-danger">{t("shop.price_invalid")}</p>}
      </fieldset>
      <fieldset className="m-0 min-w-0 space-y-1 border-0 p-0 pt-1">
        <legend className="mb-1 p-0 text-sm font-bold text-ink">{t("shop.availability")}</legend>
        <Checkbox label={t("shop.in_stock")} checked={f.stock} onChange={(e) => apply({ stock: e.target.checked ? "1" : "", page: "" })} />
        <Checkbox label={t("shop.on_sale")} checked={f.sale} onChange={(e) => apply({ sale: e.target.checked ? "1" : "", page: "" })} />
      </fieldset>
    </div>
  );
}

function CategoryList({ f, apply, cats }: { f: ShopFilters; apply: Apply; cats: Cat[] }) {
  const { t } = useT();
  const item = (active: boolean) => cn("flex min-h-11 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[0.9375rem] transition-colors duration-[var(--duration-1)]",
    active ? "bg-brand-tint font-bold text-brand-strong" : "font-semibold text-ink hover-fine:hover:bg-surface-2");
  return (
    <nav aria-labelledby="f-cats">
      <h2 id="f-cats" className="m-0 mb-2 text-sm font-bold text-ink">{t("shop.category")}</h2>
      <ul className="m-0 list-none space-y-0.5 p-0">
        <li><button type="button" aria-current={!f.category || undefined} className={item(!f.category)} onClick={() => apply({ category: "", page: "" })}>{t("shop.all")}</button></li>
        {cats.map((c) => {
          const Icon = categoryIcon(c.slug);
          return (
            <li key={c.slug}>
              <button type="button" aria-current={f.category === c.slug || undefined} className={item(f.category === c.slug)} onClick={() => apply({ category: c.slug, page: "" })}>
                <Icon aria-hidden size={18} strokeWidth={1.75} className="shrink-0" /><span className="line-clamp-2">{c.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default function ShopV2() {
  const { t, locale } = useT();
  const [sp, setSp] = useSearchParams();
  const expanded = useMedia("(min-width: 840px)");
  const [sheet, setSheet] = useState(false);
  const f = useMemo(() => readFilters(sp), [sp]);
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const catsQ = useCategoryArt();
  const cats = useMemo<Cat[]>(() => (catsQ.data ?? []).map((c) => ({ id: c.id, slug: c.slug, label: pick(locale, c.name_en, c.name_ne) ?? c.name_en })), [catsQ.data, locale]);
  const current = cats.find((c) => c.slug === f.category);
  const catId = current?.id ?? null;
  const ready = !f.category || !catsQ.isLoading;
  useTitle(current?.label ?? t("shop.title"));

  const infinite = useShopPages(f, catId, ready && !expanded);
  const paged = useShopPage(f, catId, page, ready && expanded);
  const active = expanded ? paged : infinite;
  const products = expanded ? paged.data?.products ?? [] : infinite.data?.pages.flatMap((p) => p.products) ?? [];
  const count = expanded ? paged.data?.count ?? 0 : infinite.data?.pages[0]?.count ?? 0;
  const loading = !ready || active.isLoading;
  const pages = Math.max(1, Math.ceil(count / PAGE));

  const apply: Apply = (o) => {
    const n = new URLSearchParams(sp);
    Object.entries(o).forEach(([k, v]) => (v && !(k === "sort" && v === "newest") ? n.set(k, v) : n.delete(k)));
    n.delete("focus");
    setSp(n, { replace: true });
  };
  const clearAll = () => setSp(new URLSearchParams(), { replace: true });
  const chips: { key: string; label: string; clear: Record<string, string> }[] = [];
  if (f.q.trim()) chips.push({ key: "q", label: `“${f.q.trim()}”`, clear: { q: "", page: "" } });
  if (f.category && !expanded) chips.push({ key: "c", label: current?.label ?? f.category, clear: { category: "", page: "" } });
  if (f.min != null || f.max != null) chips.push({ key: "p", label: `Rs. ${f.min ?? 0} – ${f.max ?? "∞"}`, clear: { min: "", max: "", page: "" } });
  if (f.stock) chips.push({ key: "s", label: t("shop.in_stock"), clear: { stock: "", page: "" } });
  if (f.sale) chips.push({ key: "o", label: t("shop.on_sale"), clear: { sale: "", page: "" } });
  const refineCount = [f.min != null || f.max != null, f.stock, f.sale].filter(Boolean).length;
  const anyFilter = chips.length > 0 || !!f.category;

  return (
    <main className={`${PAGE_X} page-in space-y-5 py-4 md:py-6`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="m-0 text-title font-bold">{current?.label ?? t("shop.title")}</h1>
        <p role="status" aria-live="polite" className="m-0 text-sm text-muted">{loading ? t("common.loading") : t("shop.results", { n: count })}</p>
      </div>

      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-[1_1_16rem]"><SearchBox key={f.q} initial={f.q} focusOnMount={sp.get("focus") === "search"} onSubmit={(q) => apply({ q, page: "" })} /></div>
        <SortSelect f={f} apply={apply} className="min-w-0 flex-[1_1_10rem] sm:flex-none md:w-56" />
        {!expanded && (
          <Button variant="secondary" leadingIcon={SlidersHorizontal} onClick={() => setSheet(true)} aria-haspopup="dialog" className="flex-none">
            {t("shop.filters")}{refineCount ? ` (${refineCount})` : ""}
          </Button>
        )}
      </div>

      {!expanded && cats.length > 0 && (
        <ul aria-label={t("shop.category")} className="rail -mx-4 my-0 flex list-none gap-2 overflow-x-auto px-4 py-0.5 sm:-mx-6 sm:px-6">
          <li className="shrink-0"><Chip pressed={!f.category} onClick={() => apply({ category: "", page: "" })}>{t("shop.all_short")}</Chip></li>
          {cats.map((c) => <li key={c.slug} className="shrink-0"><Chip pressed={f.category === c.slug} onClick={() => apply({ category: f.category === c.slug ? "" : c.slug, page: "" })}>{c.label}</Chip></li>)}
        </ul>
      )}

      {chips.length > 0 && (
        <ul aria-label={t("shop.active_filters")} className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
          {chips.map((c) => <li key={c.key}><Chip onRemove={() => apply(c.clear)} removeLabel={t("shop.remove_filter", { name: c.label })}>{c.label}</Chip></li>)}
          <li><Button variant="ghost" size="sm" onClick={clearAll}>{t("shop.clear")}</Button></li>
        </ul>
      )}

      <div className="md:grid md:grid-cols-[14.5rem_minmax(0,1fr)] md:items-start md:gap-8">
        {expanded && (
          <aside aria-label={t("shop.filters")} className="sticky top-20 max-h-[calc(100dvh-6rem)] space-y-6 overflow-y-auto pb-4 pr-1">
            <CategoryList f={f} apply={apply} cats={cats} />
            <hr className="m-0 border-0 border-t border-line" />
            <Refine key={`${f.min}-${f.max}`} f={f} apply={apply} />
            {anyFilter && <Button variant="secondary" block size="sm" onClick={clearAll}>{t("shop.clear")}</Button>}
          </aside>
        )}
        <div className="min-w-0 space-y-5">
          {active.isError ? (
            <Alert tone="danger">
              <p className="m-0 font-semibold">{t("shop.load_error")}</p>
              <Button size="sm" variant="secondary" className="mt-2" onClick={() => void active.refetch()}>{t("common.retry")}</Button>
            </Alert>
          ) : loading ? (
            <SkeletonGroup label={t("common.loading")}><CardGrid narrow>{Array.from({ length: 8 }, (_, i) => <li key={i} className="list-none"><Skeleton variant="card" /></li>)}</CardGrid></SkeletonGroup>
          ) : products.length ? (
            <CardGrid narrow className={cn(expanded && paged.isPlaceholderData && "opacity-60 transition-opacity")}>{products.map((p, i) => <ProductCardV2 key={p.id} p={p} locale={locale} priority={i < 2} />)}</CardGrid>
          ) : (
            <EmptyState icon={Search} title={f.q.trim() ? t("shop.none_for", { q: f.q.trim() }) : t("shop.none")} description={t("shop.none.hint")}
              action={<div className="flex flex-wrap justify-center gap-2">
                {anyFilter && <Button variant="primary" onClick={clearAll}>{t("shop.clear")}</Button>}
                <Link to="/" className="inline-flex min-h-12 items-center rounded-md px-3 font-semibold text-brand-strong">{t("nav.home")}</Link>
              </div>} />
          )}

          {!expanded && infinite.hasNextPage && (
            <Button block variant="secondary" loading={infinite.isFetchingNextPage} onClick={() => void infinite.fetchNextPage()}>{t("shop.load_more")}</Button>
          )}
          {expanded && pages > 1 && (
            <nav className="flex items-center justify-center gap-3 pt-2" aria-label={t("shop.pagination")}>
              <Button variant="secondary" disabled={page <= 1} onClick={() => { apply({ page: String(page - 1) }); window.scrollTo({ top: 0 }); }}>{t("shop.prev")}</Button>
              <span className="text-sm font-semibold text-muted tabular" aria-current="page">{t("shop.page_of", { n: page, total: pages })}</span>
              <Button variant="secondary" disabled={page >= pages} onClick={() => { apply({ page: String(page + 1) }); window.scrollTo({ top: 0 }); }}>{t("shop.next")}</Button>
            </nav>
          )}
        </div>
      </div>

      <Sheet open={sheet && !expanded} onOpenChange={setSheet} title={t("shop.filters")}>
        <Refine key={`${f.min}-${f.max}`} f={f} apply={apply} />
        <div className="mt-6 flex gap-2">
          {refineCount > 0 && <Button variant="secondary" onClick={() => apply({ min: "", max: "", stock: "", sale: "", page: "" })}>{t("shop.reset")}</Button>}
          <Button block size="lg" onClick={() => setSheet(false)}>{t("shop.show_results", { n: count })}</Button>
        </div>
      </Sheet>
    </main>
  );
}
