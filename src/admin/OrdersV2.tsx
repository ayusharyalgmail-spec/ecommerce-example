import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge, Chip, EmptyState, Inbox, Input, Search, Skeleton, TriangleAlert } from "@/ui";
import { supabase } from "@/lib/supabase";
import { useT, dateLocale } from "@/lib/i18n";
import { formatNpr } from "@/lib/money";
import { useTitle } from "@/components/ui";

// Queue tabs. "pending" and "payment" are the two things a vendor must act on first.
const TABS = ["all", "pending", "payment", "confirmed", "processing", "dispatched", "delivered", "closed"] as const;
type Tab = (typeof TABS)[number];
const STATUS_OF: Partial<Record<Tab, string[]>> = { pending: ["pending_confirmation"], confirmed: ["confirmed"], processing: ["processing"], dispatched: ["dispatched"], delivered: ["delivered"], closed: ["cancelled", "rejected"] };
const tone = (s: string) => (s === "delivered" ? "success" : s === "cancelled" || s === "rejected" ? "danger" : s === "pending_confirmation" ? "warning" : "info") as "success" | "danger" | "warning" | "info";

export default function OrdersV2() {
  const { t, locale } = useT();
  const [sp, setSp] = useSearchParams();
  const tab = (TABS as readonly string[]).includes(sp.get("tab") ?? "") ? (sp.get("tab") as Tab) : "all";
  const term = (sp.get("q") ?? "").trim().replace(/[%,()*\\]/g, "");
  useTitle(t("admin.orders"));

  const rows = useQuery({
    queryKey: ["admin", "orders", tab, term], staleTime: 15_000,
    queryFn: async () => {
      let q = supabase.from("orders").select("id,order_number,customer_name,customer_phone,status,payment_status,total_paisa,placed_at,risk_flags").order("placed_at", { ascending: false }).limit(100);
      if (tab === "payment") q = q.eq("payment_status", "awaiting_verification");
      else if (STATUS_OF[tab]) q = q.in("status", STATUS_OF[tab]!);
      if (term) q = q.or(`order_number.ilike.%${term}%,customer_phone.ilike.%${term}%`);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const counts = useQuery({
    queryKey: ["admin", "order-counts"], staleTime: 15_000,
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("status,payment_status").limit(2000);
      const c: Record<string, number> = { all: data?.length ?? 0, payment: 0 };
      (data ?? []).forEach((o) => {
        const k = (Object.entries(STATUS_OF).find(([, v]) => v!.includes(o.status)) ?? [])[0];
        if (k) c[k] = (c[k] ?? 0) + 1;
        if (o.payment_status === "awaiting_verification") c.payment++;
      });
      return c;
    },
  }).data;
  const setParam = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v && !(k === "tab" && v === "all")) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };

  return (
    <main className="space-y-4">
      <h1 className="m-0 text-3xl font-bold">{t("admin.orders")}</h1>
      <form role="search" onSubmit={(e) => { e.preventDefault(); setParam("q", String(new FormData(e.currentTarget).get("q") ?? "")); }} className="relative max-w-md">
        <Search aria-hidden size={18} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted" />
        <label className="sr-only-text" htmlFor="oq">{t("admin.orders.search")}</label>
        <Input id="oq" name="q" type="search" defaultValue={sp.get("q") ?? ""} placeholder="ORD-… / 98…" style={{ paddingLeft: 40 }} />
      </form>
      <ul aria-label={t("admin.orders.tabs")} className="-mx-1 m-0 flex list-none gap-2 overflow-x-auto p-1">
        {TABS.map((k) => <li key={k} className="shrink-0"><Chip pressed={tab === k} onClick={() => setParam("tab", k)}>{t(`admin.tab.${k}`)}{counts && counts[k] != null ? ` (${counts[k]})` : ""}</Chip></li>)}
      </ul>
      {rows.isLoading ? <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} variant="row" />)}</div> : rows.data?.length ? (
        <ul className="m-0 list-none space-y-2 p-0">
          {rows.data.map((o) => (
            <li key={o.id}>
              <Link to={`/admin/orders/${o.id}`} className="flex min-h-12 flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface p-3 text-ink no-underline">
                <span>
                  <span className="font-bold">{o.order_number} · {formatNpr(o.total_paisa)}</span>
                  <span className="block text-sm text-muted">{o.customer_name} · {o.customer_phone} · {new Date(o.placed_at).toLocaleString(dateLocale(locale), { dateStyle: "medium", timeStyle: "short" })}</span>
                </span>
                <span className="flex items-center gap-2">
                  {o.risk_flags.length > 0 && <Badge tone="warning" icon={TriangleAlert}>{t("admin.risk")} {o.risk_flags.length}</Badge>}
                  {o.payment_status === "awaiting_verification" && <Badge tone="info">{t("pay.awaiting_verification")}</Badge>}
                  <Badge tone={tone(o.status)}>{t(`status.${o.status}`)}</Badge>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : <EmptyState icon={Inbox} title={t("admin.orders.empty")} description={t("admin.orders.empty_hint")} />}
    </main>
  );
}
