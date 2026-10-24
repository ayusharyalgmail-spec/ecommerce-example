import { lazy, Suspense, useState } from "react";
import { PageSkeleton } from "@/shell/PageSkeleton";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert, Badge, Button, CircleCheck, ChevronLeft, EmptyState, IconButton, Inbox, MessageCircle, Package, RefreshCw, Search, SegmentedControl, Send, Skeleton, Textarea, cn,
} from "@/ui";
import { useT, dateLocale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { randomUUID } from "@/lib/uuid";
import { formatNpr } from "@/lib/money";
import { MsgError } from "@/messaging/api";
import { staffApi, type InboxRow } from "@/messaging/staffApi";
import { Bubble } from "@/messaging/ChatPanel";
import { badgeText } from "@/messaging/format";
import { accent } from "@/messaging/MessageCards";
import { useFeature } from "@/platform/TenantContext";
// Campaigns are a heavy, optional module: only tenants with the feature download it.
const CampaignManager = lazy(() => import("./CampaignManager").then((m) => ({ default: m.CampaignManager })));

type Tab = "inbox" | "alert" | "promo";
const FILTERS = ["all", "unread", "awaiting", "open", "resolved"] as const;
type Filter = (typeof FILTERS)[number];

function Stat({ label, value, tone, onClick }: { label: string; value: number | undefined; tone: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick} style={{ "--c": tone } as React.CSSProperties}
      className="rounded-lg border border-line bg-surface p-3 text-left shadow-[var(--e1)] transition-[transform,border-color] active:scale-[.98] enabled:hover-fine:hover:border-[var(--c)]">
      <span className="block text-2xl font-bold tabular text-ink">{value ?? "-"}</span>
      <span className="block text-xs font-semibold text-muted">{label}</span>
      <span aria-hidden className="mt-2 block h-1 w-8 rounded-pill bg-[var(--c)]" />
    </button>
  );
}

function Thread({ id, onBack }: { id: string; onBack: () => void }) {
  const { t, locale } = useT();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [fail, setFail] = useState<{ body: string; clientId: string; msg: string } | null>(null);
  const [sending, setSending] = useState(false);
  const q = useQuery({
    queryKey: ["admin", "msg", "conv", id], staleTime: 0,
    refetchInterval: () => (document.visibilityState === "visible" ? 6000 : false),
    queryFn: () => staffApi.conversation(id),
  });
  const refresh = () => Promise.all([
    qc.invalidateQueries({ queryKey: ["admin", "msg", "conv", id] }), qc.invalidateQueries({ queryKey: ["admin", "msg", "inbox"] }), qc.invalidateQueries({ queryKey: ["admin", "msg", "overview"] }),
  ]);

  async function send(body: string, clientId: string) {
    if (sending) return; // blocks a double submit; a retry of the same text reuses its client id so it cannot duplicate
    setSending(true); setFail(null);
    try { await staffApi.reply(id, body, clientId); setText(""); await refresh(); }
    catch (e) { setFail({ body, clientId, msg: e instanceof MsgError && e.code === "RATE_LIMIT_EXCEEDED" ? t("msg.err.rate") : e instanceof MsgError && e.code === "FORBIDDEN" ? t("admin.msg.err.forbidden") : t("msg.err.send") }); }
    setSending(false);
  }
  async function status(s: "open" | "resolved") {
    try { await staffApi.setStatus(id, s); await refresh(); } catch { setFail({ body: "", clientId: "", msg: t("admin.msg.err.status") }); }
  }

  if (q.isLoading) return <div className="space-y-3 p-4"><Skeleton variant="row" className="h-10 w-1/2" /><Skeleton variant="row" className="h-40" /></div>;
  if (q.isError || !q.data) return <EmptyState icon={RefreshCw} title={t("msg.err.load")} action={<Button variant="secondary" onClick={() => void q.refetch()}>{t("msg.retry")}</Button>} />;
  const c = q.data;

  return (
    <div className="flex h-full min-h-[28rem] flex-col">
      <div className="flex items-center gap-2 border-b border-line p-3">
        <IconButton icon={ChevronLeft} label={t("common.back")} className="lg:hidden" onClick={onBack} />
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate font-bold text-ink">{c.customer.name}</p>
          <p className="m-0 truncate text-xs text-muted">{c.customer.is_guest ? t("admin.msg.guest") : t("admin.msg.account")}{c.customer.phone ? ` · ${c.customer.phone}` : ""}</p>
        </div>
        <Badge tone={c.status === "open" ? "info" : "success"} icon={c.status === "open" ? MessageCircle : CircleCheck}>{t(`admin.msg.status.${c.status}`)}</Badge>
        <Button size="sm" variant="secondary" onClick={() => void status(c.status === "open" ? "resolved" : "open")}>{c.status === "open" ? t("admin.msg.resolve") : t("admin.msg.reopen")}</Button>
      </div>

      {c.orders.length > 0 && (
        <details className="border-b border-line px-4 py-2 text-sm">
          <summary className="cursor-pointer font-semibold text-ink">{t("admin.msg.orders", { n: c.orders.length })}</summary>
          <ul className="m-0 mt-2 list-none space-y-1 p-0">
            {c.orders.map((o) => (
              <li key={o.id}><Link to={`/admin/orders/${o.id}`} className="flex items-center gap-2 text-ink no-underline hover:underline"><Package aria-hidden size={14} />{o.number}<span className="text-muted">· {t(`status.${o.status}`)} · {formatNpr(o.total_paisa)} · {new Date(o.placed_at).toLocaleDateString(dateLocale(locale))}</span></Link></li>
            ))}
          </ul>
        </details>
      )}

      <ul aria-label={t("msg.chat.history")} className="m-0 flex-1 list-none space-y-3 overflow-y-auto overscroll-contain p-4" style={accent("chat")}>
        {c.messages.map((m) => <Bubble key={m.client_id} mine={m.role === "staff"} body={m.body} at={m.at} />)}
      </ul>

      {fail && <div className="px-3"><Alert tone="danger"><span className="flex flex-wrap items-center gap-2">{fail.msg}{fail.body && <button type="button" className="font-semibold underline" onClick={() => void send(fail.body, fail.clientId)}>{t("msg.chat.retry")}</button>}</span></Alert></div>}
      <form onSubmit={(e) => { e.preventDefault(); const b = text.trim(); if (b) void send(b, fail?.body === b ? fail.clientId : randomUUID()); }} className="flex items-end gap-2 border-t border-line p-3">
        <Textarea rows={2} value={text} maxLength={2000} aria-label={t("admin.msg.reply")} placeholder={t("admin.msg.reply")} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} className="max-h-40 flex-1 resize-none" />
        <Button type="submit" loading={sending} disabled={!text.trim()} leadingIcon={Send}>{t("msg.chat.send")}</Button>
      </form>
    </div>
  );
}

function Inbox2({ filter, setFilter }: { filter: Filter; setFilter: (f: Filter) => void }) {
  const { t, locale } = useT();
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["admin", "msg", "inbox", filter, search], staleTime: 5000, placeholderData: (p) => p,
    refetchInterval: () => (document.visibilityState === "visible" ? 15_000 : false),
    queryFn: () => staffApi.inbox(filter, search.trim()),
  });
  const rows: InboxRow[] = q.data ?? [];

  return (
    <div className="grid overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--e1)] lg:grid-cols-[22rem_1fr]">
      <div className={cn("flex min-h-[28rem] flex-col border-line lg:border-r", sel && "hidden lg:flex")}>
        <div className="space-y-2 border-b border-line p-3">
          <label className="relative block">
            <span className="sr-only-text">{t("admin.msg.search")}</span>
            <Search aria-hidden size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("admin.msg.search")} className="block min-h-12 w-full rounded-sm border border-line-strong bg-surface pl-10 pr-3 text-base text-ink" />
          </label>
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="group" aria-label={t("admin.msg.filters")}>
            {FILTERS.map((f) => (
              <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}
                className={cn("min-h-10 shrink-0 rounded-pill border px-3 text-sm font-semibold", filter === f ? "border-ink bg-ink text-[var(--surface)]" : "border-line text-ink hover-fine:hover:bg-surface-2")}>{t(`admin.msg.filter.${f}`)}</button>
            ))}
          </div>
        </div>
        {q.isLoading ? <div className="space-y-2 p-3"><Skeleton variant="row" className="h-16" /><Skeleton variant="row" className="h-16" /></div>
          : q.isError ? <EmptyState icon={RefreshCw} title={t("msg.err.load")} action={<Button variant="secondary" size="sm" onClick={() => void q.refetch()}>{t("msg.retry")}</Button>} />
          : rows.length === 0 ? <EmptyState icon={Inbox} title={search || filter !== "all" ? t("admin.msg.none_match") : t("admin.msg.none")} description={search || filter !== "all" ? undefined : t("admin.msg.none_hint")} />
          : (
            <ul className="m-0 min-h-0 flex-1 list-none divide-y divide-line overflow-y-auto p-0">
              {rows.map((r) => (
                <li key={r.id}>
                  <button type="button" aria-current={sel === r.id || undefined} onClick={() => setSel(r.id)} className={cn("flex w-full items-start gap-3 p-3 text-left hover-fine:hover:bg-surface-2", sel === r.id && "bg-surface-2")}>
                    <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-tint font-bold text-brand-strong">{r.name[0]?.toUpperCase()}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={cn("truncate text-ink", r.unread ? "font-bold" : "font-semibold")}>{r.name}</span>
                        <time dateTime={r.last_message_at} className="shrink-0 text-xs text-muted">{new Date(r.last_message_at).toLocaleString(dateLocale(locale), { dateStyle: "short", timeStyle: "short" })}</time>
                      </span>
                      <span className="block truncate text-sm text-muted">{r.last_sender === "staff" ? `${t("admin.msg.you")}: ` : ""}{r.preview}</span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        {r.status === "resolved" && <Badge tone="success">{t("admin.msg.status.resolved")}</Badge>}
                        {r.status === "open" && r.last_sender === "customer" && <Badge tone="warning" icon={false}>{t("admin.msg.filter.awaiting")}</Badge>}
                        {r.is_guest && <Badge tone="neutral">{t("admin.msg.guest")}</Badge>}
                      </span>
                    </span>
                    {r.unread > 0 && <span className="mt-1 min-w-5 rounded-pill bg-accent px-1.5 text-center text-xs font-bold text-on-accent tabular" aria-label={t("msg.unread_n", { n: r.unread })}>{badgeText(r.unread)}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
      </div>
      <div className={cn("min-w-0", !sel && "hidden lg:block")}>
        {sel ? <Thread key={sel} id={sel} onBack={() => setSel(null)} /> : <EmptyState icon={MessageCircle} title={t("admin.msg.pick")} className="hidden lg:flex lg:h-full lg:items-center lg:justify-center" />}
      </div>
    </div>
  );
}

export default function MessagesAdmin() {
  const { t } = useT();
  const { perms } = useAuth();
  const [tab, setTab] = useState<Tab>("inbox");
  const [filter, setFilter] = useState<Filter>("all");
  const campaignsOn = useFeature("campaigns");
  const canManage = perms.has("messages.manage") && campaignsOn;
  const ov = useQuery({ queryKey: ["admin", "msg", "overview"], staleTime: 10_000, refetchInterval: () => (document.visibilityState === "visible" ? 30_000 : false), queryFn: staffApi.overview });
  const go = (f: Filter) => { setTab("inbox"); setFilter(f); };

  if (!perms.has("messages.reply")) return <EmptyState icon={Inbox} title={t("admin.denied")} description={t("admin.no_access_hint")} />;

  return (
    <div className="space-y-4">
      <header><h1 className="m-0 text-2xl font-bold">{t("admin.messages")}</h1></header>
      {ov.isError && <Alert tone="danger">{t("msg.err.load")}</Alert>}
      <section aria-label={t("admin.msg.overview")} className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3", canManage ? "xl:grid-cols-6" : "xl:grid-cols-3")}>
        <Stat label={t("admin.msg.stat.conversations")} value={ov.data?.conversations} tone="#0f9d8a" onClick={() => go("all")} />
        <Stat label={t("admin.msg.stat.unread")} value={ov.data?.unread} tone="#e11d74" onClick={() => go("unread")} />
        <Stat label={t("admin.msg.stat.awaiting")} value={ov.data?.awaiting} tone="#d97706" onClick={() => go("awaiting")} />
        {canManage && <>
          <Stat label={t("admin.msg.stat.announcements")} value={ov.data?.announcements} tone="#d97706" onClick={() => setTab("alert")} />
          <Stat label={t("admin.msg.stat.promos")} value={ov.data?.promos} tone="#e11d74" onClick={() => setTab("promo")} />
          <Stat label={t("admin.msg.stat.drafts")} value={ov.data?.drafts} tone="#64748b" onClick={() => setTab("alert")} />
        </>}
      </section>

      {canManage && (
        <SegmentedControl label={t("admin.messages")} hideLabel value={tab} onChange={setTab}
          options={[{ value: "inbox", label: t("admin.msg.tab.inbox") }, { value: "alert", label: t("admin.msg.tab.alert") }, { value: "promo", label: t("admin.msg.tab.promo") }]} />
      )}
      {tab === "inbox" ? <Inbox2 filter={filter} setFilter={setFilter} /> : <Suspense fallback={<PageSkeleton />}><CampaignManager kind={tab} /></Suspense>}
    </div>
  );
}
