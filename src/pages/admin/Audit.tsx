import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { useQuery } from "@/lib/useQuery";
import { ErrorBox, Loading, useTitle } from "@/components/ui";

const PAGE = 30;

export default function Audit() {
  const { t } = useT();
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  useTitle(t("admin.audit"));
  const { data, loading, error } = useQuery(async () => {
    let q = supabase.from("audit_logs").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
    if (action) q = q.ilike("action", `%${action.replace(/[%,]/g, "")}%`);
    const { data, count } = await q;
    return { rows: data ?? [], count: count ?? 0 };
  }, [action, page]);
  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-bold">{t("admin.audit")}</h1>
      <input defaultValue={action} placeholder="order.transition, payment…" aria-label="Action"
        onKeyDown={(e) => { if (e.key === "Enter") { setAction(e.currentTarget.value); setPage(1); } }} />
      {error && <ErrorBox>{error}</ErrorBox>}
      {loading && !data ? <Loading /> : (
        <>
          <ul className="m-0 list-none space-y-2 p-0 text-sm">
            {data?.rows.map((l) => (
              <li key={l.id} className="card">
                <p className="m-0 font-medium">{l.action} <span className="muted">· {l.entity_type} {l.entity_id?.slice(0, 8)}</span></p>
                <p className="muted m-0">{new Date(l.created_at).toLocaleString("en-GB")} · {l.actor_type} {l.actor_id?.slice(0, 8)}</p>
                {(l.before || l.after) && <p className="muted m-0 break-all">{JSON.stringify(l.before)} → {JSON.stringify(l.after)}</p>}
              </li>
            ))}
          </ul>
          <p className="muted text-sm">{data?.count ?? 0} total · page {page}</p>
          <div className="flex gap-2">
            {page > 1 && <button className="btn btn-secondary" onClick={() => setPage(page - 1)}>{t("shop.prev")}</button>}
            {(data?.count ?? 0) > page * PAGE && <button className="btn btn-secondary" onClick={() => setPage(page + 1)}>{t("shop.next")}</button>}
          </div>
        </>
      )}
    </main>
  );
}
