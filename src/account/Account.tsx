import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Badge, Button, buttonStyles, Card, Clock, Field, Heart, MapPin, MessageCircle, Package, Receipt, RotateCcw, Select, Skeleton, Star, Textarea, Input, Truck, CircleCheck, X, House, toast, type LucideIcon } from "@/ui";
import { useT, dateLocale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { supabase } from "@/lib/supabase";
import { cancelOrder, submitReview } from "@/lib/api";
import { formatNpr } from "@/lib/money";
import PushToggle from "@/components/PushToggle";
import { useTitle } from "@/components/ui";
import { PAGE_X } from "@/catalog/layout";

type Order = { id: string; order_number: string; status: string; payment_status: string; total_paisa: number; placed_at: string; order_items: { id: string; name_en: string; product_id: string | null; quantity: number }[] };
const ICON: Record<string, LucideIcon> = { pending_confirmation: Clock, confirmed: CircleCheck, processing: Package, dispatched: Truck, delivered: House, cancelled: X, rejected: X };
const tone = (s: string) => (s === "delivered" ? "success" : s === "cancelled" || s === "rejected" ? "danger" : s === "pending_confirmation" ? "warning" : "info") as "success" | "danger" | "warning" | "info";

function ReviewForm({ orderItemId, name, onDone }: { orderItemId: string; name: string; onDone: () => void }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!open) return <Button variant="secondary" size="sm" leadingIcon={Star} onClick={() => setOpen(true)}>{t("review.write")}: {name}</Button>;
  return (
    <form className="space-y-3 rounded-md border border-line bg-surface-2 p-3" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true);
      const r = await submitReview(orderItemId, rating, title, body);
      setBusy(false);
      if (r) setErr(r === "REVIEW_EXISTS" ? t("review.exists") : t("err.UNKNOWN")); else { toast.success(t("review.thanks")); onDone(); }
    }}>
      <p className="m-0 font-semibold">{name}</p>
      <Field label={t("review.rating")}>{(a) => <Select {...a} value={rating} onChange={(e) => setRating(Number(e.target.value))}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{t("rating.stars", { value: n })}</option>)}</Select>}</Field>
      <Field label={t("review.title")}>{(a) => <Input {...a} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />}</Field>
      <Field label={t("review.body")}>{(a) => <Textarea {...a} value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={3} />}</Field>
      {err && <Alert tone="danger">{err}</Alert>}
      <Button type="submit" loading={busy}>{t("review.send")}</Button>
    </form>
  );
}

export default function Account() {
  const { t, locale } = useT();
  const { user } = useAuth();
  const { add } = useCart();
  const nav = useNavigate();
  const qc = useQueryClient();
  useTitle(t("account.title"));
  const key = ["account", user?.id ?? null];
  const q = useQuery({
    queryKey: key, enabled: !!user, staleTime: 0, gcTime: 0, // private data: never retained after leaving the page
    queryFn: async () => {
      const [o, r, n] = await Promise.all([
        supabase.from("orders").select("id,order_number,status,payment_status,total_paisa,placed_at,order_items(id,name_en,product_id,quantity)").eq("user_id", user!.id).order("placed_at", { ascending: false }),
        supabase.from("reviews").select("product_id").eq("user_id", user!.id),
        supabase.rpc("my_notifications", { p_limit: 10 }),
      ]);
      return { orders: (o.data ?? []) as Order[], reviewed: new Set((r.data ?? []).map((x) => x.product_id)), notes: (n.data ?? []) as { id: string; type: string; created_at: string }[] };
    },
  });
  const reload = () => void qc.invalidateQueries({ queryKey: key });
  const when = (iso: string, withTime = false) => new Date(iso).toLocaleString(dateLocale(locale), withTime ? { dateStyle: "short", timeStyle: "short" } : { dateStyle: "medium" });
  const d = q.data;
  const buyAgain = (o: Order) => { o.order_items.forEach((i) => { if (i.product_id) add(i.product_id, i.quantity); }); toast.success(t("account.buy_again_done")); nav("/cart"); };

  return (
    <main className={`${PAGE_X} max-w-3xl space-y-6 py-4`}>
      <header>
        <h1 className="m-0 text-3xl font-bold">{t("account.title")}</h1>
        <p className="m-0 text-muted">{user?.email}</p>
      </header>
      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3">
        {[{ to: "/account/wishlist", icon: Heart, label: t("wish.title") }, { to: "/account/addresses", icon: MapPin, label: t("addr.title") }, { to: "/messages", icon: MessageCircle, label: t("nav.messages") }, { to: "/track", icon: Truck, label: t("track.title") }].map(({ to, icon: Icon, label }) => (
          <li key={to}>
            <Link to={to} className="flex min-h-24 flex-col items-start justify-between gap-2 rounded-lg border border-line bg-surface p-4 font-semibold text-ink no-underline">
              <span aria-hidden className="flex size-10 items-center justify-center rounded-md bg-brand-tint"><Icon size={22} strokeWidth={1.75} /></span>{label}
            </Link>
          </li>
        ))}
      </ul>
      <div><PushToggle /></div>

      <section aria-labelledby="orders" className="space-y-3">
        <h2 id="orders" className="m-0 text-xl font-bold">{t("account.orders")}</h2>
        {q.isLoading ? <Skeleton variant="row" className="h-28" /> : d?.orders.length ? (
          <ul className="m-0 list-none space-y-3 p-0">
            {d.orders.map((o) => (
              <li key={o.id}>
                <Card className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="m-0 font-bold">{o.order_number} · {formatNpr(o.total_paisa)}</p>
                      <p className="m-0 text-sm text-muted">{when(o.placed_at)} · {t(`pay.${o.payment_status}`)}</p>
                    </div>
                    <Badge tone={tone(o.status)} icon={ICON[o.status] ?? Clock}>{t(`status.${o.status}`)}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" leadingIcon={RotateCcw} onClick={() => buyAgain(o)}>{t("account.buy_again")}</Button>
                    <Link className={buttonStyles({ variant: "secondary", size: "sm" })} to={`/orders/${o.id}/invoice`}><Receipt aria-hidden size={20} strokeWidth={1.75} />{t("invoice.title")}</Link>
                    {o.status === "pending_confirmation" && <Button size="sm" variant="ghost" onClick={async () => { await cancelOrder(o.id); reload(); }}>{t("track.cancel")}</Button>}
                  </div>
                  {o.status === "delivered" && o.order_items.filter((i) => i.product_id && !d.reviewed.has(i.product_id)).map((i) => <ReviewForm key={i.id} orderItemId={i.id} name={i.name_en} onDone={reload} />)}
                </Card>
              </li>
            ))}
          </ul>
        ) : <p className="m-0 text-muted">{t("account.none")} <Link to="/shop" className="font-semibold text-ink underline">{t("cart.continue")}</Link></p>}
      </section>

      {!!d?.notes.length && (
        <section aria-labelledby="hist" className="space-y-2">
          <h2 id="hist" className="m-0 text-xl font-bold">{t("push.history")}</h2>
          <ul className="m-0 list-none space-y-1 p-0 text-sm">{d.notes.map((n) => <li key={n.id} className="text-muted">{when(n.created_at, true)} · {t(`notif.${n.type}`)}</li>)}</ul>
        </section>
      )}
    </main>
  );
}
