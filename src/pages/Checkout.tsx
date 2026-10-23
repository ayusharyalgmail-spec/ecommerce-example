import { randomUUID } from "@/lib/uuid";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/lib/cart";
import { useT, pick } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { placeOrder, quoteCheckout, type Quote } from "@/lib/api";
import { formatNpr } from "@/lib/money";
import { useQuery } from "@/lib/useQuery";
import { ErrorBox, Loading, useTitle } from "@/components/ui";

type Addr = { id: string; label: string | null; recipient_name: string; phone: string; address_line: string; landmark: string | null; municipality: string | null; district: string | null; delivery_zone_id: string | null };

export default function Checkout() {
  const { items, clear } = useCart();
  const { t, locale } = useT();
  const { user } = useAuth();
  const nav = useNavigate();
  useTitle(t("checkout.title"));

  const meta = useQuery(async () => {
    const [z, s, prof, addr] = await Promise.all([
      supabase.from("delivery_zones").select("id,name_en,name_ne,fee_paisa").eq("is_active", true).order("sort_order"),
      supabase.from("store_settings").select("payment_settings").single(),
      user ? supabase.from("profiles").select("full_name,phone").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
      user ? supabase.from("customer_addresses").select("id,label,recipient_name,phone,address_line,landmark,municipality,district,delivery_zone_id").eq("user_id", user.id).order("is_default", { ascending: false }) : Promise.resolve({ data: [] }),
    ]);
    return { zones: z.data ?? [], ps: (s.data?.payment_settings ?? {}) as { cod_enabled?: boolean; manual_enabled?: boolean }, prof: prof.data, addrs: (addr.data ?? []) as Addr[] };
  }, [user?.id]);

  const [f, setF] = useState({ name: "", phone: "", email: "", address: "", landmark: "", municipality: "", district: "" });
  const [zoneId, setZoneId] = useState("");
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState("");
  const [payment, setPayment] = useState<"cod" | "manual">("cod");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lastTotal = useRef<number | null>(null);
  const idem = useRef(randomUUID());
  const seeded = useRef(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  const zones = meta.data?.zones ?? [];
  const ps = meta.data?.ps ?? {};
  const codEnabled = ps.cod_enabled !== false;
  const manualEnabled = !!ps.manual_enabled;

  // Seed defaults once the profile and zones have loaded.
  useEffect(() => {
    if (!meta.data || seeded.current) return;
    seeded.current = true;
    setF((p) => ({ ...p, name: meta.data!.prof?.full_name ?? "", phone: meta.data!.prof?.phone ?? "", email: user?.email ?? "" }));
    setZoneId(meta.data.zones[0]?.id ?? "");
    setPayment(meta.data.ps.cod_enabled !== false ? "cod" : "manual");
  }, [meta.data, user?.email]);

  const itemsKey = JSON.stringify(items);
  useEffect(() => {
    if (!items.length || !zoneId) return;
    let off = false;
    quoteCheckout(items, zoneId, applied).then((r) => {
      if (off) return;
      if (r.ok) {
        // Totals changed under the customer (price/stock/coupon): ask them to confirm again (CHECKOUT-009).
        if (lastTotal.current !== null && lastTotal.current !== r.quote.total_paisa) setError("checkout.price_changed");
        lastTotal.current = r.quote.total_paisa;
        setQuote(r.quote);
      } else { setError(`err.${r.code}`); if (r.code === "COUPON_UNAVAILABLE") setApplied(""); }
    });
    return () => { off = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, zoneId, applied]);

  function applyAddress(id: string) {
    const a = meta.data?.addrs.find((x) => x.id === id);
    if (!a) return;
    setF((p) => ({ ...p, name: a.recipient_name, phone: a.phone, address: a.address_line, landmark: a.landmark ?? "", municipality: a.municipality ?? "", district: a.district ?? "" }));
    if (a.delivery_zone_id && zones.some((z) => z.id === a.delivery_zone_id)) setZoneId(a.delivery_zone_id);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const r = await placeOrder({ idempotencyKey: idem.current, items, zoneId, coupon: applied, paymentMethod: payment, ...f, locale });
    setBusy(false);
    if (r.ok) { clear(); nav("token" in r ? `/track?token=${r.token}&new=1` : `/track?number=${encodeURIComponent(r.orderNumber)}&placed=1`, { replace: true }); }
    else { setError(`err.${r.code}`); if (!r.retryable && r.code !== "IDEMPOTENCY_CONFLICT") idem.current = randomUUID(); }
  }

  if (!items.length) return <main className="container-page muted">{t("cart.empty")} <Link className="underline" to="/shop">{t("cart.continue")}</Link></main>;
  if (meta.loading && !meta.data) return <Loading />;

  return (
    <main className="container-page space-y-4">
      <h1 className="text-3xl font-bold">{t("checkout.title")}</h1>
      <form onSubmit={submit} className="grid gap-6 md:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <fieldset className="card space-y-3">
            <legend className="px-1 font-semibold">1. {t("checkout.contact")}</legend>
            {!!meta.data?.addrs.length && (
              <label className="field"><span>{t("addr.title")}</span>
                <select defaultValue="" onChange={(e) => applyAddress(e.target.value)}>
                  <option value="">—</option>
                  {meta.data.addrs.map((a) => <option key={a.id} value={a.id}>{a.label ?? a.recipient_name} — {a.address_line}</option>)}
                </select>
              </label>
            )}
            <label className="field"><span>{t("checkout.name")}</span><input required minLength={2} value={f.name} onChange={set("name")} autoComplete="name" /></label>
            <label className="field"><span>{t("checkout.phone")}</span><input required inputMode="tel" pattern="^(\+?977)?9\d{9}$" value={f.phone} onChange={set("phone")} autoComplete="tel" /></label>
            <label className="field"><span>{t("checkout.email")}</span><input type="email" value={f.email} onChange={set("email")} autoComplete="email" /></label>
          </fieldset>
          <fieldset className="card space-y-3">
            <legend className="px-1 font-semibold">2. {t("checkout.address")}</legend>
            <label className="field"><span>{t("checkout.address_line")}</span><input required minLength={3} value={f.address} onChange={set("address")} autoComplete="street-address" /></label>
            <label className="field"><span>{t("checkout.landmark")}</span><input value={f.landmark} onChange={set("landmark")} /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="field"><span>{t("checkout.municipality")}</span><input value={f.municipality} onChange={set("municipality")} /></label>
              <label className="field"><span>{t("checkout.district")}</span><input value={f.district} onChange={set("district")} /></label>
            </div>
            <label className="field"><span>{t("checkout.zone")}</span>
              <select value={zoneId} onChange={(e) => setZoneId(e.target.value)} required>
                {zones.map((z) => <option key={z.id} value={z.id}>{pick(locale, z.name_en, z.name_ne)} — {formatNpr(z.fee_paisa)}</option>)}
              </select>
            </label>
          </fieldset>
          <fieldset className="card space-y-2">
            <legend className="px-1 font-semibold">3. {t("checkout.payment")}</legend>
            {codEnabled && <label className="flex items-center gap-2"><input type="radio" name="pay" checked={payment === "cod"} onChange={() => setPayment("cod")} />{t("checkout.cod")}</label>}
            {manualEnabled && <label className="flex items-center gap-2"><input type="radio" name="pay" checked={payment === "manual"} onChange={() => setPayment("manual")} />{t("checkout.manual")}</label>}
          </fieldset>
        </div>

        <aside className="card h-fit space-y-3 md:sticky md:top-20">
          <div className="flex gap-2">
            <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder={t("checkout.coupon")} aria-label={t("checkout.coupon")} />
            <button type="button" className="btn btn-secondary" onClick={() => setApplied(coupon.trim())}>{t("checkout.apply")}</button>
          </div>
          {quote ? (
            <dl className="m-0 space-y-1 text-sm">
              <div className="flex justify-between"><dt>{t("checkout.items")}</dt><dd className="m-0">{formatNpr(quote.itemsListTotal_paisa)}</dd></div>
              {quote.itemDiscount_paisa > 0 && <div className="flex justify-between text-ok"><dt>{t("checkout.discount")}</dt><dd className="m-0">− {formatNpr(quote.itemDiscount_paisa)}</dd></div>}
              {quote.couponDiscount_paisa > 0 && <div className="flex justify-between text-ok"><dt>{t("checkout.coupon_discount")}</dt><dd className="m-0">− {formatNpr(quote.couponDiscount_paisa)}</dd></div>}
              <div className="flex justify-between"><dt>{t("checkout.delivery")}</dt><dd className="m-0">{quote.deliveryFee_paisa ? formatNpr(quote.deliveryFee_paisa) : "Free"}</dd></div>
              <div className="flex justify-between border-t border-line pt-2 text-lg font-bold"><dt>{t("checkout.total")}</dt><dd className="m-0">{formatNpr(quote.total_paisa)}</dd></div>
            </dl>
          ) : <p className="muted m-0">{t("common.loading")}</p>}
          {error && <ErrorBox>{t(error)}</ErrorBox>}
          <button className="btn btn-primary w-full" disabled={busy || !quote}>{busy ? t("checkout.placing") : t("checkout.place")}</button>
        </aside>
      </form>
    </main>
  );
}
