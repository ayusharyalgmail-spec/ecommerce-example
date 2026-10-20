import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Alert, Badge, Card, ChevronRight, ClipboardList, Package, Receipt, Skeleton, Star, TriangleAlert, type LucideIcon } from "@/ui";
import { supabase } from "@/lib/supabase";
import { useT, dateLocale } from "@/lib/i18n";
import { formatNpr } from "@/lib/money";
import { useTitle } from "@/components/ui";

const DAY = 864e5;

/** Tiny inline SVG trend line (no chart library). Decorative: the figure beside it carries the data. */
function Spark({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * 100},${28 - (v / max) * 26}`).join(" ");
  return <svg aria-hidden viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-full"><polyline points={pts} fill="none" stroke="var(--brand-strong)" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>;
}

function Action({ to, icon: Icon, count, label }: { to: string; icon: LucideIcon; count: number; label: string }) {
  if (!count) return null;
  return (
    <li>
      <Link to={to} className="flex min-h-12 items-center gap-3 rounded-md border border-warning bg-[var(--warning-tint)] p-3 font-semibold text-ink no-underline">
        <Icon aria-hidden size={22} strokeWidth={1.75} /><span className="flex-1">{label}</span><Badge tone="warning" icon={false}>{count}</Badge><ChevronRight aria-hidden size={18} />
      </Link>
    </li>
  );
}

export default function DashboardV2() {
  const { t, locale } = useT();
  useTitle(t("admin.dashboard"));
  const q = useQuery({
    queryKey: ["admin", "dashboard"], staleTime: 30_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * DAY).toISOString();
      const [recent, open, pay, low, rev, orders30] = await Promise.all([
        supabase.from("orders").select("id,order_number,customer_name,status,total_paisa,placed_at").order("placed_at", { ascending: false }).limit(6),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending_confirmation"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "awaiting_verification"),
        supabase.from("products").select("id,name_en,stock_quantity,reserved_quantity,low_stock_threshold").neq("status", "archived"),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("orders").select("status,total_paisa,placed_at").gte("placed_at", since),
      ]);
      const lowList = (low.data ?? []).filter((p) => p.stock_quantity - p.reserved_quantity < p.low_stock_threshold);
      const o30 = orders30.data ?? [];
      const days = Array.from({ length: 14 }, (_, i) => new Date(Date.now() - (13 - i) * DAY).toISOString().slice(0, 10));
      const sales = days.map((k) => o30.filter((o) => o.status === "delivered" && o.placed_at.slice(0, 10) === k).reduce((n, o) => n + o.total_paisa, 0));
      const count = days.map((k) => o30.filter((o) => o.placed_at.slice(0, 10) === k).length);
      return { sales, count, recent: recent.data ?? [], pending: open.count ?? 0, payments: pay.count ?? 0, reviews: rev.count ?? 0, low: lowList, orders30: orders30.data ?? [] };
    },
  });
  if (q.isLoading || !q.data) return <main className="space-y-4"><Skeleton variant="row" className="h-24" /><Skeleton variant="row" className="h-40" /></main>;
  const d = q.data;
  const delivered = d.orders30.filter((o) => o.status === "delivered");
  const total = delivered.reduce((n, o) => n + o.total_paisa, 0);
  const nothing = !d.pending && !d.payments && !d.reviews && !d.low.length;

  return (
    <main className="space-y-6">
      <h1 className="m-0 text-3xl font-bold">{t("admin.dashboard")}</h1>
      <section aria-labelledby="needs" className="space-y-2">
        <h2 id="needs" className="m-0 text-xl font-bold">{t("admin.needs_action")}</h2>
        {nothing ? <Alert tone="success">{t("admin.all_clear")}</Alert> : (
          <ul className="m-0 grid list-none gap-2 p-0 md:grid-cols-2">
            <Action to="/admin/orders?tab=pending" icon={ClipboardList} count={d.pending} label={t("admin.orders_to_confirm")} />
            <Action to="/admin/orders?tab=payment" icon={Receipt} count={d.payments} label={t("admin.payments_to_verify")} />
            <Action to="/admin/reviews" icon={Star} count={d.reviews} label={t("admin.reviews_to_moderate")} />
            <Action to="/admin/products" icon={Package} count={d.low.length} label={t("admin.low_stock")} />
          </ul>
        )}
      </section>

      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-4">
        <li><Card><p className="m-0 text-sm text-muted">{t("admin.sales_30")}</p><p className="m-0 text-2xl font-bold">{formatNpr(total)}</p><Spark values={d.sales} /></Card></li>
        <li><Card><p className="m-0 text-sm text-muted">{t("admin.orders_30")}</p><p className="m-0 text-2xl font-bold">{d.orders30.length}</p><Spark values={d.count} /></Card></li>
        <li><Card><p className="m-0 text-sm text-muted">AOV</p><p className="m-0 text-2xl font-bold">{delivered.length ? formatNpr(Math.round(total / delivered.length)) : "—"}</p></Card></li>
        <li><Card><p className="m-0 text-sm text-muted">{t("admin.low_stock")}</p><p className="m-0 flex items-center gap-2 text-2xl font-bold">{d.low.length}{d.low.length > 0 && <TriangleAlert aria-hidden size={20} className="text-warning" />}</p></Card></li>
      </ul>

      <section aria-labelledby="recent" className="space-y-2">
        <div className="flex items-baseline justify-between"><h2 id="recent" className="m-0 text-xl font-bold">{t("admin.recent_orders")}</h2><Link to="/admin/orders" className="inline-flex min-h-12 items-center font-semibold text-ink underline">{t("home.see_all")}</Link></div>
        {d.recent.length ? (
          <ul className="m-0 list-none space-y-2 p-0">
            {d.recent.map((o) => (
              <li key={o.id}><Link to={`/admin/orders/${o.id}`} className="flex min-h-12 flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface p-3 text-ink no-underline">
                <span><span className="font-bold">{o.order_number}</span> · {o.customer_name}<span className="block text-sm text-muted">{new Date(o.placed_at).toLocaleString(dateLocale(locale), { dateStyle: "medium", timeStyle: "short" })}</span></span>
                <span className="flex items-center gap-2 font-semibold">{formatNpr(o.total_paisa)}<Badge>{t(`status.${o.status}`)}</Badge></span>
              </Link></li>
            ))}
          </ul>
        ) : <p className="m-0 text-muted">{t("admin.no_orders")}</p>}
      </section>
    </main>
  );
}
