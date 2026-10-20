import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { formatNpr } from "@/lib/money";
import { useQuery } from "@/lib/useQuery";
import { ErrorBox, Loading, useTitle } from "@/components/ui";

const Th = ({ children, right }: { children: React.ReactNode; right?: boolean }) => <th className={`py-1 ${right ? "text-right" : "text-left"}`}>{children}</th>;

const day = (d: Date) => d.toISOString().slice(0, 10);

export default function Reports() {
  const { t } = useT();
  useTitle(t("admin.reports"));
  const [from, setFrom] = useState(() => day(new Date(Date.now() - 30 * 864e5)));
  const [to, setTo] = useState(() => day(new Date()));
  const [by, setBy] = useState<"day" | "week" | "month">("day");
  const { data, loading, error } = useQuery(async () =>
    (await supabase.from("orders").select("id,total_paisa,placed_at,order_items(name_en,quantity,line_total_paisa)")
      .eq("status", "delivered").gte("placed_at", `${from}T00:00:00Z`).lte("placed_at", `${to}T23:59:59Z`)).data ?? [], [from, to]);

  const bucket = (iso: string) => {
    if (by === "month") return iso.slice(0, 7);
    if (by === "week") { const d = new Date(iso); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return day(d); }
    return iso.slice(0, 10);
  };
  const periods = new Map<string, { n: number; total: number }>();
  const products = new Map<string, { qty: number; total: number }>();
  for (const o of data ?? []) {
    const k = bucket(o.placed_at);
    const p = periods.get(k) ?? { n: 0, total: 0 };
    periods.set(k, { n: p.n + 1, total: p.total + o.total_paisa });
    for (const i of o.order_items as { name_en: string; quantity: number; line_total_paisa: number }[]) {
      const q = products.get(i.name_en) ?? { qty: 0, total: 0 };
      products.set(i.name_en, { qty: q.qty + i.quantity, total: q.total + i.line_total_paisa });
    }
  }
  const rows = [...periods.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  const totalRev = rows.reduce((n, [, v]) => n + v.total, 0);
  const totalOrders = rows.reduce((n, [, v]) => n + v.n, 0);

  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-bold">{t("admin.reports")}</h1>
      <div className="grid gap-2 sm:grid-cols-3">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" />
        <select value={by} onChange={(e) => setBy(e.target.value as typeof by)} aria-label="Group by"><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option></select>
      </div>
      {error && <ErrorBox>{error}</ErrorBox>}
      {loading && !data ? <Loading /> : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="card"><p className="muted m-0 text-sm">{t("admin.total_orders")}</p><p className="m-0 text-xl font-bold">{totalOrders}</p></div>
            <div className="card"><p className="muted m-0 text-sm">{t("admin.sales")}</p><p className="m-0 text-xl font-bold">{formatNpr(totalRev)}</p></div>
            <div className="card"><p className="muted m-0 text-sm">AOV</p><p className="m-0 text-xl font-bold">{totalOrders ? formatNpr(Math.round(totalRev / totalOrders)) : "—"}</p></div>
          </div>
          <section className="card overflow-x-auto">
            <table className="w-full text-sm"><thead><tr><Th>Period</Th><Th>Orders</Th><Th right>Revenue</Th></tr></thead>
              <tbody>{rows.map(([k, v]) => <tr key={k} style={{ borderTop: "1px solid var(--color-border)" }}><td className="py-1">{k}</td><td>{v.n}</td><td className="text-right">{formatNpr(v.total)}</td></tr>)}</tbody></table>
          </section>
          <section className="card overflow-x-auto">
            <h2 className="mb-2 mt-0 font-semibold">By product</h2>
            <table className="w-full text-sm"><thead><tr><Th>Product</Th><Th>Qty</Th><Th right>Revenue</Th></tr></thead>
              <tbody>{[...products.entries()].sort((a, b) => b[1].total - a[1].total).map(([k, v]) => <tr key={k} style={{ borderTop: "1px solid var(--color-border)" }}><td className="py-1">{k}</td><td>{v.qty}</td><td className="text-right">{formatNpr(v.total)}</td></tr>)}</tbody></table>
          </section>
        </>
      )}
    </main>
  );
}
