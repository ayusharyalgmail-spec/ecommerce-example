import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, buttonStyles, ChevronLeft, ChoiceCard, EmptyState, Field, GlassPanel, Input, ShoppingCart, Skeleton } from "@/ui";
import { useCart } from "@/lib/cart";
import { useT, pick } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { placeOrder, quoteCheckout, type Quote } from "@/lib/api";
import { prepareImage } from "@/lib/image";
import { randomUUID } from "@/lib/uuid";
import { formatNpr } from "@/lib/money";
import { useTitle } from "@/components/ui";
import { PAGE_X } from "@/catalog/layout";

// Jitpur-Simara Submetropolitan City — 20 wards
const WARDS = Array.from({ length: 20 }, (_, i) => String(i + 1));
const CITY = "Jitpur-Simara";
const DISTRICT = "Bara";

type Fields = { name: string; phone: string; confirmPhone: string; ward: string; street: string };
const EMPTY: Fields = { name: "", phone: "", confirmPhone: "", ward: "", street: "" };
const DRAFT = "co.draft2";

const readDraft = (): { f: Fields; zoneId: string; payment: "cod" | "manual"; step: number; applied: string } | null => {
  try { return JSON.parse(sessionStorage.getItem(DRAFT) ?? "null"); } catch { return null; }
};

export default function CheckoutV2() {
  const { items, clear } = useCart();
  const { t, locale } = useT();
  const { user } = useAuth();
  const nav = useNavigate();
  useTitle(t("checkout.title"));
  const [draft] = useState(readDraft);

  const meta = useQuery({
    queryKey: ["checkout-meta", user?.id ?? null], staleTime: 60_000,
    queryFn: async () => {
      const [z, s, prof] = await Promise.all([
        supabase.from("delivery_zones").select("id,name_en,name_ne,fee_paisa").eq("is_active", true).order("sort_order"),
        supabase.from("store_settings").select("payment_settings").single(),
        user ? supabase.from("profiles").select("full_name,phone").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      return {
        zones: z.data ?? [],
        ps: (s.data?.payment_settings ?? {}) as { cod_enabled?: boolean; manual_enabled?: boolean; instructions_en?: string; instructions_ne?: string },
        prof: prof.data,
      };
    },
  });

  const [step, setStep] = useState(draft?.step ?? 0);
  const [f, setF] = useState<Fields>(draft?.f ?? EMPTY);
  const [zoneId, setZoneId] = useState(draft?.zoneId ?? "");
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState(draft?.applied ?? "");
  const [payment, setPayment] = useState<"cod" | "manual">(draft?.payment ?? "cod");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofPath, setProofPath] = useState<string | null>(null);
  const lastTotal = useRef<number | null>(null);
  const idem = useRef(randomUUID());
  const seeded = useRef(!!draft);
  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const zones = meta.data?.zones ?? [];
  const ps = meta.data?.ps ?? {};
  const codEnabled = ps.cod_enabled !== false;
  const manualEnabled = !!ps.manual_enabled;

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!meta.data) return;
    if (!seeded.current) {
      seeded.current = true;
      setF((p) => ({ ...p, name: meta.data!.prof?.full_name ?? "", phone: meta.data!.prof?.phone ?? "" }));
      setPayment(meta.data.ps.cod_enabled !== false ? "cod" : "manual");
    }
    if (!zoneId || !meta.data.zones.some((z) => z.id === zoneId)) setZoneId(meta.data.zones[0]?.id ?? "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.data]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    try { sessionStorage.setItem(DRAFT, JSON.stringify({ f, zoneId, payment, step, applied })); } catch { /* private mode */ }
  }, [f, zoneId, payment, step, applied]);

  const itemsKey = JSON.stringify(items);
  useEffect(() => {
    if (!items.length || !zoneId) return;
    let off = false;
    void quoteCheckout(items, zoneId, applied).then((r) => {
      if (off) return;
      if (r.ok) {
        if (lastTotal.current !== null && lastTotal.current !== r.quote.total_paisa) setError("checkout.price_changed");
        lastTotal.current = r.quote.total_paisa;
        setQuote(r.quote);
      } else { setError(`err.${r.code}`); if (r.code === "COUPON_UNAVAILABLE") setApplied(""); }
    });
    return () => { off = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, zoneId, applied]);

  // Upload proof when file is selected
  async function handleProofFile(file: File) {
    setProofFile(file);
    setProofPath(null);
    setProofUploading(true);
    setError(null);
    try {
      const prepared = await prepareImage(file, 1200);
      const path = `proofs/pre_${randomUUID()}.${prepared.ext}`;
      const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, prepared.blob, { contentType: `image/${prepared.ext === "webp" ? "webp" : "jpeg"}` });
      if (upErr) throw upErr;
      setProofPath(path);
    } catch {
      setError("img.network");
      setProofFile(null);
    }
    setProofUploading(false);
  }

  // Step validation
  function validate(): string | null {
    if (step === 0) {
      if (f.name.trim().length < 2) return "checkout.err_name";
      if (!f.phone.trim()) return "checkout.err_phone";
      if (f.phone.replace(/\D/g, "") !== f.confirmPhone.replace(/\D/g, "")) return "checkout.err_phone_mismatch";
    }
    if (step === 1) {
      if (!f.ward) return "checkout.err_ward";
      if (!zoneId) return "checkout.err_zone";
    }
    if (step === 2) {
      if (!codEnabled && !manualEnabled) return "checkout.err_no_payment";
      if (payment === "manual" && !proofPath) return "checkout.err_proof";
    }
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const v = validate();
    if (v) { setError(v); return; }

    if (step < 3) { setStep(step + 1); window.scrollTo({ top: 0 }); return; }

    if (busy) return;
    setBusy(true);
    const address = `Ward ${f.ward}${f.street.trim() ? `, ${f.street.trim()}` : ""}`;
    const r = await placeOrder({
      idempotencyKey: idem.current, items, zoneId, coupon: applied, paymentMethod: payment,
      name: f.name.trim(), phone: f.phone, confirmPhone: f.confirmPhone, email: user?.email ?? "",
      address, landmark: "", municipality: CITY, district: DISTRICT, locale,
    });
    if (r.ok) {
      // For manual payment: submit the pre-uploaded proof
      if (payment === "manual" && proofPath && "token" in r) {
        try {
          await supabase.rpc("submit_payment_proof", { p_token: r.token, p_reference: null, p_proof_path: proofPath });
        } catch { /* proof failed — order still placed; user can upload on track page */ }
      }
      try { sessionStorage.removeItem(DRAFT); } catch { /* ignore */ }
      clear();
      nav("token" in r ? `/track?token=${r.token}&new=1` : `/track?number=${encodeURIComponent(r.orderNumber)}&placed=1`, { replace: true });
    } else {
      setError(`err.${r.code}`);
      if (!r.retryable && r.code !== "IDEMPOTENCY_CONFLICT") idem.current = randomUUID();
    }
    setBusy(false);
  }

  // Login gate
  if (!user) return (
    <main className={`${PAGE_X} py-16 text-center space-y-4`}>
      <p className="text-4xl">🔒</p>
      <h1 className="m-0 text-2xl font-bold">{t("checkout.login_required")}</h1>
      <p className="text-muted">{t("checkout.login_desc")}</p>
      <Link to={`/login?next=/checkout`} className={buttonStyles({ variant: "primary", size: "lg" })}>
        {t("checkout.login_btn")}
      </Link>
    </main>
  );

  if (!items.length) return (
    <main className={`${PAGE_X} py-8`}>
      <EmptyState icon={ShoppingCart} title={t("cart.empty")} action={<Link to="/shop" className={buttonStyles({ variant: "primary" })}>{t("cart.continue")}</Link>} />
    </main>
  );
  if (meta.isLoading) return <main className={`${PAGE_X} space-y-3 py-4`}><Skeleton variant="row" /><Skeleton variant="row" className="h-48" /></main>;

  const steps = [
    `👤 ${t("checkout.step.contact")}`,
    `📍 ${t("checkout.step.delivery")}`,
    `💳 ${t("checkout.step.payment")}`,
    `✅ ${t("checkout.step.review")}`,
  ];
  const zone = zones.find((z) => z.id === zoneId);
  const instr = pick(locale, ps.instructions_en, ps.instructions_ne);
  const priceChanged = error === "checkout.price_changed";

  const totals = quote ? (
    <dl className="m-0 space-y-1 text-sm">
      <div className="flex justify-between"><dt>{t("checkout.items")}</dt><dd className="m-0">{formatNpr(quote.itemsListTotal_paisa)}</dd></div>
      {quote.itemDiscount_paisa > 0 && <div className="flex justify-between text-success"><dt>{t("checkout.discount")}</dt><dd className="m-0">− {formatNpr(quote.itemDiscount_paisa)}</dd></div>}
      {quote.couponDiscount_paisa > 0 && <div className="flex justify-between text-success"><dt>{t("checkout.coupon_discount")}</dt><dd className="m-0">− {formatNpr(quote.couponDiscount_paisa)}</dd></div>}
      <div className="flex justify-between"><dt>{t("checkout.delivery")}</dt><dd className="m-0">{quote.deliveryFee_paisa ? formatNpr(quote.deliveryFee_paisa) : t("checkout.free")}</dd></div>
      <div className="flex justify-between border-t border-line pt-2 text-lg font-bold"><dt>{t("checkout.total")}</dt><dd className="m-0">{formatNpr(quote.total_paisa)}</dd></div>
    </dl>
  ) : <Skeleton lines={4} />;

  return (
    <main className={`${PAGE_X} space-y-4 py-4 pb-40 md:pb-8`}>
      <h1 className="m-0 text-3xl font-bold">{t("checkout.title")}</h1>
      <ol aria-label={t("checkout.progress")} className="m-0 grid list-none grid-cols-4 gap-2 p-0">
        {steps.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined} className="space-y-1">
            <span aria-hidden className={`block h-1.5 rounded-pill ${i <= step ? "bg-brand-strong" : "bg-surface-2"}`} />
            <span className={`block text-xs sm:text-sm ${i === step ? "font-bold text-ink" : "text-muted"}`}>{i + 1}. {s}</span>
          </li>
        ))}
      </ol>

      <form id="co" onSubmit={(e) => void onSubmit(e)} className="md:grid md:grid-cols-[1fr_20rem] md:items-start md:gap-8">
        <div className="space-y-4">
          {error && !priceChanged && <Alert tone="danger">{t(error)}</Alert>}
          {priceChanged && <Alert tone="warning"><p className="m-0 font-semibold">{t("checkout.price_changed")}</p>{quote && <p className="m-0">{t("checkout.new_total", { total: formatNpr(quote.total_paisa) })}</p>}</Alert>}

          {step === 0 && (
            <section aria-labelledby="s0" className="space-y-3">
              <h2 id="s0" className="m-0 text-xl font-bold">👤 {t("checkout.step.contact")}</h2>
              <Field label={`📝 ${t("checkout.name")}`} required>
                {(a) => <Input {...a} value={f.name} onChange={set("name")} minLength={2} autoComplete="name" enterKeyHint="next" placeholder={t("checkout.name_placeholder")} />}
              </Field>
              <Field label={`📞 ${t("checkout.phone")}`} hint={t("checkout.phone_hint")} required>
                {(a) => <Input {...a} value={f.phone} onChange={set("phone")} inputMode="tel" type="tel" pattern="^(\+?977)?9\d{9}$" autoComplete="tel" enterKeyHint="next" placeholder="98XXXXXXXX" />}
              </Field>
              <Field label={`🔁 ${t("checkout.confirm_phone")}`} hint={t("checkout.confirm_phone_hint")} required>
                {(a) => <Input {...a} value={f.confirmPhone} onChange={set("confirmPhone")} inputMode="tel" type="tel" autoComplete="tel" enterKeyHint="next" placeholder="98XXXXXXXX" />}
              </Field>
            </section>
          )}

          {step === 1 && (
            <section aria-labelledby="s1" className="space-y-4">
              <h2 id="s1" className="m-0 text-xl font-bold">📍 {t("checkout.step.delivery")}</h2>
              <div className="rounded-lg border border-line bg-surface-2 p-3 text-sm">
                <p className="m-0 font-semibold">🏙️ {CITY} · {DISTRICT}</p>
                <p className="m-0 text-muted">{t("checkout.city_note")}</p>
              </div>
              <Field label={`🏘️ ${t("checkout.ward")}`} required>
                {(a) => (
                  <select
                    {...a}
                    value={f.ward}
                    onChange={set("ward")}
                    className="input w-full"
                    required
                  >
                    <option value="">{t("checkout.ward_pick")}</option>
                    {WARDS.map((w) => <option key={w} value={w}>{t("checkout.ward_n", { n: w })}</option>)}
                  </select>
                )}
              </Field>
              <Field label={`🏠 ${t("checkout.street")}`} hint={t("checkout.street_hint")}>
                {(a) => <Input {...a} value={f.street} onChange={set("street")} enterKeyHint="done" placeholder={t("checkout.street_placeholder")} />}
              </Field>
              {zones.length > 1 && (
                <fieldset className="m-0 min-w-0 space-y-2 border-0 p-0">
                  <legend className="mb-1 p-0 text-sm font-semibold">🚚 {t("checkout.zone")}</legend>
                  {zones.map((z) => <ChoiceCard key={z.id} name="zone" required checked={zoneId === z.id} onChange={() => setZoneId(z.id)} label={pick(locale, z.name_en, z.name_ne) ?? z.name_en} description={z.fee_paisa ? formatNpr(z.fee_paisa) : t("checkout.free")} />)}
                </fieldset>
              )}
            </section>
          )}

          {step === 2 && (
            <section aria-labelledby="s2" className="space-y-3">
              <h2 id="s2" className="m-0 text-xl font-bold">💳 {t("checkout.payment")}</h2>
              <fieldset className="m-0 min-w-0 space-y-2 border-0 p-0">
                <legend className="sr-only-text">{t("checkout.payment")}</legend>
                {codEnabled && <ChoiceCard name="pay" checked={payment === "cod"} onChange={() => setPayment("cod")} label={`💵 ${t("checkout.cod")}`} description={t("checkout.cod_desc")} />}
                {manualEnabled && <ChoiceCard name="pay" checked={payment === "manual"} onChange={() => setPayment("manual")} label={`📲 ${t("checkout.manual")}`} description={t("checkout.manual_desc")} />}
              </fieldset>

              {payment === "manual" && (
                <div className="space-y-3 rounded-lg border border-brand-soft bg-surface p-4">
                  <p className="m-0 font-semibold">📸 {t("checkout.proof_title")}</p>
                  {instr && <p className="m-0 text-sm text-muted whitespace-pre-line">{instr}</p>}
                  <Alert tone="warning">{t("checkout.proof_required_note")}</Alert>
                  <Field label={t("checkout.proof_label")} hint={t("checkout.proof_hint")} required={payment === "manual"}>
                    {(a) => (
                      <Input
                        {...a}
                        type="file"
                        accept="image/*"
                        disabled={proofUploading}
                        onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleProofFile(file); e.target.value = ""; }}
                      />
                    )}
                  </Field>
                  {proofUploading && <p role="status" className="m-0 text-sm text-muted">⏳ {t("checkout.proof_uploading")}</p>}
                  {proofPath && !proofUploading && <p role="status" className="m-0 text-sm text-success">✅ {t("checkout.proof_ready")}</p>}
                  {proofFile && !proofPath && !proofUploading && <p className="m-0 text-sm text-danger">❌ {t("checkout.proof_failed")}</p>}
                </div>
              )}
            </section>
          )}

          {step === 3 && (
            <section aria-labelledby="s3" className="space-y-4">
              <h2 id="s3" className="m-0 text-xl font-bold">✅ {t("checkout.step.review")}</h2>
              <dl className="m-0 space-y-3 rounded-lg border border-line bg-surface p-4">
                <ReviewRow label={`👤 ${t("checkout.step.contact")}`} onEdit={() => setStep(0)} editLabel={t("checkout.edit")}>
                  {f.name} · {f.phone}
                </ReviewRow>
                <ReviewRow label={`📍 ${t("checkout.step.delivery")}`} onEdit={() => setStep(1)} editLabel={t("checkout.edit")}>
                  {t("checkout.ward_n", { n: f.ward })}{f.street ? `, ${f.street}` : ""} · {CITY}
                  {zone ? ` · ${pick(locale, zone.name_en, zone.name_ne)}` : ""}
                </ReviewRow>
                <ReviewRow label={`💳 ${t("checkout.step.payment")}`} onEdit={() => setStep(2)} editLabel={t("checkout.edit")}>
                  {payment === "cod" ? `💵 ${t("checkout.cod")}` : `📲 ${t("checkout.manual")}`}
                  {payment === "manual" && proofPath && ` · ✅ ${t("checkout.proof_attached")}`}
                </ReviewRow>
              </dl>
              <div className="flex items-end gap-2">
                <Field label={`🏷️ ${t("checkout.coupon")}`} className="flex-1">
                  {(a) => <Input {...a} value={coupon} onChange={(e) => setCoupon(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setApplied(coupon.trim()); } }} autoCapitalize="characters" />}
                </Field>
                <Button type="button" variant="secondary" onClick={() => setApplied(coupon.trim())}>{t("checkout.apply")}</Button>
              </div>
              {applied && <p className="m-0 text-sm text-muted">{t("checkout.coupon_applied", { code: applied })}</p>}
              <div className="rounded-lg border border-line bg-surface p-4 md:hidden">{totals}</div>
            </section>
          )}
        </div>

        <aside aria-label={t("cart.summary")} className="hidden space-y-4 rounded-lg border border-line bg-surface p-4 md:sticky md:top-20 md:block">{totals}</aside>
      </form>

      <GlassPanel shape="dialog" className="fixed inset-x-3 z-30 flex items-center gap-2 p-2 pl-3 md:inset-x-auto md:right-8 md:w-[20rem]" style={{ bottom: "calc(12px + var(--safe-bottom))" }}>
        {step > 0 && <Button type="button" variant="secondary" aria-label={t("common.back")} leadingIcon={ChevronLeft} onClick={() => setStep(step - 1)} className="px-3" />}
        <div className="min-w-0 flex-1 text-ink"><p className="m-0 text-xs">{t("checkout.total")}</p><p className="m-0 truncate font-bold">{quote ? formatNpr(quote.total_paisa) : "…"}</p></div>
        <Button type="submit" form="co" size="lg" loading={busy} disabled={!quote || proofUploading}>
          {step < 3 ? t("checkout.continue") : priceChanged ? t("checkout.confirm_new") : t("checkout.place")}
        </Button>
      </GlassPanel>
    </main>
  );
}

function ReviewRow({ label, editLabel, onEdit, children }: { label: string; editLabel: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><dt className="text-sm text-muted">{label}</dt><dd className="m-0 break-words font-semibold text-ink">{children}</dd></div>
      <Button type="button" variant="ghost" size="sm" onClick={onEdit}>{editLabel}</Button>
    </div>
  );
}
