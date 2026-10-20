import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { saveCoupon } from "@/lib/api";
import { formatNpr } from "@/lib/money";
import { useQuery } from "@/lib/useQuery";
import { ErrorBox, Loading, useTitle } from "@/components/ui";

export default function Coupons() {
  const { t } = useT();
  const [err, setErr] = useState<string | null>(null);
  useTitle(t("admin.coupons"));
  const { data, loading, reload } = useQuery(async () => (await supabase.from("coupons").select("*").order("created_at", { ascending: false })).data ?? [], []);
  if (loading && !data) return <Loading />;
  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-bold">{t("admin.coupons")}</h1>
      {err && <ErrorBox>{err}</ErrorBox>}
      <form className="card grid gap-3 sm:grid-cols-2" onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = Object.fromEntries([...new FormData(form).entries()].map(([k, v]) => [k, String(v)]));
        const r = await saveCoupon(f);
        setErr(r); if (!r) { form.reset(); reload(); }
      }}>
        <label className="field"><span>Code</span><input name="code" required pattern="[A-Za-z0-9_-]{3,32}" /></label>
        <label className="field"><span>Type</span><select name="type"><option value="percent">Percent</option><option value="fixed">Fixed (Rs.)</option></select></label>
        <label className="field"><span>Value</span><input name="value" type="number" min="1" step="0.01" required /></label>
        <label className="field"><span>Min subtotal (Rs.)</span><input name="min_subtotal" type="number" min="0" step="0.01" defaultValue={0} /></label>
        <label className="field"><span>Max discount (Rs.)</span><input name="max_discount" type="number" min="0" step="0.01" /></label>
        <label className="field"><span>Ends at</span><input name="ends_at" type="date" /></label>
        <label className="field"><span>Max redemptions</span><input name="max_redemptions" type="number" min="1" /></label>
        <label className="field"><span>Per customer</span><input name="per_customer_limit" type="number" min="1" defaultValue={1} /></label>
        <button className="btn btn-primary sm:col-span-2">{t("admin.save")}</button>
      </form>
      <ul className="m-0 list-none space-y-2 p-0">
        {data?.map((c) => (
          <li key={c.id} className="card flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="m-0 font-semibold">{c.code} · {c.type === "percent" ? `${c.value}%` : formatNpr(c.value)}</p>
              <p className="muted m-0 text-sm">min {formatNpr(c.min_subtotal_paisa)} · used {c.redemption_count}{c.max_redemptions ? `/${c.max_redemptions}` : ""}{c.ends_at ? ` · until ${c.ends_at.slice(0, 10)}` : ""}</p>
            </div>
            <button className={`badge ${c.is_active ? "badge-ok" : "badge-err"} cursor-pointer !px-4`} style={{ minHeight: 44 }} aria-pressed={c.is_active}
              onClick={async () => { await supabase.from("coupons").update({ is_active: !c.is_active }).eq("id", c.id); reload(); }}>
              {c.is_active ? "Active" : "Disabled"}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
