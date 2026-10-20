import { useMemo, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "react-router-dom";
import { Button, Checkbox, Chip, EmptyState, Field, Input, Search, Select, Sheet, SkeletonGroup, Skeleton, SlidersHorizontal } from "@/ui";
import { useT, pick } from "@/lib/i18n";
import { useTitle } from "@/components/ui";
import { PAGE, useCategoryArt, useShopPage, useShopPages, type ShopFilters } from "./data";
import { CardGrid, ProductCardV2 } from "./ProductCardV2";
import { SearchBox } from "./SearchBox";
import { PAGE_X } from "./layout";

function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia(query); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia(query).matches, () => false);
}

const num = (v: string | null) => { const n = v === null || v === "" ? NaN : Number(v); return Number.isFinite(n) && n >= 0 ? n : null; };

function readFilters(sp: URLSearchParams): ShopFilters {
  return { q: sp.get("q") ?? "", category: sp.get("category") ?? "", sort: sp.get("sort") ?? "newest", min: num(sp.get("min")), max: num(sp.get("max")), stock: sp.get("stock") === "1", sale: sp.get("sale") === "1" };
}

function Controls({ f, apply, cats }: { f: ShopFilters; apply: (o: Record<string, string>) => void; cats: { slug: string; label: string }[] }) {
  const { t } = useT();
  const [min, setMin] = useState(f.min?.toString() ?? "");
  const [max, setMax] = useState(f.max?.toString() ?? "");
  const price = () => apply({ min, max, page: "" });
  return (
    <div className="space-y-4">
      <Field label={t("shop.category")}>
        {(a) => <Select {...a} value={f.category} onChange={(e) => apply({ category: e.target.value, page: "" })}>
          <option value="">{t("shop.all")}</option>
          {cats.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
        </Select>}
      </Field>
      <Field label={t("shop.sort")}>
        {(a) => <Select {...a} value={f.sort} onChange={(e) => apply({ sort: e.target.value, page: "" })}>
          <option value="newest">{t("shop.sort.newest")}</option>
          <option value="best">{t("shop.sort.best")}</option>
          <option value="price_asc">{t("shop.sort.price_asc")}</option>
          <option value="price_desc">{t("shop.sort.price_desc")}</option>
        </Select>}
      </Field>
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="mb-1 p-0 text-sm font-semibold text-ink">{t("shop.price")}</legend>
        <div className="flex items-center gap-2">
          <Input type="number" inputMode="numeric" min={0} value={min} placeholder={t("shop.min")} aria-label={t("shop.min")} onChange={(e) => setMin(e.target.value)} onBlur={price} />
          <span aria-hidden>–</span>
          <Input type="number" inputMode="numeric" min={0} value={max} placeholder={t("shop.max")} aria-label={t("shop.max")} onChange={(e) => setMax(e.target.value)} onBlur={price} />
        </div>
      </fieldset>
      <Checkbox label={t("shop.in_stock")} checked={f.stock} onChange={(e) => apply({ stock: e.target.checked ? "1" : "", page: "" })} />
      <Checkbox label={t("shop.on_sale")} checked={f.sale} onChange={(e) => apply({ sale: e.target.checked ? "1" : "", page: "" })} />
    </div>
  );
}

export default function ShopV2() {
  const { t, locale } = useT();
  const [sp, setSp] = useSearchParams();
  useTitle(t("shop.title"));
  const expanded = useMedia("(min-width: 840px)");
  const [sheet, setSheet] = useState(false);
  const f = useMemo(() => readFilters(sp), [sp]);
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const catsQ = useCategoryArt();
  const cats = useMemo(() => (catsQ.data ?? []).map((c) => ({ id: c.id, slug: c.slug, label: pick(locale, c.name_en, c.name_ne) ?? c.name_en })), [catsQ.data, locale]);
  const catId = cats.find((c) => c.slug === f.category)?.id ?? null;
  const ready = !f.category || !catsQ.isLoading;

  const infinite = useShopPages(f, catId, ready && !expanded);
  const paged = useShopPage(f, catId, page, ready && expanded);
  const products = expanded ? paged.data?.products ?? [] : infinite.data?.pages.flatMap((p) => p.products) ?? [];
  const count = expanded ? paged.data?.count ?? 0 : infinite.data?.pages[0]?.count ?? 0;
  const loading = expanded ? paged.isLoading : infinite.isLoading;
  const pages = Math.max(1, Math.ceil(count / PAGE));

  const apply = (o: Record<string, string>) => {
    const n = new URLSearchParams(sp);
    Object.entries(o).forEach(([k, v]) => (v && !(k === "sort" && v === "newest") ? n.set(k, v) : n.delete(k)));
    setSp(n, { replace: true });
  };
  const chips: { key: string; label: string; clear: Record<string, string> }[] = [];
  if (f.q.trim()) chips.push({ key: "q", label: `“${f.q.trim()}”`, clear: { q: "", page: "" } });
  if (f.category) chips.push({ key: "c", label: cats.find((c) => c.slug === f.category)?.label ?? f.category, clear: { category: "", page: "" } });
  if (f.min != null || f.max != null) chips.push({ key: "p", label: `Rs. ${f.min ?? 0} – ${f.max ?? "∞"}`, clear: { min: "", max: "", page: "" } });
  if (f.stock) chips.push({ key: "s", label: t("shop.in_stock"), clear: { stock: "", page: "" } });
  if (f.sale) chips.push({ key: "o", label: t("shop.on_sale"), clear: { sale: "", page: "" } });

  return (
    <main className={`${PAGE_X} space-y-4 py-4`}>
      <h1 className="m-0 text-3xl font-bold">{t("shop.title")}</h1>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1"><SearchBox key={f.q} initial={f.q} onSubmit={(q) => apply({ q, page: "" })} /></div>
        {!expanded && (
          <Button variant="secondary" leadingIcon={SlidersHorizontal} onClick={() => setSheet(true)} aria-haspopup="dialog">
            {t("shop.filters")}{chips.filter((c) => c.key !== "q").length ? ` (${chips.filter((c) => c.key !== "q").length})` : ""}
          </Button>
        )}
      </div>

      {chips.length > 0 && (
        <ul aria-label={t("shop.active_filters")} className="m-0 flex list-none flex-wrap gap-2 p-0">
          {chips.map((c) => <li key={c.key}><Chip onRemove={() => apply(c.clear)} removeLabel={t("shop.remove_filter", { name: c.label })}>{c.label}</Chip></li>)}
          <li><Button variant="ghost" size="sm" onClick={() => setSp(new URLSearchParams(), { replace: true })}>{t("shop.clear")}</Button></li>
        </ul>
      )}

      <div className="md:grid md:grid-cols-[16rem_1fr] md:items-start md:gap-8">
        {expanded && <aside aria-label={t("shop.filters")} className="sticky top-20 rounded-lg border border-line bg-surface p-4"><Controls key={`${f.min}-${f.max}`} f={f} apply={apply} cats={cats} /></aside>}
        <div className="min-w-0 space-y-4">
          <p role="status" className="m-0 text-sm text-muted">{loading ? "" : t("shop.results", { n: count })}</p>
          {loading ? (
            <SkeletonGroup label={t("common.loading")}><CardGrid>{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} variant="card" />)}</CardGrid></SkeletonGroup>
          ) : products.length ? (
            <CardGrid>{products.map((p, i) => <ProductCardV2 key={p.id} p={p} locale={locale} priority={i < 2} />)}</CardGrid>
          ) : (
            <EmptyState icon={Search} title={t("shop.none")} description={t("shop.none.hint")}
              action={<Button variant="secondary" onClick={() => setSp(new URLSearchParams(), { replace: true })}>{t("shop.clear")}</Button>} />
          )}

          {!expanded && infinite.hasNextPage && (
            <Button block variant="secondary" loading={infinite.isFetchingNextPage} onClick={() => void infinite.fetchNextPage()}>{t("shop.load_more")}</Button>
          )}
          {expanded && pages > 1 && (
            <nav className="flex items-center justify-center gap-3" aria-label={t("shop.pagination")}>
              <Button variant="secondary" disabled={page <= 1} onClick={() => apply({ page: String(page - 1) })}>{t("shop.prev")}</Button>
              <span className="text-sm text-muted" aria-current="page">{page} / {pages}</span>
              <Button variant="secondary" disabled={page >= pages} onClick={() => apply({ page: String(page + 1) })}>{t("shop.next")}</Button>
            </nav>
          )}
        </div>
      </div>

      <Sheet open={sheet && !expanded} onOpenChange={setSheet} title={t("shop.filters")}>
        <Controls key={`${f.min}-${f.max}`} f={f} apply={apply} cats={cats} />
        <Button block size="lg" className="mt-5" onClick={() => setSheet(false)}>{t("shop.show_results", { n: count })}</Button>
      </Sheet>
    </main>
  );
}
