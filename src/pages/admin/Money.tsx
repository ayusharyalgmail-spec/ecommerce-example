import { useMemo, useRef, useState } from "react";
import { useT, dateLocale } from "@/lib/i18n";
import { formatNpr } from "@/lib/money";
import { useQuery } from "@/lib/useQuery";
import { useTitle } from "@/components/ui";
import {
  Alert, Badge, Banknote, Button, Card, EmptyState, HandCoins, Input, Plus, Receipt, Search, SegmentedControl, Select, Sheet,
  Skeleton, Users, Wallet, toast,
} from "@/ui";
import { cn } from "@/ui/cn";
import { Kpi } from "@/admin/finance/Kpi";
import { TrendChart } from "@/admin/finance/TrendChart";
import {
  PAY_METHODS, addCustomer, customerStatement, dailySeries, dailySummary, listBalances, newLedgerKey, parseAmountPaisa, paymentStatus,
  percentChange, recordPayment, recordSale, type CustomerBalance, type LedgerErrorCode, type PayMethod,
} from "@/lib/ledger";

type Intent = "sale" | "payment";
const initials = (n: string) => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

export default function Money() {
  const { t, locale } = useT();
  useTitle(t("money.title"));
  const summary = useQuery(dailySummary, []);
  const series = useQuery(() => dailySeries(14), []);
  const list = useQuery(listBalances, []);
  const reloadAll = () => { summary.reload(); series.reload(); list.reload(); };
  const errText = (c: LedgerErrorCode) => t(`money.err.${c}`);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "owing">("all");
  const [open, setOpen] = useState<{ id: string; intent: Intent } | null>(null);
  const [adding, setAdding] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const customers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (list.data ?? []).filter((c) => (filter === "all" || c.balance_paisa > 0)
      && (!q || c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q)));
  }, [list.data, query, filter]);
  const selected = list.data?.find((c) => c.id === open?.id) ?? null;

  // Yesterday comes from the same server series as the chart, so the comparison and the chart always agree.
  const pts = series.data ?? [];
  const yday = pts.at(-2);
  const s = summary.data;
  const owingCount = (list.data ?? []).filter((c) => c.balance_paisa > 0).length;

  const pickCustomer = () => { searchRef.current?.focus(); searchRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }); };

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-3xl font-bold">{t("money.title")}</h1>
          <p className="m-0 text-sm text-muted">{new Date().toLocaleDateString(dateLocale(locale), { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button leadingIcon={Receipt} onClick={pickCustomer}>{t("money.new_sale")}</Button>
          <Button variant="secondary" leadingIcon={HandCoins} onClick={() => { setFilter("owing"); pickCustomer(); }}>{t("money.receive_payment")}</Button>
          <Button variant="secondary" leadingIcon={Plus} onClick={() => setAdding(true)}>{t("money.add_customer")}</Button>
        </div>
      </header>

      {(summary.error || series.error || list.error) && <Alert tone="danger">{t("common.error")} <Button variant="ghost" size="sm" onClick={reloadAll}>{t("money.retry")}</Button></Alert>}

      <Card flush>
        {!s ? <div className="grid grid-cols-2 gap-px p-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="row" className="h-20" />)}</div> : (
          <div className="enter-stagger grid grid-cols-2 divide-line lg:grid-cols-4 lg:divide-x [&>*:nth-child(-n+2)]:border-b [&>*:nth-child(-n+2)]:border-line lg:[&>*]:border-b-0 [&>*:nth-child(odd)]:border-r [&>*:nth-child(odd)]:border-line lg:[&>*]:border-r-0">
            <Kpi icon={Receipt} label={t("money.sales_today")} value={s.sales_paisa} hint={t("money.sales_today_hint")}
              change={yday ? percentChange(s.sales_paisa, yday.sales_paisa) : null} changeLabel={t("money.vs_yesterday")} />
            <Kpi icon={Wallet} tone="success" label={t("money.collected_today")} value={s.collected_paisa} hint={t("money.collected_today_hint")}
              change={yday ? percentChange(s.collected_paisa, yday.collected_paisa) : null} changeLabel={t("money.vs_yesterday")} />
            <Kpi icon={Banknote} label={t("money.cash_today")} value={s.cash_collected_paisa} hint={t("money.cash_today_hint")} />
            <Kpi icon={Users} tone={s.total_dues_paisa > 0 ? "danger" : "neutral"} label={t("money.dues_total")} value={s.total_dues_paisa}
              hint={t(owingCount === 1 ? "money.owing_one" : "money.owing_count", { n: owingCount })} onClick={() => { setFilter("owing"); pickCustomer(); }} />
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="space-y-2">
          <h2 className="m-0 text-lg font-semibold">{t("money.chart_title")}</h2>
          <p className="m-0 text-sm text-muted">{t("money.chart_hint")}</p>
          {!series.data ? <Skeleton variant="row" className="h-48" />
            : pts.every((p) => !p.sales_paisa && !p.collected_paisa) ? <EmptyState icon={Receipt} title={t("money.chart_empty")} />
            : <TrendChart points={pts} locale={dateLocale(locale)} labels={{ sales: t("money.legend_sales"), collected: t("money.legend_collected"), summary: t("money.chart_title") }} />}
        </Card>

        <section aria-labelledby="cust-h" className="min-w-0 space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="cust-h" className="m-0 text-lg font-semibold">{t("money.customers")}</h2>
            <span className="text-sm text-muted tabular">{customers.length}</span>
          </div>
          <div className="relative">
            <Search aria-hidden size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input ref={searchRef} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("money.search")} aria-label={t("money.search")} className="pl-10" />
          </div>
          <SegmentedControl label={t("money.show")} value={filter} onChange={setFilter}
            options={[{ value: "all", label: t("money.filter_all") }, { value: "owing", label: t("money.filter_owing") }]} />

          {!list.data ? <Skeleton variant="row" className="h-40" />
            : customers.length === 0 ? (
              <EmptyState icon={Users} title={list.data.length ? t("money.no_match") : t("money.empty")}
                action={!list.data.length ? <Button leadingIcon={Plus} onClick={() => setAdding(true)}>{t("money.add_customer")}</Button> : undefined} />
            ) : (
              <ul className="m-0 list-none divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface p-0">
                {customers.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => setOpen({ id: c.id, intent: c.balance_paisa > 0 ? "payment" : "sale" })}
                      className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover-fine:hover:bg-surface-2 focus-visible:bg-surface-2">
                      <span aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center rounded-pill text-sm font-bold",
                        c.balance_paisa > 0 ? "bg-[var(--danger-tint)] text-danger" : "bg-surface-2 text-ink")}>{initials(c.name)}</span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate">{c.name}</strong>
                        <span className="block truncate text-sm text-muted">{c.phone ?? t("money.no_phone")}</span>
                      </span>
                      {c.balance_paisa > 0
                        ? <span className="text-right"><span className="block text-xs text-muted">{t("money.owes")}</span><strong className="tabular text-danger">{formatNpr(c.balance_paisa)}</strong></span>
                        : <Badge tone="success">{t("money.settled")}</Badge>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </section>
      </div>

      <AddCustomerSheet open={adding} onOpenChange={setAdding} errText={errText}
        onAdded={(id) => { setAdding(false); list.reload(); setOpen({ id, intent: "sale" }); }} />
      {selected && open && (
        <CustomerSheet key={selected.id} customer={selected} initialIntent={open.intent} onClose={() => setOpen(null)} onChanged={reloadAll} errText={errText} />
      )}
    </main>
  );
}

function AddCustomerSheet({ open, onOpenChange, onAdded, errText }: {
  open: boolean; onOpenChange: (o: boolean) => void; onAdded: (id: string) => void; errText: (c: LedgerErrorCode) => string;
}) {
  const { t } = useT();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const r = await addCustomer(String(f.get("name") ?? ""), String(f.get("phone") ?? ""));
    setBusy(false);
    if (r.ok) { setErr(null); toast.success(t("common.saved")); onAdded(r.data); } else setErr(errText(r.code));
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("money.add_customer")}>
      <form className="space-y-3" onSubmit={submit}>
        <Input name="name" required maxLength={120} autoComplete="off" placeholder={t("money.name")} aria-label={t("money.name")} />
        <Input name="phone" inputMode="tel" placeholder={t("money.phone_optional")} aria-label={t("money.phone_optional")} />
        {err && <Alert tone="danger">{err}</Alert>}
        <Button type="submit" block loading={busy}>{t("admin.save")}</Button>
      </form>
    </Sheet>
  );
}

function CustomerSheet({ customer, initialIntent, onClose, onChanged, errText }: {
  customer: CustomerBalance; initialIntent: Intent; onClose: () => void; onChanged: () => void; errText: (c: LedgerErrorCode) => string;
}) {
  const { t, locale } = useT();
  const stmt = useQuery(() => customerStatement(customer.id), [customer.id, customer.balance_paisa]);
  const [intent, setIntent] = useState<Intent>(initialIntent);
  // One key per form-open: a double-tap or network retry re-sends the SAME key, so it can't post twice.
  const [saleKey, setSaleKey] = useState(newLedgerKey);
  const [payKey, setPayKey] = useState(newLedgerKey);
  const [total, setTotal] = useState("");
  const [paid, setPaid] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PayMethod>("cash");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const totalP = parseAmountPaisa(total) ?? 0;
  const paidP = parseAmountPaisa(paid) ?? 0;
  const owes = Math.max(customer.balance_paisa, 0);

  const totals = useMemo(() => (stmt.data ?? []).reduce((a, e) => {
    if (e.kind === "sale") a.sales += e.delta_paisa; else if (e.kind === "payment") a.paid -= e.delta_paisa;
    return a;
  }, { sales: 0, paid: 0 }), [stmt.data]);

  const done = (ok: string, reset: () => void) => { toast.success(ok); setErr(null); reset(); onChanged(); };

  const onSale = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const r = await recordSale({ customerId: customer.id, total, paid, method, billRef: String(f.get("bill") ?? ""), note: String(f.get("note") ?? ""), key: saleKey });
    setBusy(false);
    if (r.ok) done(t("money.saved_balance", { amount: formatNpr(r.data.balance) }), () => { setSaleKey(newLedgerKey()); setTotal(""); setPaid(""); });
    else setErr(errText(r.code)); // inputs are kept so nothing is lost
  };
  const onPay = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const r = await recordPayment({ customerId: customer.id, amount, method, reference: String(f.get("reference") ?? ""), note: "", key: payKey });
    setBusy(false);
    if (r.ok) done(t("money.saved_balance", { amount: formatNpr(r.data.balance) }), () => { setPayKey(newLedgerKey()); setAmount(""); });
    else setErr(errText(r.code));
  };

  const methodSelect = (
    <Select value={method} onChange={(e) => setMethod(e.target.value as PayMethod)} aria-label={t("money.method")}>
      {PAY_METHODS.map((m) => <option key={m} value={m}>{t(`money.method.${m}`)}</option>)}
    </Select>
  );
  const fmt = (d: string) => new Date(d).toLocaleDateString(dateLocale(locale), { day: "numeric", month: "short", year: "numeric" });

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }} title={customer.name} description={customer.phone ?? undefined}>
      <div className="space-y-5">
        <div className={cn("rounded-lg p-4", owes > 0 ? "bg-[var(--danger-tint)]" : "bg-[var(--success-tint)]")}>
          <p className="m-0 text-sm font-semibold text-muted">{owes > 0 ? t("money.owes") : t("money.settled")}</p>
          <p className={cn("tabular m-0 text-3xl font-bold", owes > 0 ? "text-danger" : "text-success")}>{formatNpr(owes)}</p>
          <dl className="m-0 mt-2 grid grid-cols-2 gap-2 text-sm">
            <div><dt className="text-muted">{t("money.total_sales")}</dt><dd className="tabular m-0 font-semibold">{formatNpr(totals.sales)}</dd></div>
            <div><dt className="text-muted">{t("money.total_paid")}</dt><dd className="tabular m-0 font-semibold">{formatNpr(totals.paid)}</dd></div>
          </dl>
        </div>

        <SegmentedControl label={t("money.action")} value={intent} onChange={(v) => { setIntent(v); setErr(null); }}
          options={[{ value: "payment", label: t("money.receive_payment") }, { value: "sale", label: t("money.new_sale") }]} />

        {intent === "payment" ? (
          <form className="space-y-3" onSubmit={onPay}>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" required placeholder={t("money.amount")} aria-label={t("money.amount")} className="tabular text-xl" />
            {owes > 0 && <Button variant="ghost" size="sm" onClick={() => setAmount(String(owes / 100))}>{t("money.pay_full")} · {formatNpr(owes)}</Button>}
            <div className="grid grid-cols-2 gap-2">{methodSelect}<Input name="reference" maxLength={120} placeholder={t("money.reference")} aria-label={t("money.reference")} /></div>
            {err && <Alert tone="danger">{err}</Alert>}
            <Button type="submit" block loading={busy} disabled={owes <= 0}>{t("money.save_payment")}</Button>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={onSale}>
            <div className="grid grid-cols-2 gap-2">
              <Input value={total} onChange={(e) => setTotal(e.target.value)} inputMode="decimal" required placeholder={t("money.sale_total")} aria-label={t("money.sale_total")} className="tabular" />
              <Input value={paid} onChange={(e) => setPaid(e.target.value)} inputMode="decimal" placeholder={t("money.paid_now")} aria-label={t("money.paid_now")} className="tabular" />
            </div>
            {methodSelect}
            <div className="grid grid-cols-2 gap-2">
              <Input name="bill" maxLength={60} placeholder={t("money.bill_ref")} aria-label={t("money.bill_ref")} />
              <Input name="note" maxLength={500} placeholder={t("money.note")} aria-label={t("money.note")} />
            </div>
            {totalP > 0 && paidP <= totalP && (() => {
              const st = paymentStatus(totalP, paidP);
              return (
                <p className="m-0 flex items-center justify-between rounded-md bg-surface-2 p-3 text-sm" role="status">
                  <Badge tone={st === "paid" ? "success" : st === "partial" ? "warning" : "danger"}>{t(`money.status.${st}`)}</Badge>
                  <span>{t("money.remaining")} <strong className="tabular">{formatNpr(Math.max(totalP - paidP, 0))}</strong></span>
                </p>
              );
            })()}
            {totalP > 0 && paidP > totalP && <Alert tone="danger">{t("money.err.invalid_paid_amount")}</Alert>}
            {!total && !paid && <p className="m-0 text-sm text-muted">{t("money.paid_hint")}</p>}
            {err && <Alert tone="danger">{err}</Alert>}
            <Button type="submit" block loading={busy} disabled={paidP > totalP && totalP > 0}>{t("money.save_sale")}</Button>
          </form>
        )}

        <section aria-labelledby="tl-h">
          <h3 id="tl-h" className="mb-2 text-base font-semibold">{t("money.statement")}</h3>
          {!stmt.data ? <Skeleton variant="row" className="h-24" /> : stmt.data.length === 0 ? <p className="text-sm text-muted">{t("money.no_entries")}</p> : (
            <ol className="m-0 list-none space-y-0 border-l-2 border-line p-0 pl-4">
              {stmt.data.map((e) => (
                <li key={e.id} className="relative py-2">
                  <span aria-hidden className={cn("absolute -left-[1.4rem] top-3.5 size-2.5 rounded-pill", e.delta_paisa > 0 ? "bg-ink" : "bg-success")} />
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="min-w-0"><strong>{t(`money.kind.${e.kind}`)}</strong>{e.method ? ` · ${t(`money.method.${e.method}`)}` : ""}{e.bill_ref ? ` · ${e.bill_ref}` : ""}
                      <span className="block text-xs text-muted">{fmt(e.created_at)}{e.note ? ` · ${e.note}` : ""}</span></span>
                    <span className={cn("tabular shrink-0 font-semibold", e.delta_paisa < 0 && "text-success")}>{e.delta_paisa > 0 ? "+" : "−"}{formatNpr(Math.abs(e.delta_paisa))}</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </Sheet>
  );
}
