import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Badge, Button, buttonStyles, Card, Field, Input, Receipt, Skeleton, TriangleAlert, Clock, CircleCheck, Package, Truck, House, X, type LucideIcon } from "@/ui";
import { supabase } from "@/lib/supabase";
import { useT, dateLocale } from "@/lib/i18n";
import { formatNpr } from "@/lib/money";
import { markCodCollected, recordRefund, transitionOrder, verifyPayment } from "@/lib/api";
import { useTitle } from "@/components/ui";
import { ConfirmDialog } from "./ConfirmDialog";

const NEXT: Record<string, string[]> = {
  pending_confirmation: ["confirmed", "rejected", "cancelled"], confirmed: ["processing", "cancelled"],
  processing: ["dispatched", "cancelled"], dispatched: ["delivered", "cancelled"],
};
const ICON: Record<string, LucideIcon> = { pending_confirmation: Clock, confirmed: CircleCheck, processing: Package, dispatched: Truck, delivered: House, cancelled: X, rejected: X };
const tone = (s: string) => (s === "delivered" ? "success" : s === "cancelled" || s === "rejected" ? "danger" : s === "pending_confirmation" ? "warning" : "info") as "success" | "danger" | "warning" | "info";

type Rec = { id: string; kind: string; status: string; amount_paisa: number; reference: string | null; note: string | null; proof_path: string | null };
type Item = { id: string; name_en: string; quantity: number; line_total_paisa: number };
type Ev = { id: number; to_status: string; created_at: string; actor_type: string };
type Pending = { title: string; body: string; label: string; danger?: boolean; run: () => Promise<string | null>; after?: () => void };

export default function OrderDetailV2() {
  const { id } = useParams();
  const { t, locale } = useT();
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [payNote, setPayNote] = useState("");
  const [refund, setRefund] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<Pending | null>(null);
  const key = ["admin", "order", id];

  const q = useQuery({
    queryKey: key, staleTime: 0, gcTime: 0, // orders contain customer data: do not retain
    queryFn: async () => {
      const { data: o } = await supabase.from("orders").select("*, order_items(*), order_status_events(*)").eq("id", id!).maybeSingle();
      if (!o) return null;
      const { data: recs } = await supabase.from("payment_records").select("*").eq("order_id", id!).order("submitted_at");
      const records = await Promise.all(((recs ?? []) as Rec[]).map(async (r) => ({
        ...r, proofUrl: r.proof_path ? (await supabase.storage.from("payment-proofs").createSignedUrl(r.proof_path, 3600)).data?.signedUrl ?? null : null,
      })));
      return { o, records };
    },
  });
  useTitle(q.data?.o.order_number);
  if (q.isLoading) return <main className="space-y-3"><Skeleton variant="row" className="h-24" /><Skeleton variant="row" className="h-48" /></main>;
  if (!q.data) return <main><h1 className="m-0 text-2xl font-bold">404</h1></main>;

  const { o, records } = q.data;
  const events = [...(o.order_status_events as Ev[])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const next = NEXT[o.status] ?? [];
  const fmt = (d: string) => new Date(d).toLocaleString(dateLocale(locale), { dateStyle: "short", timeStyle: "short" });
  const reload = () => void qc.invalidateQueries({ queryKey: key });
  const execute = async (p: Pending) => {
    setBusy(true); const e = await p.run(); setBusy(false);
    setConfirm(null); setErr(e ? t(`err.${e}`) : null);
    if (!e) { p.after?.(); reload(); }
  };
  const ask = (p: Pending) => setConfirm(p);

  return (
    <main className="space-y-4">
      <h1 className="m-0 flex flex-wrap items-center gap-3 text-3xl font-bold">{o.order_number}<Badge tone={tone(o.status)} icon={ICON[o.status] ?? Clock}>{t(`status.${o.status}`)}</Badge></h1>
      {err && <Alert tone="danger">{err}</Alert>}
      {o.risk_flags.length > 0 && <Alert tone="warning"><span className="flex items-center gap-2"><TriangleAlert aria-hidden size={16} />{t("admin.risk")}: {o.risk_flags.join(", ")}</span></Alert>}

      {next.length > 0 && (
        <Card className="space-y-3 no-print">
          <h2 className="m-0 text-lg font-bold">{t("admin.next_step")}</h2>
          <Field label={t("admin.note")}>{(a) => <Input {...a} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
          <div className="flex flex-wrap gap-2">
            {next.map((to) => {
              const bad = to === "cancelled" || to === "rejected";
              return (
                <Button key={to} variant={bad ? "danger" : "primary"} disabled={busy}
                  onClick={() => (bad ? ask({ title: t(`status.${to}`), body: t("admin.confirm_status", { n: o.order_number, s: t(`status.${to}`) }), label: t(`status.${to}`), danger: true, run: () => transitionOrder(o.id, to, o.status, note), after: () => setNote("") })
                    : void execute({ title: "", body: "", label: "", run: () => transitionOrder(o.id, to, o.status, note), after: () => setNote("") }))}>
                  {t(`status.${to}`)}
                </Button>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-1">
          <h2 className="m-0 text-lg font-bold">{t("admin.customer")}</h2>
          <p className="m-0 font-semibold">{o.customer_name} · <a className="text-ink underline" href={`tel:${o.customer_phone}`}>{o.customer_phone}</a></p>
          {o.customer_email && <p className="m-0 text-muted">{o.customer_email}</p>}
          <p className="m-0">{o.ship_address_line}{o.ship_landmark ? `, ${o.ship_landmark}` : ""}</p>
          <p className="m-0 text-muted">{[o.ship_municipality, o.ship_district, o.delivery_zone_name].filter(Boolean).join(" · ")}</p>
          <p className="m-0 text-muted">{o.payment_method.toUpperCase()} · {t(`pay.${o.payment_status}`)}</p>
        </Card>
        <Card>
          <h2 className="mb-3 mt-0 text-lg font-bold">{t("track.timeline")}</h2>
          <ol className="m-0 list-none space-y-3 p-0">
            {events.map((e, i) => {
              const Icon = ICON[e.to_status] ?? Clock;
              return (
                <li key={e.id} aria-current={i === events.length - 1 ? "step" : undefined} className="flex gap-3">
                  <span aria-hidden className={`flex size-8 shrink-0 items-center justify-center rounded-full ${i === events.length - 1 ? "bg-brand text-on-brand" : "bg-surface-2"}`}><Icon size={16} strokeWidth={2} /></span>
                  <div><p className="m-0 font-semibold">{t(`status.${e.to_status}`)}</p><p className="m-0 text-xs text-muted">{fmt(e.created_at)} · {e.actor_type}</p></div>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>

      <Card>
        <ul className="m-0 list-none p-0">
          {(o.order_items as Item[]).map((i) => <li key={i.id} className="flex justify-between border-b border-line py-2"><span>{i.name_en} × {i.quantity}</span><span>{formatNpr(i.line_total_paisa)}</span></li>)}
        </ul>
        <dl className="m-0 mt-2 space-y-1 text-sm">
          {o.item_discount_paisa > 0 && <div className="flex justify-between"><dt>{t("checkout.discount")}</dt><dd className="m-0">− {formatNpr(o.item_discount_paisa)}</dd></div>}
          {o.coupon_discount_paisa > 0 && <div className="flex justify-between"><dt>{t("checkout.coupon_discount")} {o.coupon_code}</dt><dd className="m-0">− {formatNpr(o.coupon_discount_paisa)}</dd></div>}
          <div className="flex justify-between"><dt>{t("checkout.delivery")}</dt><dd className="m-0">{formatNpr(o.delivery_fee_paisa)}</dd></div>
          <div className="flex justify-between text-lg font-bold"><dt>{t("checkout.total")}</dt><dd className="m-0">{formatNpr(o.total_paisa)}</dd></div>
        </dl>
      </Card>

      <Card className="space-y-3 no-print">
        <h2 className="m-0 text-lg font-bold">{t("pay.title")}</h2>
        {!records.length && <p className="m-0 text-sm text-muted">{t("admin.no_payments")}</p>}
        <ul className="m-0 list-none space-y-2 p-0">
          {records.map((r) => (
            <li key={r.id} className="rounded-md border border-line p-3 text-sm">
              <p className="m-0 flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{r.kind} · {formatNpr(r.amount_paisa)}</span>
                <Badge tone={r.status === "verified" ? "success" : r.status === "rejected" ? "danger" : "warning"}>{r.status}</Badge>
              </p>
              {r.reference && <p className="m-0 text-muted">Ref: {r.reference}</p>}
              {r.note && <p className="m-0 text-muted">{r.note}</p>}
              {r.proofUrl && <a className="text-ink underline" href={r.proofUrl} target="_blank" rel="noopener noreferrer">{t("pay.view_proof")}</a>}
              {r.kind === "payment" && r.status === "submitted" && (
                <div className="mt-2 flex gap-2">
                  <Button size="sm" disabled={busy} onClick={() => ask({ title: t("admin.approve"), body: t("admin.confirm_pay_ok", { amount: formatNpr(r.amount_paisa) }), label: t("admin.approve"), run: () => verifyPayment(r.id, "verified", payNote) })}>{t("admin.approve")}</Button>
                  <Button size="sm" variant="danger" disabled={busy} onClick={() => ask({ title: t("admin.reject"), body: t("admin.confirm_pay_no"), label: t("admin.reject"), danger: true, run: () => verifyPayment(r.id, "rejected", payNote) })}>{t("admin.reject")}</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
        <Field label={t("admin.note")}>{(a) => <Input {...a} value={payNote} onChange={(e) => setPayNote(e.target.value)} />}</Field>
        <div className="flex flex-wrap items-end gap-2">
          {o.payment_method === "cod" && o.status === "delivered" && o.payment_status !== "verified" && (
            <Button disabled={busy} onClick={() => ask({ title: t("pay.cod_collected"), body: t("admin.confirm_cod", { amount: formatNpr(o.total_paisa) }), label: t("pay.cod_collected"), run: () => markCodCollected(o.id) })}>{t("pay.cod_collected")}</Button>
          )}
          <Field label={t("pay.amount")}>{(a) => <Input {...a} className="w-36" type="number" min="1" max={o.total_paisa / 100} step="0.01" value={refund} onChange={(e) => setRefund(e.target.value)} />}</Field>
          <Button variant="secondary" disabled={busy || !Number(refund)} onClick={() => ask({ title: t("pay.refund"), body: t("admin.confirm_refund", { amount: formatNpr(Math.round(Number(refund) * 100)) }), label: t("pay.refund"), danger: true, run: () => recordRefund(o.id, Number(refund), payNote), after: () => setRefund("") })}>{t("pay.refund")}</Button>
        </div>
      </Card>

      <Link to={`/orders/${o.id}/invoice`} className={`${buttonStyles({ variant: "secondary" })} no-print`} target="_blank"><Receipt aria-hidden size={20} strokeWidth={1.75} />{t("invoice.title")}</Link>

      <ConfirmDialog open={!!confirm} onOpenChange={(v) => { if (!v) setConfirm(null); }} title={confirm?.title ?? ""} body={confirm?.body} confirmLabel={confirm?.label ?? ""} danger={confirm?.danger} busy={busy} onConfirm={() => confirm && void execute(confirm)} />
    </main>
  );
}
