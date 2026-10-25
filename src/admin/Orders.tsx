import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Alert, Badge, Button, ChevronRight, EmptyState, Inbox, Input, Search, Skeleton, SkeletonGroup, TriangleAlert, cn } from "@/ui";
import { supabase } from "@/lib/supabase";
import { useT, dateLocale } from "@/lib/i18n";
import { formatNpr } from "@/lib/money";
import { useTitle } from "@/components/ui";

// Queue tabs. "pending" and "payment" are the two things a vendor must act on first.
const TABS = ["all", "pending", "payment", "confirmed", "processing", "dispatched", "delivered", "closed"] as const;
type Tab = (typeof TABS)[number];
const STATUS_OF: Partial<Record<Tab, string[]>> = { pending: ["pending_confirmation"], confirmed: ["confirmed"], processing: ["processing"], dispatched: ["dispatched"], delivered: ["delivered"], closed: ["cancelled", "rejected"] };
const tone = (s: string) => (s === "delivered" ? "success" : s === "cancelled" || s === "rejected" ? "danger" : s === "pending_confirmation" ? "warning" : "info") as "success" | "danger" | "warning" | "info";

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";

export default function Orders() {
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
    <main className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-title font-bold">{t("admin.orders")}</h1>
          {counts && <p className="m-0 text-sm text-muted">{t("orders.summary", { n: counts.all ?? 0, pending: counts.pending ?? 0 })}</p>}
        </div>
        <form role="search" onSubmit={(e) => { e.preventDefault(); setParam("q", String(new FormData(e.currentTarget).get("q") ?? "")); }} className="relative w-full max-w-sm">
          <Search aria-hidden size={18} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted" />
          <label className="sr-only-text" htmlFor="oq">{t("admin.orders.search")}</label>
          <Input id="oq" name="q" type="search" defaultValue={sp.get("q") ?? ""} placeholder={t("orders.search_hint")} className="pl-10" />
        </form>
      </header>
      <ul aria-label={t("admin.orders.tabs")} className="rail my-0 flex list-none gap-1 overflow-x-auto rounded-lg border border-line bg-surface p-1.5 shadow-[var(--e1)]">
        {TABS.map((k) => (
          <li key={k} className="shrink-0">
            <button type="button" aria-pressed={tab === k} onClick={() => setParam("tab", k)}
              className={cn("inline-flex min-h-10 items-center gap-2 rounded-sm px-3 text-sm font-semibold transition-colors", tab === k ? "bg-ink text-[var(--surface)]" : "text-ink hover-fine:hover:bg-surface-2")}>
              {t(`admin.tab.${k}`)}
              {counts && counts[k] != null && (
                <span className={cn("rounded-pill px-1.5 text-xs tabular", tab === k ? "bg-[color-mix(in_oklab,var(--surface)_18%,transparent)]"
                  : (k === "pending" || k === "payment") && counts[k] > 0 ? "bg-accent text-on-accent" : "bg-surface-2 text-muted")}>{counts[k]}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {rows.isError ? (
        <Alert tone="danger"><p className="m-0 font-semibold">{t("orders.load_error")}</p><Button size="sm" variant="secondary" className="mt-2" onClick={() => void rows.refetch()}>{t("common.retry")}</Button></Alert>
      ) : rows.isLoading ? (
        <SkeletonGroup label={t("common.loading")} className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} variant="row" />)}</SkeletonGroup>
      ) : rows.data?.length ? (
        <ul className="m-0 list-none divide-y divide-[var(--line)] overflow-hidden rounded-lg border border-line bg-surface p-0 shadow-[var(--e1)]">
          {rows.data.map((o) => (
            <li key={o.id}>
              <Link to={`/admin/orders/${o.id}`} className="flex min-h-16 items-center gap-3 px-3 py-3 text-ink no-underline transition-colors hover-fine:hover:bg-[color-mix(in_oklab,var(--surface-2)_50%,transparent)] sm:px-4">
                <span aria-hidden className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-bold sm:flex">{initials(o.customer_name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{o.customer_name}</span>
                  <span className="block truncate text-sm text-muted tabular">{o.order_number} <span aria-hidden>|</span> {o.customer_phone} <span aria-hidden>|</span> {new Date(o.placed_at).toLocaleString(dateLocale(locale), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
                  <span className="mt-1 flex flex-wrap gap-1.5 md:hidden">
                    <Badge tone={tone(o.status)}>{t(`status.${o.status}`)}</Badge>
                    {o.payment_status === "awaiting_verification" && <Badge tone="info">{t("pay.awaiting_verification")}</Badge>}
                  </span>
                </span>
                <span className="hidden flex-wrap items-center justify-end gap-1.5 md:flex">
                  {o.risk_flags.length > 0 && <Badge tone="warning" icon={TriangleAlert}>{t("admin.risk")} {o.risk_flags.length}</Badge>}
                  {o.payment_status === "awaiting_verification" && <Badge tone="info">{t("pay.awaiting_verification")}</Badge>}
                  <Badge tone={tone(o.status)}>{t(`status.${o.status}`)}</Badge>
                </span>
                <span className="w-24 shrink-0 text-right font-bold tabular">{formatNpr(o.total_paisa)}</span>
                <ChevronRight aria-hidden size={18} className="shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      ) : <EmptyState icon={Inbox} title={t("admin.orders.empty")} description={t("admin.orders.empty_hint")} />}
    </main>
  );
}
