import { randomUUID } from "@/lib/uuid";
import { useState } from "react";
import { Check, CircleCheck } from "@/ui";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useT, dateLocale } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { trackOrder } from "@/lib/api";
import { formatNpr } from "@/lib/money";
import { useQuery } from "@/lib/useQuery";
import PushToggle from "@/components/PushToggle";
import { ErrorBox, Loading, OkBox, useTitle } from "@/components/ui";

type Tracking = {
  orderNumber: string; status: string; paymentStatus: string; paymentMethod: string; placedAt: string; total_paisa: number;
  timeline: { status: string; at: string }[];
};

async function toWebp(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/webp", 0.85));
}

function PaymentProof({ token, onDone }: { token: string; onDone: () => void }) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(file: File) {
    setMsg(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) { setMsg({ ok: false, text: t("pay.file_bad") }); return; }
    setBusy(true);
    try {
      const path = `proofs/${randomUUID()}.webp`;
      const up = await supabase.storage.from("payment-proofs").upload(path, await toWebp(file), { contentType: "image/webp" });
      if (up.error) throw up.error;
      const { error } = await supabase.rpc("submit_payment_proof", { p_token: token, p_reference: ref || null, p_proof_path: path });
      if (error) throw error;
      setMsg({ ok: true, text: t("pay.submitted") });
      onDone();
    } catch { setMsg({ ok: false, text: t("err.UNKNOWN") }); }
    setBusy(false);
  }

  return (
    <section className="card space-y-3">
      <h3 className="m-0 font-semibold">{t("pay.upload_title")}</h3>
      <p className="muted m-0 text-sm">{t("pay.upload_hint")}</p>
      <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder={t("pay.reference")} aria-label={t("pay.reference")} maxLength={100} />
      <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} aria-label={t("pay.upload_title")}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) submit(f); e.target.value = ""; }} />
      {msg && (msg.ok ? <OkBox>{msg.text}</OkBox> : <ErrorBox>{msg.text}</ErrorBox>)}
    </section>
  );
}

export default function Track() {
  const { t, locale } = useT();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const token = sp.get("token") ?? undefined;
  const number = sp.get("number") ?? undefined;
  const phone = sp.get("phone") ?? undefined;
  const isNew = !!sp.get("new");
  const [copied, setCopied] = useState(false);
  useTitle(t("track.title"));

  const search = !!token || !!(number && phone);
  const { data, loading, reload } = useQuery(async () => {
    if (!search) return { order: null as Tracking | null, instructions: null as string | null };
    const order = (await trackOrder({ token, number, phone })) as Tracking | null;
    let instructions: string | null = null;
    if (order?.paymentMethod === "manual") {
      const { data: st } = await supabase.from("store_settings").select("payment_settings").single();
      const ps = (st?.payment_settings ?? {}) as { instructions_en?: string; instructions_ne?: string };
      instructions = (locale === "ne" && ps.instructions_ne) || ps.instructions_en || null;
    }
    return { order, instructions };
  }, [token, number, phone, locale]);

  const order = data?.order ?? null;
  const fmt = (d: string) => new Date(d).toLocaleString(dateLocale(locale), { dateStyle: "medium", timeStyle: "short" });
  const tone = (s: string) => (s === "delivered" ? "badge-ok" : s === "cancelled" || s === "rejected" ? "badge-err" : s === "pending_confirmation" ? "badge-warn" : "badge-info");
  const needsProof = !!token && order?.paymentMethod === "manual" && ["unpaid", "rejected"].includes(order.paymentStatus) && !["cancelled", "rejected"].includes(order.status);

  async function copy() {
    const url = new URL(window.location.href); url.searchParams.delete("new");
    try { await navigator.clipboard.writeText(url.toString()); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  }

  if (search && loading && !data) return <Loading />;

  return (
    <main className="container-page max-w-2xl space-y-4">
      {order && isNew && (
        <div className="card text-center" style={{ background: "var(--color-surface-success)" }}>
          <CircleCheck aria-hidden size={40} strokeWidth={1.75} className="mx-auto text-success" />
          <h1 className="m-0 text-2xl font-bold">{t("track.placed")}</h1>
          <p className="mt-1">{t("track.save")}</p>
          <button className="btn btn-secondary mt-3" onClick={copy}>{copied ? <Check aria-label={t("common.saved")} size={20} /> : t("track.copy")}</button>
        </div>
      )}
      {!order && <h1 className="text-3xl font-bold">{t("track.title")}</h1>}

      {order ? (
        <section className="card space-y-3" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="m-0 text-xl font-semibold">{order.orderNumber}</h2>
            <span className={`badge ${tone(order.status)}`}>{t(`status.${order.status}`)}</span>
          </div>
          <p className="m-0">{formatNpr(order.total_paisa)} · <span className="muted">{t(`pay.${order.paymentStatus}`)}</span></p>
          <h3 className="m-0 font-semibold">{t("track.timeline")}</h3>
          <ol className="m-0 list-none space-y-2 border-l-2 border-line p-0 pl-4">
            {order.timeline.map((e, i) => <li key={i}><p className="m-0 font-medium">{t(`status.${e.status}`)}</p><p className="muted m-0 text-xs">{fmt(e.at)}</p></li>)}
          </ol>
          {data?.instructions && <p className="card m-0 whitespace-pre-line text-sm">{data.instructions}</p>}
          <div className="flex flex-wrap gap-2">
            {token && <PushToggle orderToken={token} />}
            <Link to="/shop" className="btn btn-secondary">{t("track.continue")}</Link>
          </div>
          {needsProof && <PaymentProof token={token!} onDone={reload} />}
        </section>
      ) : (
        <>
          {sp.get("placed") && <p className="alert" role="status">{t("track.placed")}</p>}
          {search && <ErrorBox>{t("track.not_found")}</ErrorBox>}
          <form className="card space-y-3" onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            nav(`/track?number=${encodeURIComponent(String(f.get("number")))}&phone=${encodeURIComponent(String(f.get("phone")))}`);
          }}>
            <label className="field"><span>{t("track.number")}</span><input name="number" placeholder="ORD-100000" required defaultValue={number} /></label>
            <label className="field"><span>{t("track.phone")}</span><input name="phone" inputMode="tel" required defaultValue={phone} /></label>
            <button className="btn btn-primary w-full">{t("track.find")}</button>
          </form>
        </>
      )}
    </main>
  );
}
