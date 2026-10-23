import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, IconButton, LoaderCircle, MessageCircle, RefreshCw, Send, Skeleton, TriangleAlert, cn } from "@/ui";
import { dateLocale, useT } from "@/lib/i18n";
import { randomUUID } from "@/lib/uuid";
import { MsgError, msgApi, type ChatMsg } from "./api";
import { guarded, useOnline, type Identity } from "./hooks";
import { accent, chipTone } from "./MessageCards";

type Pending = { client_id: string; body: string; status: "sending" | "failed"; error?: string; at: string };

export function Bubble({ mine, body, at, state, onRetry }: { mine: boolean; body: string; at: string; state?: "sending" | "failed"; onRetry?: () => void }) {
  const { t, locale } = useT();
  return (
    <li className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
      <div className={cn("max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3.5 py-2 text-[0.9375rem]",
        mine ? "rounded-br-sm bg-[var(--c)] text-white" : "rounded-bl-sm border border-line bg-surface-2 text-ink", state === "sending" && "opacity-70")}>
        {body}
      </div>
      <span className="mt-0.5 flex items-center gap-1 px-1 text-xs text-muted">
        {state === "sending" ? <><LoaderCircle aria-hidden size={12} className="animate-spin" />{t("msg.chat.sending")}</>
          : state === "failed" ? <span className="flex items-center gap-1 font-semibold text-danger"><TriangleAlert aria-hidden size={12} />{t("msg.chat.failed")}
              {onRetry && <button type="button" onClick={onRetry} className="ml-1 inline-flex min-h-6 items-center gap-1 underline"><RefreshCw aria-hidden size={12} />{t("msg.chat.retry")}</button>}</span>
          : <time dateTime={at}>{new Date(at).toLocaleString(dateLocale(locale), { dateStyle: "medium", timeStyle: "short" })}</time>}
      </span>
    </li>
  );
}

/** Customer-side support conversation. Polls while open (no realtime channel is configured); sends are idempotent by client id. */
export function ChatPanel({ identity }: { identity: Identity }) {
  const { t } = useT();
  const qc = useQueryClient();
  const online = useOnline();
  const [text, setText] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const list = useRef<HTMLUListElement>(null);

  const q = useQuery({
    queryKey: ["msg", "conv", identity.key], staleTime: 0, retry: 1,
    refetchInterval: () => (document.visibilityState === "visible" ? 6000 : false),
    queryFn: () => guarded(msgApi.conversation),
  });
  // Opening the thread clears the unread counter server-side; refresh the badge to match.
  useEffect(() => { if (q.dataUpdatedAt) void qc.invalidateQueries({ queryKey: ["msg", "unread"] }); }, [q.dataUpdatedAt, qc]);

  const server: ChatMsg[] = q.data?.messages ?? [];
  const known = new Set(server.map((m) => m.client_id));
  const shown = [...server.map((m) => ({ ...m, state: undefined as undefined | "sending" | "failed" })),
    ...pending.filter((p) => !known.has(p.client_id)).map((p) => ({ id: p.client_id, role: "customer" as const, body: p.body, client_id: p.client_id, at: p.at, state: p.status }))];

  useEffect(() => { const el = list.current; if (el) el.scrollTop = el.scrollHeight; }, [shown.length]);

  async function deliver(p: Pending) {
    setPending((xs) => xs.map((x) => (x.client_id === p.client_id ? { ...x, status: "sending", error: undefined } : x)));
    try {
      await guarded(() => msgApi.send(p.body, p.client_id));
      await qc.invalidateQueries({ queryKey: ["msg", "conv", identity.key] });
      setPending((xs) => xs.filter((x) => x.client_id !== p.client_id));
    } catch (e) {
      const error = e instanceof MsgError && e.code === "RATE_LIMIT_EXCEEDED" ? t("msg.err.rate") : t("msg.err.send");
      setPending((xs) => xs.map((x) => (x.client_id === p.client_id ? { ...x, status: "failed", error } : x)));
    }
  }
  function submit() {
    const body = text.trim();
    if (!body) return;
    setText("");
    void deliver({ client_id: randomUUID(), body, status: "sending", at: new Date().toISOString() });
  }
  const failed = pending.find((p) => p.status === "failed");

  return (
    <section aria-label={t("msg.cat.chat")} style={accent("chat")} className="flex h-[min(68dvh,38rem)] min-h-[22rem] flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-[var(--e1)]">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span aria-hidden className={cn("flex size-10 items-center justify-center rounded-full", chipTone)}><MessageCircle size={20} /></span>
        <div className="min-w-0">
          <p className="m-0 truncate font-bold text-ink">{t("msg.chat.title")}</p>
          <p className="m-0 text-xs text-muted">{q.data?.conversation?.status === "resolved" ? t("msg.chat.resolved") : t("msg.chat.sub")}</p>
        </div>
      </div>

      {q.isLoading ? (
        <div className="flex-1 space-y-3 p-4" aria-busy="true"><Skeleton variant="row" className="h-10 w-2/3" /><Skeleton variant="row" className="ml-auto h-10 w-1/2" /><Skeleton variant="row" className="h-10 w-3/5" /></div>
      ) : q.isError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <TriangleAlert aria-hidden size={28} className="text-danger" />
          <p className="m-0 text-ink">{t("msg.err.load")}</p>
          <Button variant="secondary" size="sm" leadingIcon={RefreshCw} onClick={() => void q.refetch()}>{t("msg.retry")}</Button>
        </div>
      ) : shown.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="m-0 font-bold text-ink">{t("msg.chat.empty")}</p>
          <p className="m-0 max-w-xs text-sm text-muted">{t("msg.chat.empty_hint")}</p>
        </div>
      ) : (
        <ul ref={list} aria-live="polite" aria-label={t("msg.chat.history")} className="m-0 flex-1 list-none space-y-3 overflow-y-auto overscroll-contain p-4">
          {shown.map((m) => <Bubble key={m.client_id} mine={m.role === "customer"} body={m.body} at={m.at} state={m.state}
            onRetry={m.state === "failed" ? () => { const p = pending.find((x) => x.client_id === m.client_id); if (p) void deliver(p); } : undefined} />)}
        </ul>
      )}

      {!online && <div className="px-3 pt-2"><Alert tone="warning">{t("msg.offline")}</Alert></div>}
      {failed?.error && <div className="px-3 pt-2"><Alert tone="danger">{failed.error}</Alert></div>}
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex items-end gap-2 border-t border-line p-3">
        <textarea rows={1} value={text} maxLength={2000} aria-label={t("msg.chat.input")} placeholder={t("msg.chat.input")}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); } }}
          className="block max-h-32 min-h-12 flex-1 resize-none rounded-sm border border-line-strong bg-surface px-3.5 py-3 text-base text-ink placeholder:text-muted" />
        <IconButton type="submit" variant="primary" icon={Send} label={t("msg.chat.send")} disabled={!text.trim()} />
      </form>
    </section>
  );
}
