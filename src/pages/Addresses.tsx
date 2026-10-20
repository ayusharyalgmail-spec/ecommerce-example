import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { saveAddress } from "@/lib/api";
import { useT, pick } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@/lib/useQuery";
import { ErrorBox, Loading, useTitle } from "@/components/ui";

export default function Addresses() {
  const { t, locale } = useT();
  const { user } = useAuth();
  useTitle(t("addr.title"));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, loading, reload } = useQuery(async () => {
    const [a, z] = await Promise.all([
      supabase.from("customer_addresses").select("*").eq("user_id", user!.id).order("created_at"),
      supabase.from("delivery_zones").select("id,name_en,name_ne").eq("is_active", true),
    ]);
    return { addrs: a.data ?? [], zones: z.data ?? [] };
  }, [user?.id]);
  if (loading && !data) return <Loading />;

  return (
    <main className="container-page max-w-2xl space-y-4">
      <h1 className="text-3xl font-bold">{t("addr.title")}</h1>
      <ul className="m-0 list-none space-y-2 p-0">
        {data?.addrs.map((a) => (
          <li key={a.id} className="card flex items-start justify-between gap-2">
            <div>
              <p className="m-0 font-medium">{a.label || a.recipient_name} {a.is_default && <span className="badge badge-ok">{t("addr.default")}</span>}</p>
              <p className="m-0 text-sm">{a.recipient_name} · {a.phone}</p>
              <p className="muted m-0 text-sm">{[a.address_line, a.landmark, a.municipality, a.district].filter(Boolean).join(", ")}</p>
            </div>
            <button className="btn btn-secondary !py-1 text-sm" onClick={async () => { await supabase.from("customer_addresses").delete().eq("id", a.id); reload(); }}>{t("cart.remove")}</button>
          </li>
        ))}
      </ul>
      <form className="card space-y-3" onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        setBusy(true);
        const r = await saveAddress({ ...Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)])), is_default: fd.get("is_default") === "on" });
        setBusy(false);
        if (r) setErr(t("err.VALIDATION_FAILED")); else { setErr(null); form.reset(); reload(); }
      }}>
        <h2 className="m-0 font-semibold">{t("addr.add")}</h2>
        <label className="field"><span>{t("addr.label")}</span><input name="label" placeholder="Home / Office" /></label>
        <label className="field"><span>{t("checkout.name")}</span><input name="recipient_name" required /></label>
        <label className="field"><span>{t("checkout.phone")}</span><input name="phone" required inputMode="tel" /></label>
        <label className="field"><span>{t("checkout.address_line")}</span><input name="address_line" required /></label>
        <label className="field"><span>{t("checkout.landmark")}</span><input name="landmark" /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="field"><span>{t("checkout.municipality")}</span><input name="municipality" /></label>
          <label className="field"><span>{t("checkout.district")}</span><input name="district" /></label>
        </div>
        <label className="field"><span>{t("checkout.zone")}</span><select name="delivery_zone_id"><option value="">—</option>{data?.zones.map((z) => <option key={z.id} value={z.id}>{pick(locale, z.name_en, z.name_ne)}</option>)}</select></label>
        <label className="flex items-center gap-2"><input type="checkbox" name="is_default" />{t("addr.default")}</label>
        {err && <ErrorBox>{err}</ErrorBox>}
        <button className="btn btn-primary" disabled={busy}>{t("admin.save")}</button>
      </form>
    </main>
  );
}
