import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, ArrowUpDown, Badge, Button, buttonStyles, EmptyState, ImageOff, Input, Package, Plus, Popover, Search, Select, Skeleton, SkeletonGroup, Switch, cn, toast } from "@/ui";
import { supabase, imageUrl } from "@/lib/supabase";
import { useT, pick } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { formatNpr } from "@/lib/money";
import { adjustStock, setProductStatus } from "@/lib/api";
import { useTitle } from "@/components/ui";

type Row = {
  id: string; name_en: string; name_ne: string | null; sku: string | null; status: "published" | "draft" | "archived"; category_id: string | null;
  price_paisa: number; discount_price_paisa: number | null; stock_quantity: number; reserved_quantity: number; low_stock_threshold: number;
  product_images: { storage_path: string; is_primary: boolean; sort_order: number }[];
};
const VIEWS = ["all", "published", "draft", "archived", "low"] as const;
type View = (typeof VIEWS)[number];
const SORTS = ["newest", "name", "price", "stock"] as const;

const avail = (p: Row) => p.stock_quantity - p.reserved_quantity;
const isLow = (p: Row) => p.status !== "archived" && avail(p) < p.low_stock_threshold;
const thumb = (p: Row) => imageUrl([...p.product_images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0]?.storage_path);

function Thumb({ p, size = "size-12" }: { p: Row; size?: string }) {
  const src = thumb(p);
  return (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-sm bg-well text-muted", size)}>
      {src ? <img src={src} alt="" width={56} height={56} loading="lazy" className="size-full object-cover" /> : <ImageOff aria-hidden size={18} strokeWidth={1.5} />}
    </span>
  );
}

/** Stock figure, a status badge (icon plus words), and a small popover to adjust stock through the adjust_stock RPC. */
function Stock({ p, onDone, canManage }: { p: Row; onDone: () => void; canManage: boolean }) {
  const { t } = useT();
  const [d, setD] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const a = avail(p);
  const save = async () => {
    setBusy(true); const e = await adjustStock(p.id, Number(d), ""); setBusy(false);
    if (e) toast.error(t(`err.${e}`)); else { setD(""); setOpen(false); toast.success(t("products.stock_saved", { name: p.name_en })); onDone(); }
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="min-w-10 font-bold tabular">{a}</span>
      {a <= 0 ? <Badge tone="danger">{t("product.out")}</Badge> : isLow(p) ? <Badge tone="warning">{t("admin.low_stock")}</Badge> : null}
      {p.reserved_quantity > 0 && <span className="text-xs text-muted">{t("products.reserved", { n: p.reserved_quantity })}</span>}
      {canManage && (
        <Popover open={open} onOpenChange={setOpen} align="start" className="w-72"
          trigger={<button type="button" className="min-h-9 rounded-sm px-2 text-sm font-semibold text-ink underline decoration-line-strong underline-offset-4 hover-fine:hover:decoration-ink">{t("products.adjust")}</button>}>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (Number(d)) void save(); }}>
            <label className="block text-sm font-semibold" htmlFor={`adj-${p.id}`}>{t("admin.adjust")}</label>
            <p className="m-0 text-sm text-muted">{t("products.adjust_hint")}</p>
            <div className="flex gap-2">
              <Input id={`adj-${p.id}`} type="number" inputMode="numeric" placeholder="+10 / -2" value={d} onChange={(e) => setD(e.target.value)} />
              <Button type="submit" loading={busy} disabled={!Number(d)}>{t("admin.save")}</Button>
            </div>
          </form>
        </Popover>
      )}
    </div>
  );
}

function Price({ p }: { p: Row }) {
  const sale = p.discount_price_paisa != null && p.discount_price_paisa < p.price_paisa;
  return (
    <span className="whitespace-nowrap tabular">
      <span className="font-semibold">{formatNpr(sale ? p.discount_price_paisa! : p.price_paisa)}</span>
      {sale && <s className="ml-1.5 text-xs text-muted">{formatNpr(p.price_paisa)}</s>}
    </span>
  );
}

export default function ProductsV2() {
  const { t, locale } = useT();
  const qc = useQueryClient();
  const { perms } = useAuth();
  const canManage = perms.has("products.manage");
  useTitle(t("admin.products"));
  const [sp, setSp] = useSearchParams();
  const view: View = sp.get("stock") === "low" ? "low" : (VIEWS as readonly string[]).includes(sp.get("view") ?? "") ? (sp.get("view") as View) : "all";
  const sort = (SORTS as readonly string[]).includes(sp.get("sort") ?? "") ? (sp.get("sort") as (typeof SORTS)[number]) : "newest";
  const [term, setTerm] = useState(sp.get("q") ?? "");
  const [cat, setCat] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const setParam = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); if (k === "view") n.delete("stock"); setSp(n, { replace: true }); };

  const q = useQuery({
    queryKey: ["admin", "products"], staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("products")
        .select("id,name_en,name_ne,sku,status,category_id,price_paisa,discount_price_paisa,stock_quantity,reserved_quantity,low_stock_threshold,product_images(storage_path,is_primary,sort_order)")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
  });
  const cats = useQuery({
    queryKey: ["admin", "categories-lite"], staleTime: 60_000,
    queryFn: async () => (await supabase.from("categories").select("id,name_en,name_ne").order("sort_order")).data ?? [],
  }).data ?? [];
  const catName = new Map(cats.map((c) => [c.id, pick(locale, c.name_en, c.name_ne) ?? c.name_en]));

  const all = q.data ?? [];
  const counts: Record<View, number> = { all: all.length, published: 0, draft: 0, archived: 0, low: 0 };
  all.forEach((p) => { counts[p.status]++; if (isLow(p)) counts.low++; });
  const rows = (() => {
    const s = term.trim().toLowerCase();
    const list = all.filter((p) => (view === "all" || (view === "low" ? isLow(p) : p.status === view)) && (!cat || p.category_id === cat)
      && (!s || `${p.name_en} ${p.name_ne ?? ""} ${p.sku ?? ""}`.toLowerCase().includes(s)));
    if (sort === "name") return [...list].sort((a, b) => a.name_en.localeCompare(b.name_en));
    if (sort === "price") return [...list].sort((a, b) => a.price_paisa - b.price_paisa);
    if (sort === "stock") return [...list].sort((a, b) => avail(a) - avail(b));
    return list;
  })();
  const reload = () => void qc.invalidateQueries({ queryKey: ["admin", "products"] });

  const toggle = async (p: Row) => {
    const next = p.status === "published" ? "draft" : "published";
    setBusyId(p.id);
    const e = await setProductStatus(p.id, next);
    setBusyId(null);
    if (e) toast.error(t("products.status_error"));
    else { toast.success(next === "published" ? t("products.now_live", { name: p.name_en }) : t("products.now_hidden", { name: p.name_en })); reload(); }
  };

  return (
    <main className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-title font-bold">{t("admin.products")}</h1>
          <p className="m-0 text-sm text-muted">{q.isLoading ? t("common.loading") : t("products.count", { n: counts.all, live: counts.published })}</p>
        </div>
        {canManage && <Link to="/admin/products/new" className={buttonStyles({ variant: "primary" })}><Plus aria-hidden size={18} strokeWidth={2.25} />{t("admin.new_product")}</Link>}
      </header>

      <div className="space-y-3 rounded-lg border border-line bg-surface p-3 shadow-[var(--e1)] sm:p-4">
        <ul aria-label={t("products.views")} className="rail -mx-1 my-0 flex list-none gap-1 overflow-x-auto p-1">
          {VIEWS.map((v) => (
            <li key={v} className="shrink-0">
              <button type="button" aria-pressed={view === v} onClick={() => setParam(v === "low" ? "stock" : "view", v === "all" ? "" : v === "low" ? "low" : v)}
                className={cn("inline-flex min-h-10 items-center gap-2 rounded-sm px-3 text-sm font-semibold transition-colors",
                  view === v ? "bg-ink text-[var(--surface)]" : "text-ink hover-fine:hover:bg-surface-2")}>
                {t(`products.view.${v}`)}
                <span className={cn("rounded-pill px-1.5 text-xs tabular", view === v ? "bg-[color-mix(in_oklab,var(--surface)_18%,transparent)]" : "bg-surface-2 text-muted")}>{counts[v]}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_11rem]">
          <label className="relative block">
            <span className="sr-only-text">{t("admin.products.search")}</span>
            <Search aria-hidden size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder={t("admin.products.search")} className="pl-10" />
          </label>
          <label className="block"><span className="sr-only-text">{t("admin.category")}</span>
            <Select value={cat} onChange={(e) => setCat(e.target.value)}><option value="">{t("shop.all")}</option>{cats.map((c) => <option key={c.id} value={c.id}>{catName.get(c.id)}</option>)}</Select>
          </label>
          <label className="relative block"><span className="sr-only-text">{t("shop.sort")}</span>
            <ArrowUpDown aria-hidden size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Select value={sort} onChange={(e) => setParam("sort", e.target.value === "newest" ? "" : e.target.value)} className="pl-9">
              {SORTS.map((s) => <option key={s} value={s}>{t(`products.sort.${s}`)}</option>)}
            </Select>
          </label>
        </div>
      </div>

      {q.isError ? (
        <Alert tone="danger"><p className="m-0 font-semibold">{t("products.load_error")}</p><Button size="sm" variant="secondary" className="mt-2" onClick={() => void q.refetch()}>{t("common.retry")}</Button></Alert>
      ) : q.isLoading ? (
        <SkeletonGroup label={t("common.loading")} className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="row" />)}</SkeletonGroup>
      ) : !rows.length ? (
        <EmptyState icon={Package} title={all.length ? t("admin.products.empty") : t("products.none_yet")} description={all.length ? t("products.empty_hint") : t("products.none_yet_hint")}
          action={canManage && !all.length ? <Link to="/admin/products/new" className={buttonStyles({ variant: "primary" })}>{t("admin.new_product")}</Link> : undefined} />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-line bg-surface shadow-[var(--e1)] lg:block">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only-text">{t("admin.products")}</caption>
              <thead className="bg-surface-2 text-xs font-semibold text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3">{t("products.col.product")}</th>
                  <th scope="col" className="px-4 py-3">{t("admin.category")}</th>
                  <th scope="col" className="px-4 py-3">{t("products.col.price")}</th>
                  <th scope="col" className="px-4 py-3">{t("admin.stock")}</th>
                  <th scope="col" className="px-4 py-3">{t("products.col.live")}</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only-text">{t("admin.edit")}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {rows.map((p) => (
                  <tr key={p.id} className="transition-colors hover-fine:hover:bg-[color-mix(in_oklab,var(--surface-2)_50%,transparent)]">
                    <th scope="row" className="px-4 py-3 font-normal">
                      <span className="flex items-center gap-3">
                        <Thumb p={p} />
                        <span className="min-w-0">
                          <span className="block max-w-[22rem] truncate font-semibold text-ink">{pick(locale, p.name_en, p.name_ne)}</span>
                          <span className="block text-xs text-muted">{p.sku ?? t("products.no_sku")}</span>
                        </span>
                      </span>
                    </th>
                    <td className="px-4 py-3 text-muted">{p.category_id ? catName.get(p.category_id) ?? "–" : "–"}</td>
                    <td className="px-4 py-3"><Price p={p} /></td>
                    <td className="px-4 py-3"><Stock p={p} onDone={reload} canManage={canManage} /></td>
                    <td className="px-4 py-3">
                      {p.status === "archived" ? <Badge tone="danger">{t("products.view.archived")}</Badge> : canManage ? (
                        <Switch className="min-h-10 w-36" checked={p.status === "published"} disabled={busyId === p.id} onCheckedChange={() => void toggle(p)}
                          label={<span className="text-sm">{p.status === "published" ? t("products.view.published") : t("products.view.draft")}</span>} />
                      ) : <Badge tone={p.status === "published" ? "success" : "warning"}>{t(`products.view.${p.status}`)}</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canManage && <Link to={`/admin/products/${p.id}`} className={buttonStyles({ variant: "secondary", size: "sm" })}>{t("admin.edit")}</Link>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="m-0 grid list-none gap-2 p-0 md:grid-cols-2 lg:hidden">
            {rows.map((p) => (
              <li key={p.id} className="rounded-lg border border-line bg-surface p-3 shadow-[var(--e1)]">
                <div className="flex gap-3">
                  <Thumb p={p} size="size-16" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      {canManage ? <Link to={`/admin/products/${p.id}`} className="line-clamp-2 font-semibold text-ink no-underline">{pick(locale, p.name_en, p.name_ne)}</Link>
                        : <span className="line-clamp-2 font-semibold">{pick(locale, p.name_en, p.name_ne)}</span>}
                      <Badge tone={p.status === "published" ? "success" : p.status === "draft" ? "warning" : "danger"}>{t(`products.view.${p.status}`)}</Badge>
                    </div>
                    <p className="m-0 text-sm"><Price p={p} /> <span className="text-muted">{p.category_id ? catName.get(p.category_id) : ""}</span></p>
                    <Stock p={p} onDone={reload} canManage={canManage} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
