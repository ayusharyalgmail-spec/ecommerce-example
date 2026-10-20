import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { formatNpr } from "@/lib/money";
import { useQuery } from "@/lib/useQuery";
import { Loading, useTitle } from "@/components/ui";

const STATUSES = ["pending_confirmation", "confirmed", "processing", "dispatched", "delivered", "cancelled", "rejected"];

export default function AdminOrders() {
  const { t } = useT();
  const [sp, setSp] = useSearchParams();
  const status = sp.get("status") ?? "";
  const term = (sp.get("q") ?? "").trim().replace(/[%,()]/g, "");
  useTitle(t("admin.orders"));
  const { data: orders, loading } = useQuery(async () => {
    let q = supabase.from("orders").select("id,order_number,customer_name,customer_phone,status,total_paisa,placed_at,risk_flags").order("placed_at", { ascending: false }).limit(100);
    if (STATUSES.includes(status)) q = q.eq("status", status);
    if (term) q = q.or(`order_number.ilike.%${term}%,customer_phone.ilike.%${term}%`);
    return (await q).data ?? [];
  }, [status, term]);

  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-bold">{t("admin.orders")}</h1>
      <form className="grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={(e) => { e.preventDefault(); const n = new URLSearchParams(sp); const v = String(new FormData(e.currentTarget).get("q") ?? ""); v ? n.set("q", v) : n.delete("q"); setSp(n); }}>
        <input name="q" defaultValue={sp.get("q") ?? ""} placeholder="ORD-… / 98…" aria-label="Search" />
        <select value={status} aria-label={t("admin.status")} onChange={(e) => { const n = new URLSearchParams(sp); e.target.value ? n.set("status", e.target.value) : n.delete("status"); setSp(n); }}>
          <option value="">—</option>
          {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
        </select>
      </form>
      {loading && !orders ? <Loading /> : (
        <ul className="m-0 list-none space-y-2 p-0">
          {orders?.map((o) => (
            <li key={o.id}>
              <Link to={`/admin/orders/${o.id}`} className="card flex flex-wrap items-center justify-between gap-2 no-underline">
                <div>
                  <p className="m-0 font-semibold">{o.order_number} · {formatNpr(o.total_paisa)}</p>
                  <p className="muted m-0 text-sm">{o.customer_name} · {o.customer_phone} · {new Date(o.placed_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p>
                </div>
                <div className="flex items-center gap-2">
                  {o.risk_flags.length > 0 && <span className="badge badge-warn">⚠ {o.risk_flags.length}</span>}
                  <span className="badge badge-info">{t(`status.${o.status}`)}</span>
                </div>
              </Link>
            </li>
          ))}
          {!orders?.length && <p className="muted">—</p>}
        </ul>
      )}
    </main>
  );
}
