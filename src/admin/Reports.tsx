import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Field, Input, Select, Skeleton } from "@/ui";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { formatNpr } from "@/lib/money";
import { useTitle } from "@/components/ui";

const day = (d: Date) => d.toISOString().slice(0, 10);
type Order = { id: string; total_paisa: number; placed_at: string; order_items: { name_en: string; quantity: number; line_total_paisa: number }[] };

const range = (days: number) => ({ from: day(new Date(Date.now() - days * 864e5)), to: day(new Date()) });

export default function Reports() {
  const { t } = useT();
  useTitle(t("admin.reports"));
  const [from, setFrom] = useState(() => day(new Date(Date.now() - 30 * 864e5)));
  const [to, setTo] = useState(() => day(new Date()));
  const [by, setBy] = useState<"day" | "week" | "month">("day");
  const q = useQuery({
    queryKey: ["admin", "report", from, to], staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("id,total_paisa,placed_at,order_items(name_en,quantity,line_total_paisa)").eq("status", "delivered").gte("placed_at", `${from}T00:00:00Z`).lte("placed_at", `${to}T23:59:59Z`);
      if (error) throw new Error(error.message);
      return (data ?? []) as Order[];
    },
  });

  const bucket = (iso: string) => {
    if (by === "month") return iso.slice(0, 7);
    if (by === "week") { const d = new Date(iso); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return day(d); }
    return iso.slice(0, 10);
  };
  const periods = new Map<string, { n: number; total: number }>();
  const products = new Map<string, { qty: number; total: number }>();
  for (const o of q.data ?? []) {
    const k = bucket(o.placed_at); const p = periods.get(k) ?? { n: 0, total: 0 };
    periods.set(k, { n: p.n + 1, total: p.total + o.total_paisa });
    for (const i of o.order_items) { const s = products.get(i.name_en) ?? { qty: 0, total: 0 }; products.set(i.name_en, { qty: s.qty + i.quantity, total: s.total + i.line_total_paisa }); }
  }
  const asc = [...periods.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const rows = [...asc].reverse();
  const totalRev = asc.reduce((n, [, v]) => n + v.total, 0);
  const totalOrders = asc.reduce((n, [, v]) => n + v.n, 0);
  const max = Math.max(1, ...asc.map(([, v]) => v.total));

  return (
    <main className="space-y-4">
      <h1 className="m-0 text-3xl font-bold">{t("admin.reports")}</h1>
      <div className="flex flex-wrap items-end gap-2">
        <Field label={t("admin.report.from")}>{(a) => <Input {...a} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />}</Field>
        <Field label={t("admin.report.to")}>{(a) => <Input {...a} type="date" value={to} onChange={(e) => setTo(e.target.value)} />}</Field>
        <Field label={t("admin.report.group")}>{(a) => <Select {...a} value={by} onChange={(e) => setBy(e.target.value as typeof by)}><option value="day">{t("admin.report.day")}</option><option value="week">{t("admin.report.week")}</option><option value="month">{t("admin.report.month")}</option></Select>}</Field>
        {[7, 30, 90].map((d) => <Button key={d} variant="secondary" onClick={() => { const r = range(d); setFrom(r.from); setTo(r.to); }}>{t("admin.report.last", { n: d })}</Button>)}
      </div>
      {q.error && <Alert tone="danger">{String(q.error)}</Alert>}
      {q.isLoading ? <Skeleton variant="row" className="h-40" /> : (
        <>
          <ul className="m-0 grid list-none grid-cols-3 gap-3 p-0">
            <li><Card><p className="m-0 text-sm text-muted">{t("admin.total_orders")}</p><p className="m-0 text-xl font-bold">{totalOrders}</p></Card></li>
            <li><Card><p className="m-0 text-sm text-muted">{t("admin.sales")}</p><p className="m-0 text-xl font-bold">{formatNpr(totalRev)}</p></Card></li>
            <li><Card><p className="m-0 text-sm text-muted">AOV</p><p className="m-0 text-xl font-bold">{totalOrders ? formatNpr(Math.round(totalRev / totalOrders)) : "—"}</p></Card></li>
          </ul>
          {asc.length > 0 && (
            <Card>
              <h2 className="m-0 mb-3 text-lg font-bold">{t("admin.sales")}</h2>
              {/* Chart is an image for assistive tech; the table below holds the same numbers. */}
              <div role="img" aria-label={t("admin.report.chart", { n: asc.length })} className="flex h-40 items-end gap-1">
                {asc.map(([k, v]) => <div key={k} title={`${k}: ${formatNpr(v.total)}`} className="flex-1 rounded-t-xs bg-brand-strong" style={{ height: `${Math.max(2, (v.total / max) * 100)}%` }} />)}
              </div>
            </Card>
          )}
          <Card className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead><tr><th scope="col" className="py-2">{t("admin.report.period")}</th><th scope="col">{t("admin.total_orders")}</th><th scope="col" className="text-right">{t("admin.sales")}</th></tr></thead>
              <tbody>{rows.map(([k, v]) => <tr key={k} className="border-t border-line"><th scope="row" className="py-2 font-normal">{k}</th><td>{v.n}</td><td className="text-right">{formatNpr(v.total)}</td></tr>)}</tbody>
            </table>
          </Card>
          <Card className="overflow-x-auto">
            <h2 className="m-0 mb-2 text-lg font-bold">{t("admin.report.by_product")}</h2>
            <table className="w-full border-collapse text-left text-sm">
              <thead><tr><th scope="col" className="py-2">{t("admin.products")}</th><th scope="col">{t("admin.report.qty")}</th><th scope="col" className="text-right">{t("admin.sales")}</th></tr></thead>
              <tbody>{[...products.entries()].sort((a, b) => b[1].total - a[1].total).map(([k, v]) => <tr key={k} className="border-t border-line"><th scope="row" className="py-2 font-normal">{k}</th><td>{v.qty}</td><td className="text-right">{formatNpr(v.total)}</td></tr>)}</tbody>
            </table>
          </Card>
        </>
      )}
    </main>
  );
}
