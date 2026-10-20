import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { formatNpr } from "@/lib/money";
import { useQuery } from "@/lib/useQuery";
import { Loading, useTitle } from "@/components/ui";

export default function AdminHome() {
  const { t } = useT();
  useTitle(t("admin.dashboard"));
  const { data, loading } = useQuery(async () => {
    const [o, p, top] = await Promise.all([
      supabase.from("orders").select("status,total_paisa,placed_at"),
      supabase.from("products").select("id,name_en,stock_quantity,reserved_quantity,low_stock_threshold").neq("status", "archived"),
      supabase.from("products").select("id,name_en,units_sold").gt("units_sold", 0).order("units_sold", { ascending: false }).limit(5),
    ]);
    return { orders: o.data ?? [], products: p.data ?? [], top: top.data ?? [] };
  }, []);
  if (loading && !data) return <Loading />;
  const { orders, products, top } = data!;
  const delivered = orders.filter((o) => o.status === "delivered");
  const sales = delivered.reduce((n, o) => n + o.total_paisa, 0);
  const low = products.filter((p) => p.stock_quantity - p.reserved_quantity < p.low_stock_threshold);
  const byStatus = orders.reduce<Record<string, number>>((m, o) => ((m[o.status] = (m[o.status] ?? 0) + 1), m), {});
  const months: Record<string, number> = {};
  for (const o of delivered) { const k = o.placed_at.slice(0, 7); months[k] = (months[k] ?? 0) + o.total_paisa; }
  const keys = Object.keys(months).sort().slice(-6);
  const max = Math.max(1, ...keys.map((k) => months[k]));
  const stat = (label: string, value: string | number) => <div className="card"><p className="muted m-0 text-sm">{label}</p><p className="m-0 text-2xl font-bold">{value}</p></div>;

  return (
    <main className="space-y-6">
      <h1 className="text-3xl font-bold">{t("admin.dashboard")}</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stat(t("admin.total_orders"), orders.length)}
        {stat(t("admin.pending"), byStatus.pending_confirmation ?? 0)}
        {stat(t("admin.sales"), formatNpr(sales))}
        {stat("AOV", delivered.length ? formatNpr(Math.round(sales / delivered.length)) : "—")}
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(byStatus).map(([s, n]) => <Link key={s} className="badge badge-info no-underline" to={`/admin/orders?status=${s}`}>{t(`status.${s}`)}: {n}</Link>)}
      </div>
      <section className="card">
        <h2 className="mb-3 mt-0 font-semibold">{t("admin.sales")}</h2>
        {keys.length ? (
          <div className="flex h-32 items-end gap-2" role="img" aria-label="Monthly sales">
            {keys.map((k) => (
              <div key={k} className="flex flex-1 flex-col items-center gap-1" style={{ height: "100%", justifyContent: "flex-end" }}>
                <div className="w-full rounded-t" style={{ height: `${(months[k] / max) * 100}%`, background: "var(--color-accent)" }} title={formatNpr(months[k])} />
                <span className="muted text-xs">{k.slice(5)}</span>
              </div>
            ))}
          </div>
        ) : <p className="muted m-0">—</p>}
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card">
          <h2 className="mb-2 mt-0 font-semibold">{t("admin.low_stock")}</h2>
          {low.length ? <ul className="m-0 list-none space-y-1 p-0 text-sm">{low.map((p) => <li key={p.id}><Link className="underline" to={`/admin/products/${p.id}`}>{p.name_en}</Link> — {p.stock_quantity - p.reserved_quantity}</li>)}</ul> : <p className="muted m-0">—</p>}
        </section>
        <section className="card">
          <h2 className="mb-2 mt-0 font-semibold">Top products</h2>
          {top.length ? <ul className="m-0 list-none space-y-1 p-0 text-sm">{top.map((p) => <li key={p.id}>{p.name_en} — {p.units_sold}</li>)}</ul> : <p className="muted m-0">—</p>}
        </section>
      </div>
    </main>
  );
}
