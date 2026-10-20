import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { saveZone } from "@/lib/api";
import { formatNpr, paisaToRupees } from "@/lib/money";
import { useQuery } from "@/lib/useQuery";
import { ErrorBox, Loading, OkBox, useTitle } from "@/components/ui";

export default function Zones() {
  const { t } = useT();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useTitle(t("admin.zones"));
  const { data, loading, reload } = useQuery(async () => (await supabase.from("delivery_zones").select("*").order("sort_order")).data ?? [], []);
  if (loading && !data) return <Loading />;

  const submit = (reset: boolean) => async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = Object.fromEntries([...new FormData(form).entries()].map(([k, v]) => [k, String(v)]));
    const err = await saveZone(f);
    setMsg(err ? { ok: false, text: err } : { ok: true, text: "✓" });
    if (!err) { if (reset) form.reset(); reload(); }
  };

  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-bold">{t("admin.zones")}</h1>
      {msg && (msg.ok ? <OkBox>{msg.text}</OkBox> : <ErrorBox>{msg.text}</ErrorBox>)}
      <ul className="m-0 list-none space-y-3 p-0">
        {data?.map((z) => (
          <li key={z.id} className="card">
            <form className="grid gap-2 sm:grid-cols-4" onSubmit={submit(false)}>
              <input type="hidden" name="id" value={z.id} />
              <input name="name_en" defaultValue={z.name_en} required aria-label="Name (EN)" />
              <input name="name_ne" defaultValue={z.name_ne ?? ""} lang="ne" aria-label="Name (NE)" />
              <input name="fee" type="number" min="0" step="0.01" defaultValue={paisaToRupees(z.fee_paisa)} aria-label="Fee (Rs.)" />
              <input name="threshold" type="number" min="0" step="0.01" defaultValue={z.free_threshold_paisa != null ? paisaToRupees(z.free_threshold_paisa) : ""} placeholder="Free over (Rs.)" aria-label="Free delivery threshold" />
              <button className="btn btn-primary sm:col-span-3">{t("admin.save")} · {formatNpr(z.fee_paisa)}</button>
              <button type="button" className={`badge ${z.is_active ? "badge-ok" : "badge-err"} cursor-pointer`} style={{ minHeight: 44 }} aria-pressed={z.is_active}
                onClick={async () => { await supabase.from("delivery_zones").update({ is_active: !z.is_active }).eq("id", z.id); reload(); }}>
                {z.is_active ? "Active" : "Disabled"}
              </button>
            </form>
          </li>
        ))}
      </ul>
      <form className="card grid gap-2 sm:grid-cols-4" onSubmit={submit(true)}>
        <h2 className="m-0 font-semibold sm:col-span-4">+ {t("admin.zones")}</h2>
        <input name="name_en" required placeholder="Name (EN)" aria-label="Name (EN)" />
        <input name="name_ne" lang="ne" placeholder="Name (NE)" aria-label="Name (NE)" />
        <input name="fee" type="number" min="0" step="0.01" required placeholder="Fee (Rs.)" aria-label="Fee" />
        <input name="threshold" type="number" min="0" step="0.01" placeholder="Free over (Rs.)" aria-label="Threshold" />
        <button className="btn btn-primary sm:col-span-4">{t("admin.save")}</button>
      </form>
    </main>
  );
}
