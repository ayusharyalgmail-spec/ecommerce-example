import { useState } from "react";
import { Receipt, TriangleAlert } from "@/ui";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { formatNpr } from "@/lib/money";
import { useQuery } from "@/lib/useQuery";
import { markCodCollected, recordRefund, transitionOrder, verifyPayment } from "@/lib/api";
import { ErrorBox, Loading, useTitle } from "@/components/ui";

const NEXT: Record<string, string[]> = {
  pending_confirmation: ["confirmed", "rejected", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["dispatched", "cancelled"],
  dispatched: ["delivered", "cancelled"],
};

type Rec = { id: string; kind: string; status: string; amount_paisa: number; reference: string | null; note: string | null; proof_path: string | null };
type Item = { id: string; name_en: string; quantity: number; line_total_paisa: number };
type Ev = { id: number; to_status: string; created_at: string; actor_type: string };

export default function OrderDetail() {
  const { id } = useParams();
  const { t } = useT();
  const [note, setNote] = useState("");
  const [payNote, setPayNote] = useState("");
  const [refund, setRefund] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, loading, reload } = useQuery(async () => {
    const { data: o } = await supabase.from("orders").select("*, order_items(*), order_status_events(*)").eq("id", id!).maybeSingle();
    if (!o) return null;
    const { data: recs } = await supabase.from("payment_records").select("*").eq("order_id", id!).order("submitted_at");
    const records = await Promise.all(((recs ?? []) as Rec[]).map(async (r) => ({
      ...r, proofUrl: r.proof_path ? (await supabase.storage.from("payment-proofs").createSignedUrl(r.proof_path, 3600)).data?.signedUrl ?? null : null,
    })));
    return { o, records };
  }, [id]);
  useTitle(data?.o.order_number);
  if (loading && data === undefined) return <Loading />;
  if (!data) return <main><h1 className="text-2xl font-bold">404</h1></main>;

  const { o, records } = data;
  const events = [...(o.order_status_events as Ev[])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const next = NEXT[o.status] ?? [];
  const errText = (c: string | null) => (c ? t(`err.${c}`) : null);
  const run = async (p: Promise<string | null>, after?: () => void) => {
    setBusy(true); const e = await p; setBusy(false); setErr(errText(e));
    if (!e) { after?.(); reload(); }
  };

  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-bold">{o.order_number} <span className="badge badge-info align-middle">{t(`status.${o.status}`)}</span></h1>
      {o.risk_flags.length > 0 && <p className="flex items-center gap-2 rounded-lg bg-[var(--warning-tint)] p-2 text-warning"><TriangleAlert aria-hidden size={18} /> {t("admin.risk")}: {o.risk_flags.join(", ")}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card space-y-1">
          <h2 className="m-0 font-semibold">{t("admin.customer")}</h2>
          <p className="m-0">{o.customer_name} · <a className="underline" href={`tel:${o.customer_phone}`}>{o.customer_phone}</a></p>
          {o.customer_email && <p className="muted m-0">{o.customer_email}</p>}
          <p className="m-0">{o.ship_address_line}{o.ship_landmark ? `, ${o.ship_landmark}` : ""}</p>
          <p className="muted m-0">{[o.ship_municipality, o.ship_district, o.delivery_zone_name].filter(Boolean).join(" · ")}</p>
          <p className="muted m-0">{o.payment_method.toUpperCase()} · {t(`pay.${o.payment_status}`)}</p>
        </section>
        <section className="card">
          <h2 className="mb-2 mt-0 font-semibold">{t("track.timeline")}</h2>
          <ol className="m-0 list-none space-y-1 p-0 text-sm">
            {events.map((e) => <li key={e.id}>{t(`status.${e.to_status}`)} <span className="muted">· {new Date(e.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })} · {e.actor_type}</span></li>)}
          </ol>
        </section>
      </div>
      <section className="card">
        <ul className="m-0 list-none p-0">
          {(o.order_items as Item[]).map((i) => <li key={i.id} className="flex justify-between py-2" style={{ borderBottom: "1px solid var(--color-border)" }}><span>{i.name_en} × {i.quantity}</span><span>{formatNpr(i.line_total_paisa)}</span></li>)}
        </ul>
        <dl className="m-0 mt-2 space-y-1 pt-2 text-sm">
          {o.item_discount_paisa > 0 && <div className="flex justify-between"><dt>{t("checkout.discount")}</dt><dd className="m-0">− {formatNpr(o.item_discount_paisa)}</dd></div>}
          {o.coupon_discount_paisa > 0 && <div className="flex justify-between"><dt>{t("checkout.coupon_discount")} {o.coupon_code}</dt><dd className="m-0">− {formatNpr(o.coupon_discount_paisa)}</dd></div>}
          <div className="flex justify-between"><dt>{t("checkout.delivery")}</dt><dd className="m-0">{formatNpr(o.delivery_fee_paisa)}</dd></div>
          <div className="flex justify-between text-lg font-bold"><dt>{t("checkout.total")}</dt><dd className="m-0">{formatNpr(o.total_paisa)}</dd></div>
        </dl>
      </section>

      <section className="card space-y-3 no-print">
        <h2 className="m-0 font-semibold">{t("pay.title")}</h2>
        {!records.length && <p className="muted m-0 text-sm">—</p>}
        <ul className="m-0 list-none space-y-2 p-0">
          {records.map((r) => (
            <li key={r.id} className="rounded-lg p-3 text-sm" style={{ border: "1px solid var(--color-border)" }}>
              <p className="m-0 flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{r.kind} · {formatNpr(r.amount_paisa)}</span>
                <span className={`badge ${r.status === "verified" ? "badge-ok" : r.status === "rejected" ? "badge-err" : "badge-warn"}`}>{r.status}</span>
              </p>
              {r.reference && <p className="muted m-0">Ref: {r.reference}</p>}
              {r.note && <p className="muted m-0">{r.note}</p>}
              {r.proofUrl && <a className="underline" href={r.proofUrl} target="_blank" rel="noopener noreferrer">{t("pay.view_proof")}</a>}
              {r.kind === "payment" && r.status === "submitted" && (
                <div className="mt-2 flex gap-2">
                  <button className="btn btn-primary !py-1" disabled={busy} onClick={() => run(verifyPayment(r.id, "verified", payNote))}>{t("admin.approve")}</button>
                  <button className="btn btn-danger !py-1" disabled={busy} onClick={() => run(verifyPayment(r.id, "rejected", payNote))}>{t("admin.reject")}</button>
                </div>
              )}
            </li>
          ))}
        </ul>
        <input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder={t("admin.note")} aria-label={t("admin.note")} />
        <div className="flex flex-wrap gap-2">
          {o.payment_method === "cod" && o.status === "delivered" && o.payment_status !== "verified" && <button className="btn btn-primary" disabled={busy} onClick={() => run(markCodCollected(o.id))}>{t("pay.cod_collected")}</button>}
          <input className="!w-32" type="number" min="1" max={o.total_paisa / 100} step="0.01" value={refund} onChange={(e) => setRefund(e.target.value)} placeholder={t("pay.amount")} aria-label={t("pay.amount")} />
          <button className="btn btn-secondary" disabled={busy || !Number(refund)} onClick={() => run(recordRefund(o.id, Number(refund), payNote), () => setRefund(""))}>{t("pay.refund")}</button>
        </div>
      </section>

      <Link to={`/orders/${o.id}/invoice`} className="btn btn-secondary no-print no-underline" target="_blank"><Receipt aria-hidden size={20} strokeWidth={1.75} /> {t("invoice.title")}</Link>

      {next.length > 0 && (
        <section className="card space-y-3 no-print">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("admin.note")} aria-label={t("admin.note")} />
          <div className="flex flex-wrap gap-2">
            {next.map((to) => (
              <button key={to} disabled={busy} className={`btn ${to === "cancelled" || to === "rejected" ? "btn-danger" : "btn-primary"}`}
                onClick={() => run(transitionOrder(o.id, to, o.status, note), () => setNote(""))}>{t(`status.${to}`)}</button>
            ))}
          </div>
        </section>
      )}
      {err && <ErrorBox>{err}</ErrorBox>}
    </main>
  );
}
