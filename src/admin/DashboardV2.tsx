import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Alert, Badge, Button, buttonStyles, Megaphone, ChevronRight, CircleCheck, ClipboardList, ExternalLink, ImageOff, Package, Plus, Receipt,
  SegmentedControl, Skeleton, SkeletonGroup, Star, Tag, TrendingDown, TrendingUp, TriangleAlert, Wallet, cn, type LucideIcon,
} from "@/ui";
import { supabase, imageUrl } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useT, dateLocale, pick } from "@/lib/i18n";
import { formatNpr } from "@/lib/money";
import { listBalances, percentChange } from "@/lib/ledger";
import { useTitle } from "@/components/ui";
import { BarList, SalesChart, type Point } from "./charts";

const DAY = 864e5;
type Period = "7" | "30" | "90";
const CLOSED = ["cancelled", "rejected"];

type Order = { id: string; order_number: string; customer_name: string; status: string; payment_status: string; total_paisa: number; placed_at: string };
type Item = { product_id: string | null; name_en: string; name_ne: string | null; image_path: string | null; quantity: number; line_total_paisa: number; orders: { status: string; placed_at: string } };
type Prod = { id: string; name_en: string; name_ne: string | null; status: string; category_id: string | null; stock_quantity: number; reserved_quantity: number; low_stock_threshold: number; product_images: { storage_path: string; is_primary: boolean; sort_order: number }[] };

const statusTone = (s: string) => (s === "delivered" ? "success" : CLOSED.includes(s) ? "danger" : s === "pending_confirmation" ? "warning" : "info") as "success" | "danger" | "warning" | "info";
const thumb = (p: Prod) => [...p.product_images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0]?.storage_path ?? null;

/** Everything on the dashboard comes from these reads; RLS limits them to staff, and nothing is estimated or invented. */
function useDashboard(period: Period, canMoney: boolean) {
  return useQuery({
    queryKey: ["admin", "dashboard", period, canMoney], staleTime: 30_000, placeholderData: (prev) => prev,
    queryFn: async () => {
      const days = Number(period);
      const now = Date.now(); // one clock reading per fetch, so every figure on screen shares the same "now"
      const since = new Date(now - 2 * days * DAY).toISOString(); // current + previous period for comparisons
      const [orders, items, prods, cats, reviews, balances] = await Promise.all([
        supabase.from("orders").select("id,order_number,customer_name,status,payment_status,total_paisa,placed_at").gte("placed_at", since).order("placed_at", { ascending: false }).limit(2000),
        supabase.from("order_items").select("product_id,name_en,name_ne,image_path,quantity,line_total_paisa,orders!inner(status,placed_at)").gte("orders.placed_at", new Date(now - days * DAY).toISOString()).limit(5000),
        supabase.from("products").select("id,name_en,name_ne,status,category_id,stock_quantity,reserved_quantity,low_stock_threshold,product_images(storage_path,is_primary,sort_order)").neq("status", "archived"),
        supabase.from("categories").select("id,name_en,name_ne"),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
        canMoney ? listBalances().then((b) => ({ ok: true as const, b }), () => ({ ok: false as const, b: [] })) : Promise.resolve(null),
      ]);
      for (const r of [orders, items, prods]) if (r.error) throw new Error(r.error.message);
      return {
        now,
        orders: (orders.data ?? []) as Order[], items: (items.data ?? []) as unknown as Item[], products: (prods.data ?? []) as Prod[],
        categories: cats.data ?? [], reviews: reviews.count ?? 0,
        dues: balances && balances.ok ? balances.b.reduce((n, c) => n + Math.max(0, c.balance_paisa), 0) : null,
        duesCount: balances && balances.ok ? balances.b.filter((c) => c.balance_paisa > 0).length : 0,
      };
    },
  });
}

function greetingKey() {
  const h = new Date().getHours();
  return h < 12 ? "dash.morning" : h < 17 ? "dash.afternoon" : "dash.evening";
}

/** Metric tile: icon on a soft tint, the figure, a short label and (only with a real baseline) the change. Links to the filtered view. */
function Metric({ to, icon: Icon, tint, label, value, change, hint }: {
  to: string; icon: LucideIcon; tint: string; label: string; value: string; change?: number | null; hint?: string;
}) {
  const { t } = useT();
  const up = (change ?? 0) >= 0;
  return (
    <Link to={to} className="group flex min-w-0 flex-col gap-3 rounded-lg border border-line bg-surface p-4 text-ink no-underline shadow-[var(--e1)] transition-[box-shadow,transform] duration-[var(--duration-2)] hover-fine:hover:-translate-y-0.5 hover-fine:hover:shadow-[var(--e2)] sm:p-5">
      <span className="flex items-center justify-between">
        <span className={cn("flex size-10 items-center justify-center rounded-md text-ink", tint)}><Icon aria-hidden size={20} strokeWidth={1.9} /></span>
        <ChevronRight aria-hidden size={18} className="text-muted transition-transform duration-[var(--duration-2)] group-hover:translate-x-0.5" />
      </span>
      <span>
        <span className="block truncate text-[1.625rem] font-bold leading-tight tabular sm:text-metric">{value}</span>
        <span className="block text-sm font-semibold text-muted">{label}</span>
      </span>
      {change != null ? (
        <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", up ? "text-success" : "text-danger")}>
          {up ? <TrendingUp aria-hidden size={14} /> : <TrendingDown aria-hidden size={14} />}{up ? "+" : ""}{change}% <span className="font-normal text-muted">{t("dash.vs_prev")}</span>
        </span>
      ) : hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </Link>
  );
}

function Panel({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={cn("min-w-0 rounded-lg border border-line bg-surface p-4 shadow-[var(--e1)] sm:p-5", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={id} className="m-0 text-base font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function SeeAll({ to, label }: { to: string; label: string }) {
  return <Link to={to} className="inline-flex min-h-10 items-center gap-1 rounded-sm px-2 text-sm font-semibold text-ink no-underline hover-fine:hover:bg-surface-2">{label}<ChevronRight aria-hidden size={16} /></Link>;
}

function Thumb({ path, name, size = "size-11" }: { path: string | null; name: string; size?: string }) {
  const src = imageUrl(path);
  return (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-xs bg-well text-muted", size)}>
      {src ? <img src={src} alt="" width={48} height={48} loading="lazy" className="size-full object-cover" /> : <ImageOff aria-hidden size={18} strokeWidth={1.5} />}
      <span className="sr-only-text">{name}</span>
    </span>
  );
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

export default function DashboardV2() {
  const { t, locale } = useT();
  useTitle(t("admin.dashboard"));
  const { perms, user } = useAuth();
  const canMoney = perms.has("orders.manage");
  const canProducts = perms.has("products.manage");
  const [period, setPeriod] = useState<Period>(() => { try { const v = localStorage.getItem("dash.period"); return v === "7" || v === "90" ? v : "30"; } catch { return "30"; } });
  const choose = (p: Period) => { setPeriod(p); try { localStorage.setItem("dash.period", p); } catch { /* storage blocked */ } };
  const q = useDashboard(period, canMoney);

  if (q.isError) {
    return (
      <main className="space-y-4">
        <h1 className="m-0 text-title font-bold">{t("admin.dashboard")}</h1>
        <Alert tone="danger"><p className="m-0 font-semibold">{t("dash.load_error")}</p><Button size="sm" variant="secondary" className="mt-2" onClick={() => void q.refetch()}>{t("common.retry")}</Button></Alert>
      </main>
    );
  }
  if (q.isLoading || !q.data) {
    return (
      <SkeletonGroup label={t("common.loading")} className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 lg:grid-cols-3"><Skeleton variant="row" className="h-80 lg:col-span-2" /><Skeleton variant="row" className="h-80" /></div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="row" className="h-36" />)}</div>
      </SkeletonGroup>
    );
  }

  const d = q.data;
  const days = Number(period);
  const now = d.now;
  const cut = now - days * DAY;
  const inCur = (o: Order) => Date.parse(o.placed_at) >= cut;
  const cur = d.orders.filter(inCur), prev = d.orders.filter((o) => !inCur(o));
  const sales = (list: Order[]) => list.filter((o) => o.status === "delivered").reduce((n, o) => n + o.total_paisa, 0);
  const curSales = sales(cur), prevSales = sales(prev);
  const curOrders = cur.filter((o) => !CLOSED.includes(o.status)).length, prevOrders = prev.filter((o) => !CLOSED.includes(o.status)).length;
  const pending = d.orders.filter((o) => o.status === "pending_confirmation").length;
  const payments = d.orders.filter((o) => o.payment_status === "awaiting_verification").length;
  const low = d.products.filter((p) => p.status === "published" && p.stock_quantity - p.reserved_quantity < p.low_stock_threshold)
    .sort((a, b) => (a.stock_quantity - a.reserved_quantity) - (b.stock_quantity - b.reserved_quantity));
  const listed = d.products.filter((p) => p.status === "published").length;
  const dl = dateLocale(locale);

  // Chart buckets: days for 7/30, weeks for 90 so bars stay readable.
  const step = days > 45 ? 7 : 1;
  const buckets = Math.ceil(days / step);
  const points: Point[] = Array.from({ length: buckets }, (_, i) => {
    const end = now - (buckets - 1 - i) * step * DAY;
    const start = end - step * DAY;
    const inside = cur.filter((o) => { const ts = Date.parse(o.placed_at); return ts > start && ts <= end; });
    const day = new Date(end);
    return {
      key: String(i),
      label: step === 1 ? day.toLocaleDateString(dl, { weekday: "short", day: "numeric", month: "short" }) : t("dash.week_of", { date: new Date(start + DAY).toLocaleDateString(dl, { day: "numeric", month: "short" }) }),
      value: inside.filter((o) => o.status === "delivered").reduce((n, o) => n + o.total_paisa, 0),
      count: inside.filter((o) => !CLOSED.includes(o.status)).length,
    };
  });

  // Best sellers and categories from order lines of live (not cancelled) orders in the period.
  const liveItems = d.items.filter((i) => !CLOSED.includes(i.orders.status));
  const byProduct = new Map<string, { name: string; image: string | null; qty: number; revenue: number }>();
  liveItems.forEach((i) => {
    const k = i.product_id ?? i.name_en;
    const e = byProduct.get(k) ?? { name: pick(locale, i.name_en, i.name_ne) ?? i.name_en, image: i.image_path, qty: 0, revenue: 0 };
    e.qty += i.quantity; e.revenue += i.line_total_paisa; byProduct.set(k, e);
  });
  const best = [...byProduct.entries()].sort((a, b) => b[1].qty - a[1].qty).slice(0, 5);
  const catOf = new Map(d.products.map((p) => [p.id, p.category_id]));
  const catName = new Map(d.categories.map((c) => [c.id, pick(locale, c.name_en, c.name_ne) ?? c.name_en]));
  const byCat = new Map<string, number>();
  liveItems.forEach((i) => { const c = (i.product_id && catOf.get(i.product_id)) || "none"; byCat.set(c, (byCat.get(c) ?? 0) + i.line_total_paisa); });
  const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const actions = [
    { to: "/admin/orders?tab=pending", icon: ClipboardList, n: pending, label: t("admin.orders_to_confirm"), tint: "bg-butter-soft" },
    { to: "/admin/orders?tab=payment", icon: Receipt, n: payments, label: t("admin.payments_to_verify"), tint: "bg-sky-soft" },
    { to: "/admin/products?stock=low", icon: Package, n: low.length, label: t("admin.low_stock"), tint: "bg-rose-soft" },
    { to: "/admin/reviews", icon: Star, n: d.reviews, label: t("admin.reviews_to_moderate"), tint: "bg-peach-soft" },
  ].filter((a) => a.n > 0);
  const name = user?.email?.split("@")[0];
  const quick = [
    canProducts && { to: "/admin/products/new", icon: Plus, label: t("admin.new_product") },
    { to: "/admin/orders", icon: ClipboardList, label: t("dash.q_orders") },
    canMoney && { to: "/admin/money", icon: Wallet, label: t("dash.q_money") },
    perms.has("settings.manage") && { to: "/admin/storefront", icon: Megaphone, label: t("dash.q_banners") },
    { to: "/", icon: ExternalLink, label: t("shell.view_store") },
  ].filter(Boolean).slice(0, 4) as { to: string; icon: LucideIcon; label: string }[];

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="m-0 text-sm font-semibold text-muted">{new Date().toLocaleDateString(dl, { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="m-0 text-title font-bold">{t(greetingKey())}{name ? `, ${name}` : ""}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl<Period> label={t("dash.period")} hideLabel value={period} onChange={choose}
            options={[{ value: "7", label: t("dash.7d") }, { value: "30", label: t("dash.30d") }, { value: "90", label: t("dash.90d") }]} />
          {canProducts && <Link to="/admin/products/new" className={buttonStyles({ variant: "primary" })}><Plus aria-hidden size={18} strokeWidth={2.25} />{t("admin.new_product")}</Link>}
        </div>
      </header>

      <div className={cn("grid gap-4 lg:grid-cols-3", q.isFetching && "opacity-80 transition-opacity")}>
        <Panel title={t("dash.sales_title")} className="lg:col-span-2"
          action={<span className="text-sm text-muted">{t("dash.sales_hint")}</span>}>
          <SalesChart points={points} labels={{ sales: t("dash.delivered_sales"), orders: t("dash.orders_unit"), summary: t("dash.chart_summary", { days: period }), empty: t("dash.chart_empty") }} />
        </Panel>

        <section aria-labelledby="needs" className="flex min-w-0 flex-col rounded-lg bg-ink p-5 text-[var(--surface)] shadow-[var(--e2)]">
          <h2 id="needs" className="m-0 text-base font-bold">{t("admin.needs_action")}</h2>
          {actions.length ? (
            <ul className="m-0 mt-4 grid list-none gap-2 p-0">
              {actions.map(({ to, icon: Icon, n, label, tint }) => (
                <li key={to}>
                  <Link to={to} className="flex min-h-14 items-center gap-3 rounded-md bg-[color-mix(in_oklab,var(--surface)_8%,transparent)] p-2.5 pr-3 font-semibold text-[var(--surface)] no-underline transition-colors hover-fine:hover:bg-[color-mix(in_oklab,var(--surface)_14%,transparent)]">
                    <span className={cn("flex size-10 items-center justify-center rounded-sm text-ink", tint)}><Icon aria-hidden size={20} strokeWidth={1.9} /></span>
                    <span className="min-w-0 flex-1 leading-snug">{label}</span>
                    <span className="min-w-8 rounded-pill bg-[var(--surface)] px-2 py-0.5 text-center text-sm font-bold text-ink tabular">{n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 flex items-center gap-3">
              <CircleCheck aria-hidden size={28} strokeWidth={1.6} className="shrink-0 text-mint" />
              <p className="m-0"><span className="block font-bold">{t("dash.clear_title")}</span><span className="block text-sm opacity-80">{t("admin.all_clear")}</span></p>
            </div>
          )}
          <h3 className="m-0 mt-6 text-sm font-semibold opacity-80">{t("dash.quick")}</h3>
          <ul className="m-0 mt-2 grid list-none grid-cols-2 gap-2 p-0">
            {quick.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <Link to={to} className="flex min-h-20 flex-col justify-between gap-2 rounded-md bg-[color-mix(in_oklab,var(--surface)_8%,transparent)] p-3 text-sm font-semibold text-[var(--surface)] no-underline transition-[background-color,transform] duration-[var(--duration-2)] hover-fine:hover:-translate-y-0.5 hover-fine:hover:bg-[color-mix(in_oklab,var(--surface)_14%,transparent)]">
                  <Icon aria-hidden size={20} strokeWidth={1.8} />{label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:gap-4 lg:grid-cols-4">
        <li><Metric to="/admin/orders?tab=delivered" icon={Wallet} tint="bg-mint-soft" label={t("dash.delivered_sales")} value={formatNpr(curSales)} change={percentChange(curSales, prevSales)} hint={t("dash.no_baseline")} /></li>
        <li><Metric to="/admin/orders" icon={ClipboardList} tint="bg-sky-soft" label={t("dash.orders_period", { days: period })} value={String(curOrders)} change={percentChange(curOrders, prevOrders)} hint={t("dash.no_baseline")} /></li>
        <li><Metric to="/admin/products" icon={Tag} tint="bg-butter-soft" label={t("dash.listed")} value={String(listed)} hint={t("dash.listed_hint", { n: d.products.length - listed })} /></li>
        {d.dues != null ? (
          <li><Metric to="/admin/money" icon={Receipt} tint="bg-peach-soft" label={t("dash.dues")} value={formatNpr(d.dues)} hint={t("dash.dues_hint", { n: d.duesCount })} /></li>
        ) : (
          <li><Metric to="/admin/products?stock=low" icon={TriangleAlert} tint="bg-rose-soft" label={t("admin.low_stock")} value={String(low.length)} hint={t("dash.low_hint")} /></li>
        )}
      </ul>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={t("admin.recent_orders")} className="lg:col-span-2" action={<SeeAll to="/admin/orders" label={t("home.see_all")} />}>
          {cur.length ? (
            <ul className="-mx-2 m-0 list-none p-0">
              {cur.slice(0, 6).map((o) => (
                <li key={o.id}>
                  <Link to={`/admin/orders/${o.id}`} className="flex min-h-14 items-center gap-3 rounded-md px-2 py-2 text-ink no-underline transition-colors hover-fine:hover:bg-surface-2">
                    <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-bold">{initials(o.customer_name)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{o.customer_name}</span>
                      <span className="block truncate text-sm text-muted tabular">{o.order_number} <span aria-hidden>|</span> {new Date(o.placed_at).toLocaleString(dl, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
                    </span>
                    <span className="hidden sm:inline"><Badge tone={statusTone(o.status)}>{t(`status.${o.status}`)}</Badge></span>
                    <span className="w-24 shrink-0 text-right font-bold tabular">{formatNpr(o.total_paisa)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <Empty icon={ClipboardList} text={t("dash.no_orders_period")} />}
        </Panel>

        <Panel title={t("dash.low_title")} action={low.length > 0 ? <SeeAll to="/admin/products?stock=low" label={t("home.see_all")} /> : undefined}>
          {low.length ? (
            <ul className="m-0 list-none space-y-2 p-0">
              {low.slice(0, 5).map((p) => {
                const avail = p.stock_quantity - p.reserved_quantity;
                return (
                  <li key={p.id}>
                    <Link to={canProducts ? `/admin/products/${p.id}` : "/admin/products"} className="-mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 text-ink no-underline hover-fine:hover:bg-surface-2">
                      <Thumb path={thumb(p)} name={p.name_en} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{pick(locale, p.name_en, p.name_ne)}</span>
                        <span className="block text-xs text-muted">{t("dash.threshold", { n: p.low_stock_threshold })}</span>
                      </span>
                      <Badge tone={avail <= 0 ? "danger" : "warning"}>{avail <= 0 ? t("product.out") : t("dash.left", { n: avail })}</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : <Empty icon={Package} text={t("dash.stock_ok")} />}
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title={t("dash.best_title")}>
          {best.length ? (
            <BarList tone="accent" format={(v) => t("dash.units", { n: v })}
              items={best.map(([k, b]) => ({ key: k, label: b.name, value: b.qty, sub: formatNpr(b.revenue), leading: <Thumb path={b.image} name={b.name} size="size-10" /> }))} />
          ) : <Empty icon={Star} text={t("dash.no_sales_period")} />}
        </Panel>
        <Panel title={t("dash.cat_title")}>
          {cats.length ? (
            <BarList tone="mint" items={cats.map(([k, v]) => ({ key: k, label: catName.get(k) ?? t("dash.uncategorised"), value: v }))} />
          ) : <Empty icon={Tag} text={t("dash.no_sales_period")} />}
        </Panel>
      </div>
    </main>
  );
}

function Empty({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md bg-surface-2 px-4 py-8 text-center">
      <Icon aria-hidden size={26} strokeWidth={1.5} className="text-muted" />
      <p className="m-0 max-w-xs text-sm text-muted">{text}</p>
    </div>
  );
}
