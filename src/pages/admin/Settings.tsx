import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { saveSettings } from "@/lib/api";
import { paisaToRupees } from "@/lib/money";
import { useQuery } from "@/lib/useQuery";
import { ErrorBox, Loading, OkBox, useTitle } from "@/components/ui";

// Full row (operational fields included): only readable through admin_store_settings(), which needs settings.manage.
type StoreSettingsRow = {
  store_name: string; contact_phone: string | null; whatsapp_number: string | null; contact_email: string | null;
  free_delivery_threshold_paisa: number | null; unconfirmed_expiry_hours: number;
  payment_settings: unknown; business_info: unknown; policies: unknown;
};

export default function Settings() {
  const { t } = useT();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useTitle(t("admin.settings"));
  const { data: s, loading } = useQuery(async () => (await supabase.rpc("admin_store_settings")).data as StoreSettingsRow | null, []);
  if (loading && !s) return <Loading />;
  if (!s) return null;
  const ps = (s.payment_settings ?? {}) as { cod_enabled?: boolean; manual_enabled?: boolean; instructions_en?: string; instructions_ne?: string };
  const bi = (s.business_info ?? {}) as { legal_name?: string; address?: string; pan?: string; vat?: string };
  const pol = (s.policies ?? {}) as { returns_en?: string; returns_ne?: string };

  return (
    <main className="max-w-xl space-y-4">
      <h1 className="text-3xl font-bold">{t("admin.settings")}</h1>
      {msg && (msg.ok ? <OkBox>{msg.text}</OkBox> : <ErrorBox>{msg.text}</ErrorBox>)}
      <form className="card space-y-3" onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const f: Record<string, string | boolean> = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]));
        f.cod_enabled = fd.get("cod_enabled") === "on"; f.manual_enabled = fd.get("manual_enabled") === "on";
        const err = await saveSettings(f);
        setMsg(err ? { ok: false, text: err } : { ok: true, text: t("common.saved") });
      }}>
        <label className="field"><span>{t("admin.store_name")}</span><input name="store_name" required defaultValue={s.store_name} /></label>
        <label className="field"><span>{t("admin.phone")}</span><input name="contact_phone" defaultValue={s.contact_phone ?? ""} /></label>
        <label className="field"><span>{t("admin.whatsapp")}</span><input name="whatsapp_number" placeholder="9779812345678" defaultValue={s.whatsapp_number ?? ""} /></label>
        <label className="field"><span>{t("admin.email")}</span><input name="contact_email" type="email" defaultValue={s.contact_email ?? ""} /></label>
        <label className="field"><span>{t("admin.threshold")}</span><input name="threshold" type="number" min="0" step="1" defaultValue={s.free_delivery_threshold_paisa != null ? paisaToRupees(s.free_delivery_threshold_paisa) : ""} /></label>
        <label className="field"><span>{t("admin.expiry")}</span><input name="expiry" type="number" min="1" max="720" defaultValue={s.unconfirmed_expiry_hours} /></label>
        <h2 className="m-0 pt-2 font-semibold">{t("admin.payment")}</h2>
        <label className="flex items-center gap-2"><input type="checkbox" name="cod_enabled" defaultChecked={ps.cod_enabled !== false} />{t("admin.cod")}</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="manual_enabled" defaultChecked={!!ps.manual_enabled} />{t("admin.manual")}</label>
        <label className="field"><span>{t("admin.instr_en")}</span><textarea name="instructions_en" rows={3} defaultValue={ps.instructions_en ?? ""} /></label>
        <label className="field"><span>{t("admin.instr_ne")}</span><textarea name="instructions_ne" lang="ne" rows={3} defaultValue={ps.instructions_ne ?? ""} /></label>
        <h2 className="m-0 pt-2 font-semibold">{t("admin.business")}</h2>
        <label className="field"><span>{t("admin.legal")}</span><input name="legal_name" defaultValue={bi.legal_name ?? ""} /></label>
        <label className="field"><span>{t("admin.address")}</span><input name="address" defaultValue={bi.address ?? ""} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="field"><span>PAN</span><input name="pan" defaultValue={bi.pan ?? ""} /></label>
          <label className="field"><span>VAT</span><input name="vat" defaultValue={bi.vat ?? ""} /></label>
        </div>
        <label className="field"><span>{t("admin.returns_en")}</span><textarea name="returns_en" rows={3} defaultValue={pol.returns_en ?? ""} /></label>
        <label className="field"><span>{t("admin.returns_ne")}</span><textarea name="returns_ne" lang="ne" rows={3} defaultValue={pol.returns_ne ?? ""} /></label>
        <button className="btn btn-primary">{t("admin.save")}</button>
      </form>
    </main>
  );
}
