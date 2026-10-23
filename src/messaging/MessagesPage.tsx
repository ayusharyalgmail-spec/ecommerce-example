import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Badge, Button, CheckCheck, EmptyState, Field, IconButton, Inbox, Input, LogIn, Package, Settings, Sheet, Skeleton, Truck, UserRound, WifiOff, RefreshCw, cn } from "@/ui";
import { useT } from "@/lib/i18n";
import { useTitle } from "@/components/ui";
import { PAGE_X } from "@/catalog/layout";
import { signInHref } from "@/shell/Header";
import { MsgError, msgApi, setGuest, type FeedItem, type Kind } from "./api";
import { badgeText, groupByPeriod, normalizePhone } from "./format";
import { useClaimGuest } from "./useClaimGuest";
import { guarded, useIdentity, useOnline, useUnread, type Identity } from "./hooks";
import { Banner, CATEGORY, CtaLink, FeedCard, accent, chipTone, ctaStyle, formatWhen, useItemText } from "./MessageCards";
import { ChatPanel } from "./ChatPanel";
import { PrefsPanel } from "./PrefsPanel";

const KINDS: Kind[] = ["chat", "order", "alert", "promo"];
const isKind = (v: string | null): v is Kind => !!v && (KINDS as string[]).includes(v);

/** First visit: sign in, or continue as a guest. A guest session proves "same browser", not who owns a phone number. */
function IdentityGate() {
  const { t } = useT();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState<{ name?: string; phone?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [expired] = useState(() => { try { return sessionStorage.getItem("msg.expired") === "1"; } catch { return false; } });
  // cleared in an effect, not the initializer: StrictMode runs initializers twice and the second read would lose the notice
  useEffect(() => { try { sessionStorage.removeItem("msg.expired"); } catch { /* nothing to clear */ } }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const n = name.trim();
    const p = phone.trim() ? normalizePhone(phone) : null;
    const next = { name: n ? undefined : t("msg.guest.name_req"), phone: phone.trim() && !p ? t("msg.guest.phone_bad") : undefined };
    setErr(next);
    if (next.name || next.phone) return;
    setBusy(true);
    try {
      const g = await msgApi.guestStart(n, p);
      setGuest({ token: g.token, name: g.name, phone: g.phone });
    } catch (x) {
      setErr({ form: x instanceof MsgError && x.code === "RATE_LIMIT_EXCEEDED" ? t("msg.err.rate") : t("msg.err.guest") });
    }
    setBusy(false);
  }

  return (
    <main className={`${PAGE_X} max-w-3xl space-y-5 py-6`}>
      <header className="space-y-1">
        <h1 className="m-0 text-3xl font-bold">{t("msg.title")}</h1>
        <p className="m-0 text-muted">{t("msg.gate.sub")}</p>
      </header>
      {expired && <Alert tone="warning">{t("msg.gate.expired")}</Alert>}
      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="g-in" className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5 shadow-[var(--e1)]">
          <span aria-hidden className="flex size-11 items-center justify-center rounded-md bg-brand-tint text-brand-strong"><LogIn size={22} /></span>
          <h2 id="g-in" className="m-0 text-xl font-bold">{t("msg.gate.signin")}</h2>
          <p className="m-0 flex-1 text-sm text-muted">{t("msg.gate.signin_hint")}</p>
          <Link to={signInHref("/messages")} className="inline-flex min-h-12 items-center justify-center rounded-md bg-brand px-4 font-semibold text-on-brand no-underline">{t("nav.signin")}</Link>
        </section>
        <form onSubmit={submit} noValidate aria-labelledby="g-guest" className="space-y-3 rounded-xl border border-line bg-surface p-5 shadow-[var(--e1)]">
          <span aria-hidden className="flex size-11 items-center justify-center rounded-md bg-surface-2 text-ink"><UserRound size={22} /></span>
          <h2 id="g-guest" className="m-0 text-xl font-bold">{t("msg.gate.guest")}</h2>
          <p className="m-0 text-sm text-muted">{t("msg.gate.guest_hint")}</p>
          <Field label={t("msg.guest.name")} error={err.name} required>
            {(a) => <Input {...a} value={name} maxLength={80} autoComplete="name" enterKeyHint="next" onChange={(e) => setName(e.target.value)} />}
          </Field>
          <Field label={t("msg.guest.phone")} hint={t("msg.guest.phone_hint")} error={err.phone}>
            {(a) => <Input {...a} value={phone} type="tel" inputMode="tel" autoComplete="tel" maxLength={20} placeholder="+977 98XXXXXXXX" enterKeyHint="go" onChange={(e) => setPhone(e.target.value)} />}
          </Field>
          {err.form && <Alert tone="danger">{err.form}</Alert>}
          <Button type="submit" block loading={busy}>{t("msg.gate.continue")}</Button>
        </form>
      </div>
    </main>
  );
}

function Detail({ item, onClose, onRead }: { item: FeedItem; onClose: () => void; onRead: () => void }) {
  const { t, locale } = useT();
  const text = useItemText()(item) as { title: string; body: string; cta?: string | null };
  return (
    <div style={accent(item.kind)} className="space-y-4">
      <Banner path={item.image_path} className="rounded-lg" />
      <div className="flex items-center gap-2 text-sm text-muted">
        <Badge tone="neutral" icon={CATEGORY[item.kind].icon}>{t(`msg.cat.${item.kind}`)}</Badge>
        <time dateTime={item.at}>{new Date(item.at).toLocaleString(locale === "ne" ? "ne-NP" : "en-GB", { dateStyle: "long", timeStyle: "short" })}</time>
      </div>
      <p className="m-0 whitespace-pre-wrap break-words text-base text-ink">{text.body}</p>
      {item.ends_at && <p className="m-0 text-sm text-muted">{t("msg.ends", { when: formatWhen(item.ends_at, locale) })}</p>}
      <div className="flex flex-wrap gap-2">
        {item.kind === "order" ? (
          <>
            <Link to="/account" onClick={onRead} className={ctaStyle}><Package aria-hidden size={18} className="mr-2" />{t("msg.view_order")}</Link>
            <Link to="/track" onClick={onRead} className={ctaStyle}><Truck aria-hidden size={18} className="mr-2" />{t("track.title")}</Link>
          </>
        ) : <CtaLink url={item.cta_url} label={text.cta ?? ""} onClick={() => { onRead(); onClose(); }} className={ctaStyle} />}
      </div>
    </div>
  );
}

function Feed({ kind, identity }: { kind: Exclude<Kind, "chat">; identity: Identity }) {
  const { t } = useT();
  const qc = useQueryClient();
  const [open, setOpen] = useState<FeedItem | null>(null);
  const guestOrders = kind === "order" && identity.kind !== "user";
  const key = ["msg", "feed", kind, identity.key];
  const q = useQuery({ queryKey: key, enabled: !guestOrders, staleTime: 10_000, retry: 1, refetchOnWindowFocus: true, queryFn: () => guarded(() => msgApi.feed(kind)) });
  const read = useMutation({
    mutationFn: (it: FeedItem) => guarded(() => msgApi.markRead(it.ref, it.id)),
    onMutate: (it) => { qc.setQueryData<FeedItem[]>(key, (xs) => xs?.map((x) => (x.id === it.id ? { ...x, unread: false } : x))); },
    onSettled: () => { void qc.invalidateQueries({ queryKey: ["msg", "unread"] }); },
  });
  const markRead = (it: FeedItem) => { if (it.unread) read.mutate(it); };

  if (guestOrders) return (
    <EmptyState icon={Package} title={t("msg.order.guest_title")} description={t("msg.order.guest_body")}
      action={<div className="flex flex-wrap justify-center gap-2"><Link to={signInHref("/messages?tab=order")} className="inline-flex min-h-12 items-center rounded-md bg-brand px-4 font-semibold text-on-brand no-underline">{t("nav.signin")}</Link><Link to="/track" className="inline-flex min-h-12 items-center rounded-md border border-line-strong px-4 font-semibold text-ink no-underline">{t("track.title")}</Link></div>} />
  );
  if (q.isLoading) return <div aria-busy="true" className="space-y-3"><Skeleton variant="row" className="h-24" /><Skeleton variant="row" className="h-24" /><Skeleton variant="row" className="h-24" /></div>;
  if (q.isError) return <EmptyState icon={RefreshCw} title={t("msg.err.load")} description={t("msg.err.load_hint")} action={<Button variant="secondary" onClick={() => void q.refetch()}>{t("msg.retry")}</Button>} />;
  const items = q.data ?? [];
  if (!items.length) return <EmptyState icon={Inbox} title={t(`msg.empty.${kind}`)} description={t(`msg.empty.${kind}_hint`)} />;

  return (
    <>
      <div className="space-y-5">
        {groupByPeriod(items).map((g) => (
          <section key={g.period} aria-labelledby={`p-${g.period}`} className="space-y-2">
            <h2 id={`p-${g.period}`} className="m-0 px-1 text-sm font-bold text-muted">{t(`msg.period.${g.period}`)}</h2>
            <div className="space-y-3">{g.items.map((it) => <FeedCard key={it.id} item={it} onOpen={() => { setOpen(it); markRead(it); }} onCta={() => markRead(it)} />)}</div>
          </section>
        ))}
      </div>
      <Sheet open={!!open} onOpenChange={(o) => { if (!o) setOpen(null); }} title={open ? (sheetTitle(open, t)) : ""}>
        {open && <Detail item={open} onClose={() => setOpen(null)} onRead={() => markRead(open)} />}
      </Sheet>
    </>
  );
}

// Title for the sheet header, resolved outside React hooks so it can run inline in render.
function sheetTitle(it: FeedItem, t: (k: string, v?: Record<string, string | number>) => string) {
  if (it.kind === "order") {
    const known = ["pending_confirmation", "confirmed", "processing", "dispatched", "delivered", "cancelled", "rejected"].includes(it.code ?? "");
    return t(`msg.order.${known ? it.code : "update"}.title`, { n: it.order_number ?? "" });
  }
  return it.title ?? "";
}

function MessagesCenter({ identity }: { identity: Identity }) {
  const { t } = useT();
  const qc = useQueryClient();
  const online = useOnline();
  const counts = useUnread();
  const [sp, setSp] = useSearchParams();
  const tab: Kind = isKind(sp.get("tab")) ? (sp.get("tab") as Kind) : "chat";
  const [prefs, setPrefs] = useState(false);
  const all = useMutation({
    mutationFn: () => guarded(() => msgApi.markAll(null)),
    onSettled: () => { void qc.invalidateQueries({ queryKey: ["msg"] }); },
  });

  return (
    <main className={`${PAGE_X} max-w-3xl space-y-4 py-4`}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="m-0 text-3xl font-bold">{t("msg.title")}</h1>
          <p className="m-0 text-sm text-muted" aria-live="polite">{counts.total > 0 ? t("msg.unread_n", { n: counts.total }) : t("msg.all_read")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="hidden sm:block"><Button variant="secondary" size="sm" leadingIcon={CheckCheck} disabled={counts.total === 0 || all.isPending} onClick={() => all.mutate()}>{t("msg.mark_all")}</Button></span>
          <span className="sm:hidden"><IconButton icon={CheckCheck} label={t("msg.mark_all")} disabled={counts.total === 0 || all.isPending} onClick={() => all.mutate()} /></span>
          <IconButton icon={Settings} label={t("msg.settings")} onClick={() => setPrefs(true)} />
        </div>
      </header>

      {!online && <Alert tone="warning"><span className="flex items-center gap-2"><WifiOff aria-hidden size={16} />{t("msg.offline")}</span></Alert>}

      <nav aria-label={t("msg.categories")}>
        <ul className="m-0 grid list-none grid-cols-4 gap-2 p-0">
          {KINDS.map((k) => {
            const { icon: Icon } = CATEGORY[k];
            const n = counts[k];
            const on = tab === k;
            return (
              <li key={k} className="min-w-0">
                <button type="button" aria-pressed={on} onClick={() => setSp(k === "chat" ? {} : { tab: k }, { replace: true })} style={accent(k)}
                  className={cn("relative flex w-full flex-col items-center gap-1.5 rounded-lg border px-1 py-3 text-center transition-[background-color,border-color,transform] duration-[var(--duration-1)] active:scale-[.97]",
                    on ? "border-[var(--c)] bg-[color-mix(in_oklab,var(--c)_12%,var(--surface))] shadow-[var(--e1)]" : "border-line bg-surface hover-fine:hover:border-line-strong")}>
                  <span aria-hidden className={cn("flex size-10 items-center justify-center rounded-full", chipTone)}><Icon size={20} strokeWidth={1.9} /></span>
                  <span className={cn("max-w-full truncate px-0.5 text-xs", on ? "font-bold text-ink" : "font-semibold text-muted")}>{t(`msg.cat.${k}`)}</span>
                  {n > 0 && <><span aria-hidden className="absolute right-1.5 top-1.5 min-w-5 rounded-pill bg-[var(--c)] px-1 text-center text-xs font-bold leading-5 text-white tabular">{badgeText(n)}</span><span className="sr-only-text">{t("msg.unread_n", { n })}</span></>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {tab === "chat" ? <ChatPanel identity={identity} /> : <Feed key={tab} kind={tab} identity={identity} />}

      <Sheet open={prefs} onOpenChange={setPrefs} title={t("msg.settings")} description={t("msg.settings_sub")}>
        <PrefsPanel identity={identity} onClose={() => setPrefs(false)} />
      </Sheet>
    </main>
  );
}

export default function MessagesPage() {
  const { t } = useT();
  const identity = useIdentity();
  useClaimGuest();
  useTitle(t("msg.title"));
  if (identity.kind === "loading") return <main className={`${PAGE_X} max-w-3xl space-y-3 py-6`}><Skeleton variant="row" className="h-12 w-1/2" /><Skeleton variant="row" className="h-24" /><Skeleton variant="row" className="h-40" /></main>;
  if (identity.kind === "none") return <IdentityGate />;
  return <MessagesCenter identity={identity} />;
}
