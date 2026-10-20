import { useState } from "react";
import { Heart, MapPin, Receipt, Star } from "@/ui";
import { Link } from "react-router-dom";
import { useT, dateLocale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { cancelOrder, submitReview } from "@/lib/api";
import { formatNpr } from "@/lib/money";
import { useQuery } from "@/lib/useQuery";
import PushToggle from "@/components/PushToggle";
import { ErrorBox, Loading, OkBox, useTitle } from "@/components/ui";

type Order = {
  id: string; order_number: string; status: string; payment_status: string; total_paisa: number; placed_at: string;
  order_items: { id: string; name_en: string; product_id: string | null }[];
};

function ReviewForm({ orderItemId, name, onDone }: { orderItemId: string; name: string; onDone: () => void }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (msg?.ok) return <OkBox>{msg.text}</OkBox>;
  if (!open) return <button className="btn btn-secondary !py-1 text-sm" onClick={() => setOpen(true)}><Star aria-hidden size={18} strokeWidth={1.75} /> {t("review.write")}: {name}</button>;
  return (
    <div className="card space-y-2">
      <p className="m-0 font-medium">{name}</p>
      <label className="field"><span>{t("review.rating")}</span>
        <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{t("rating.stars", { value: n })}</option>)}</select>
      </label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("review.title")} maxLength={120} aria-label={t("review.title")} />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("review.body")} maxLength={2000} rows={3} aria-label={t("review.body")} />
      {msg && <ErrorBox>{msg.text}</ErrorBox>}
      <button className="btn btn-primary" disabled={busy} onClick={async () => {
        setBusy(true);
        const e = await submitReview(orderItemId, rating, title, body);
        setBusy(false);
        setMsg(e ? { ok: false, text: e === "REVIEW_EXISTS" ? t("review.exists") : t("err.UNKNOWN") } : { ok: true, text: t("review.thanks") });
        if (!e) onDone();
      }}>{t("review.send")}</button>
    </div>
  );
}

export default function Account() {
  const { t, locale } = useT();
  const { user } = useAuth();
  useTitle(t("account.title"));
  const { data, loading, reload } = useQuery(async () => {
    const [o, r, n] = await Promise.all([
      supabase.from("orders").select("id,order_number,status,payment_status,total_paisa,placed_at,order_items(id,name_en,product_id)").eq("user_id", user!.id).order("placed_at", { ascending: false }),
      supabase.from("reviews").select("product_id").eq("user_id", user!.id),
      supabase.rpc("my_notifications", { p_limit: 10 }),
    ]);
    return { orders: (o.data ?? []) as Order[], reviewed: new Set((r.data ?? []).map((x) => x.product_id)), notes: (n.data ?? []) as { id: string; type: string; created_at: string }[] };
  }, [user?.id]);

  if (loading && !data) return <Loading />;
  const d = data!;
  const when = (iso: string, withTime = false) => new Date(iso).toLocaleString(dateLocale(locale), withTime ? { dateStyle: "short", timeStyle: "short" } : { dateStyle: "medium" });

  return (
    <main className="container-page max-w-3xl space-y-4">
      <h1 className="text-3xl font-bold">{t("account.title")}</h1>
      <p className="muted m-0">{user?.email}</p>
      <div className="flex flex-wrap gap-2">
        <Link className="btn btn-secondary" to="/account/wishlist"><Heart aria-hidden size={20} strokeWidth={1.75} /> {t("wish.title")}</Link>
        <Link className="btn btn-secondary" to="/account/addresses"><MapPin aria-hidden size={20} strokeWidth={1.75} /> {t("addr.title")}</Link>
        <PushToggle />
      </div>
      <h2 className="text-xl font-semibold">{t("account.orders")}</h2>
      {d.orders.length ? (
        <ul className="m-0 list-none space-y-3 p-0">
          {d.orders.map((o) => (
            <li key={o.id} className="card space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="m-0 font-semibold">{o.order_number} · {formatNpr(o.total_paisa)}</p>
                  <p className="muted m-0 text-sm">{when(o.placed_at)} · {t(`pay.${o.payment_status}`)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge badge-info">{t(`status.${o.status}`)}</span>
                  {o.status === "pending_confirmation" && <button className="btn btn-secondary !py-1 text-sm" onClick={async () => { await cancelOrder(o.id); reload(); }}>{t("track.cancel")}</button>}
                  <Link className="btn btn-secondary !py-1 text-sm" to={`/orders/${o.id}/invoice`} aria-label={t("invoice.title")}><Receipt aria-hidden size={20} strokeWidth={1.75} /></Link>
                </div>
              </div>
              {o.status === "delivered" && o.order_items.filter((i) => i.product_id && !d.reviewed.has(i.product_id)).map((i) => (
                <ReviewForm key={i.id} orderItemId={i.id} name={i.name_en} onDone={reload} />
              ))}
            </li>
          ))}
        </ul>
      ) : <p className="muted">{t("account.none")} <Link to="/shop" className="underline">{t("cart.continue")}</Link></p>}
      {!!d.notes.length && (
        <section>
          <h2 className="mb-2 text-xl font-semibold">{t("push.history")}</h2>
          <ul className="m-0 list-none space-y-1 p-0 text-sm">{d.notes.map((n) => <li key={n.id} className="muted">{when(n.created_at, true)} · {t(`notif.${n.type}`)}</li>)}</ul>
        </section>
      )}
    </main>
  );
}
