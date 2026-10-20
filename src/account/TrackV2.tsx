import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Badge, Button, buttonStyles, Check, CircleCheck, Clock, Download, Field, Input, MessageCircle, Package, Share2, Skeleton, Truck, X, House, type LucideIcon } from "@/ui";
import { useQuery } from "@tanstack/react-query";
import { useT, dateLocale } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { trackOrder } from "@/lib/api";
import { formatNpr } from "@/lib/money";
import { toWebp } from "@/lib/image";
import { useStoreSettings } from "@/lib/queries";
import PushToggle from "@/components/PushToggle";
import { useTitle } from "@/components/ui";
import { PAGE_X } from "@/catalog/layout";
import { useInstall } from "./useInstall";

type Tracking = { orderNumber: string; status: string; paymentStatus: string; paymentMethod: string; placedAt: string; total_paisa: number; timeline: { status: string; at: string }[] };

const ICON: Record<string, LucideIcon> = { pending_confirmation: Clock, confirmed: CircleCheck, processing: Package, dispatched: Truck, delivered: House, cancelled: X, rejected: X };
const tone = (s: string) => (s === "delivered" ? "success" : s === "cancelled" || s === "rejected" ? "danger" : s === "pending_confirmation" ? "warning" : "info") as "success" | "danger" | "warning" | "info";

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
      const path = `proofs/${crypto.randomUUID()}.webp`;
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
    <section aria-labelledby="proof" className="space-y-3 rounded-lg border border-line bg-surface p-4">
      <h3 id="proof" className="m-0 text-lg font-bold">{t("pay.upload_title")}</h3>
      <ol className="m-0 space-y-1 pl-5 text-sm"><li>{t("track.proof.step1")}</li><li>{t("track.proof.step2")}</li><li>{t("track.proof.step3")}</li></ol>
      <Field label={t("pay.reference")}>{(a) => <Input {...a} value={ref} onChange={(e) => setRef(e.target.value)} maxLength={100} />}</Field>
      <Field label={t("track.proof.photo")} hint={t("pay.upload_hint")}>{(a) => <Input {...a} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void submit(f); e.target.value = ""; }} />}</Field>
      {busy && <p role="status" className="m-0 text-sm">{t("common.loading")}</p>}
      {msg && <Alert tone={msg.ok ? "success" : "danger"}>{msg.text}</Alert>}
    </section>
  );
}

export default function TrackV2() {
  const { t, locale } = useT();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const settings = useStoreSettings().data;
  const install = useInstall();
  const token = sp.get("token") ?? undefined;
  const number = sp.get("number") ?? undefined;
  const phone = sp.get("phone") ?? undefined;
  const isNew = !!sp.get("new");
  const [copied, setCopied] = useState(false);
  useTitle(t("track.title"));

  const search = !!token || !!(number && phone);
  const q = useQuery({
    queryKey: ["track", token ?? null, number ?? null, phone ?? null, locale], enabled: search, staleTime: 0, gcTime: 0, // private: never kept
    queryFn: async () => {
      const order = (await trackOrder({ token, number, phone })) as Tracking | null;
      let instructions: string | null = null;
      if (order?.paymentMethod === "manual") {
        const { data: st } = await supabase.from("store_settings").select("payment_settings").single();
        const ps = (st?.payment_settings ?? {}) as { instructions_en?: string; instructions_ne?: string };
        instructions = (locale === "ne" && ps.instructions_ne) || ps.instructions_en || null;
      }
      return { order, instructions };
    },
  });
  const order = q.data?.order ?? null;
  const fmt = (d: string) => new Date(d).toLocaleString(dateLocale(locale), { dateStyle: "medium", timeStyle: "short" });
  const needsProof = !!token && order?.paymentMethod === "manual" && ["unpaid", "rejected"].includes(order.paymentStatus) && !["cancelled", "rejected"].includes(order.status);
  const waNum = settings?.whatsapp_number?.replace(/\D/g, "");
  const link = () => { const u = new URL(window.location.href); u.searchParams.delete("new"); return u.toString(); };
  async function copy() { try { await navigator.clipboard.writeText(link()); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ } }
  async function share() { if (navigator.share) { try { await navigator.share({ title: order?.orderNumber, url: link() }); } catch { /* cancelled */ } } else await copy(); }

  if (search && q.isLoading) return <main className={`${PAGE_X} max-w-2xl space-y-3 py-4`}><Skeleton variant="row" className="h-40" /><Skeleton variant="row" className="h-40" /></main>;

  return (
    <main className={`${PAGE_X} max-w-2xl space-y-4 py-4`}>
      {order && isNew && (
        <section aria-labelledby="placed" className="space-y-3 rounded-xl bg-[var(--success-tint)] p-5 text-center text-ink">
          <CircleCheck aria-hidden size={44} strokeWidth={1.75} className="mx-auto text-success" />
          <h1 id="placed" className="m-0 text-2xl font-bold">{t("track.placed")}</h1>
          <p className="m-0 text-lg font-bold">{order.orderNumber}</p>
          <p className="m-0">{t("track.save")}</p>
          <ul className="m-0 list-none space-y-1 p-0 text-left text-sm"><li>1. {t("track.next1")}</li><li>2. {t("track.next2")}</li><li>3. {t("track.next3")}</li></ul>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="secondary" leadingIcon={copied ? Check : undefined} onClick={() => void copy()}>{copied ? t("common.saved") : t("track.copy")}</Button>
            <Button variant="secondary" leadingIcon={Share2} onClick={() => void share()}>{t("pdp.share")}</Button>
            {install.canInstall && <Button leadingIcon={Download} onClick={() => void install.install()}>{t("install.cta")}</Button>}
          </div>
          {install.canInstall && <button type="button" onClick={install.dismiss} className="min-h-12 text-sm underline">{t("install.later")}</button>}
        </section>
      )}
      {!order && <h1 className="m-0 text-3xl font-bold">{t("track.title")}</h1>}

      {order ? (
        <section aria-live="polite" className="space-y-4 rounded-lg border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="m-0 text-xl font-bold">{order.orderNumber}</h2>
            <Badge tone={tone(order.status)} icon={ICON[order.status] ?? Clock}>{t(`status.${order.status}`)}</Badge>
          </div>
          <p className="m-0">{formatNpr(order.total_paisa)} · <span className="text-muted">{t(`pay.${order.paymentStatus}`)}</span></p>
          <h3 className="m-0 text-lg font-bold">{t("track.timeline")}</h3>
          <ol className="m-0 list-none space-y-4 p-0">
            {order.timeline.map((e, i) => {
              const Icon = ICON[e.status] ?? Clock;
              const last = i === order.timeline.length - 1;
              return (
                <li key={i} aria-current={last ? "step" : undefined} className="flex gap-3">
                  <span aria-hidden className={`flex size-9 shrink-0 items-center justify-center rounded-full ${last ? "bg-brand text-on-brand" : "bg-surface-2 text-ink"}`}><Icon size={18} strokeWidth={2} /></span>
                  <div><p className="m-0 font-semibold">{t(`status.${e.status}`)}</p><p className="m-0 text-xs text-muted">{fmt(e.at)}</p></div>
                </li>
              );
            })}
          </ol>
          {q.data?.instructions && <Alert tone="info"><p className="m-0 whitespace-pre-line text-sm">{q.data.instructions}</p></Alert>}
          {needsProof && <PaymentProof token={token!} onDone={() => void q.refetch()} />}
          <div className="flex flex-wrap gap-2">
            {token && <PushToggle orderToken={token} />}
            {waNum && <a className={buttonStyles({ variant: "secondary" })} target="_blank" rel="noopener noreferrer" href={`https://wa.me/${waNum}?text=${encodeURIComponent(`${t("track.wa")} ${order.orderNumber}`)}`}><MessageCircle aria-hidden size={20} strokeWidth={1.75} />{t("track.ask_vendor")}</a>}
            <Link to="/shop" className={buttonStyles({ variant: "ghost" })}>{t("track.continue")}</Link>
          </div>
        </section>
      ) : (
        <>
          {search && <Alert tone="danger">{t("track.not_found")}</Alert>}
          <form className="space-y-3 rounded-lg border border-line bg-surface p-4" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); nav(`/track?number=${encodeURIComponent(String(f.get("number")))}&phone=${encodeURIComponent(String(f.get("phone")))}`); }}>
            <Field label={t("track.number")} required>{(a) => <Input {...a} name="number" placeholder="ORD-100000" defaultValue={number} autoCapitalize="characters" />}</Field>
            <Field label={t("track.phone")} required>{(a) => <Input {...a} name="phone" type="tel" inputMode="tel" defaultValue={phone} autoComplete="tel" />}</Field>
            <Button type="submit" block size="lg">{t("track.find")}</Button>
          </form>
        </>
      )}
    </main>
  );
}
