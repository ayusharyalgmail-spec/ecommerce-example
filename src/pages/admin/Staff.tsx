import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { inviteStaff } from "@/lib/api";
import { useQuery } from "@/lib/useQuery";
import { ErrorBox, Loading, OkBox, useTitle } from "@/components/ui";

const EXTRA = ["products.manage", "orders.verify_payment", "customers.view", "coupons.manage", "delivery.manage", "reviews.moderate", "reports.view", "csv.manage", "audit.view"];
type Member = { user_id: string; email: string; role: string; is_active: boolean };

export default function Staff() {
  const { t } = useT();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useTitle(t("admin.staff"));
  const { data, loading, reload } = useQuery(async () => {
    const [s, i] = await Promise.all([supabase.rpc("list_staff"), supabase.from("staff_invites").select("email,role")]);
    return { staff: (s.data ?? []) as Member[], invites: i.data ?? [] };
  }, []);
  if (loading && !data) return <Loading />;
  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-bold">{t("admin.staff")}</h1>
      {msg && (msg.ok ? <OkBox>{msg.text}</OkBox> : <ErrorBox>{msg.text}</ErrorBox>)}
      <ul className="m-0 list-none space-y-2 p-0">
        {data?.staff.map((m) => (
          <li key={m.user_id} className="card flex flex-wrap items-center justify-between gap-2">
            <div><p className="m-0 font-medium">{m.email}</p><p className="muted m-0 text-sm">{m.role}</p></div>
            <button className={`badge ${m.is_active ? "badge-ok" : "badge-err"} cursor-pointer !px-4`} style={{ minHeight: 44 }} aria-pressed={m.is_active}
              onClick={async () => {
                const { error } = await supabase.from("staff_members").update({ is_active: !m.is_active }).eq("user_id", m.user_id);
                setMsg(error ? { ok: false, text: error.message } : null); reload();
              }}>{m.is_active ? "Active" : "Disabled"}</button>
          </li>
        ))}
        {data?.invites.map((i) => <li key={i.email} className="card flex justify-between"><span>{i.email}</span><span className="badge badge-warn">invited · {i.role}</span></li>)}
      </ul>
      <form className="card space-y-3" onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const err = await inviteStaff(String(fd.get("email")), String(fd.get("role")), fd.getAll("permissions").map(String));
        setMsg(err ? { ok: false, text: err } : { ok: true, text: "✓" });
        if (!err) { form.reset(); reload(); }
      }}>
        <h2 className="m-0 font-semibold">{t("admin.invite")}</h2>
        <p className="muted m-0 text-sm">{t("admin.invite_hint")}</p>
        <input name="email" type="email" required placeholder="email@example.com" aria-label="Email" />
        <select name="role" aria-label="Role"><option value="staff">Staff</option><option value="manager">Manager</option></select>
        <fieldset className="grid grid-cols-1 gap-1 border-0 p-0 sm:grid-cols-2">
          <legend className="muted mb-1 text-sm">Extra permissions (staff role)</legend>
          {EXTRA.map((p) => <label key={p} className="flex items-center gap-2 text-sm"><input type="checkbox" name="permissions" value={p} />{p}</label>)}
        </fieldset>
        <button className="btn btn-primary">{t("admin.invite")}</button>
      </form>
    </main>
  );
}
