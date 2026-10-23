import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, BellOff, Button, Dialog, LogIn, Skeleton, Switch, toast } from "@/ui";
import { useT } from "@/lib/i18n";
import { signInHref } from "@/shell/Header";
import { getGuest, msgApi, setGuest, type Prefs } from "./api";
import { guarded, type Identity } from "./hooks";

const ROWS: { key: Exclude<keyof Prefs, "in_app">; label: string; hint: string }[] = [
  { key: "orders", label: "msg.pref.orders", hint: "msg.pref.orders_hint" },
  { key: "replies", label: "msg.pref.replies", hint: "msg.pref.replies_hint" },
  { key: "announcements", label: "msg.pref.announcements", hint: "msg.pref.announcements_hint" },
  { key: "promos", label: "msg.pref.promos", hint: "msg.pref.promos_hint" },
];

/** In-app notification preferences. Every switch defaults to on server-side; a saved choice is never reset by loading the page. */
export function PrefsPanel({ identity, onClose }: { identity: Identity; onClose: () => void }) {
  const { t } = useT();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const key = ["msg", "prefs", identity.key];
  const q = useQuery({ queryKey: key, queryFn: () => guarded(msgApi.prefs), staleTime: 60_000 });
  const m = useMutation({
    mutationFn: (p: Partial<Prefs>) => guarded(() => msgApi.setPrefs(p)),
    onMutate: async (p) => { await qc.cancelQueries({ queryKey: key }); const prev = qc.getQueryData<Prefs>(key); if (prev) qc.setQueryData(key, { ...prev, ...p }); return { prev }; },
    onError: (_e, _p, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); toast.error(t("msg.pref.err")); },
    onSettled: () => { void qc.invalidateQueries({ queryKey: ["msg", "unread"] }); void qc.invalidateQueries({ queryKey: ["msg", "feed"] }); },
  });
  const p = q.data;
  const guest = getGuest();

  return (
    <div className="space-y-5">
      {q.isLoading && <Skeleton variant="row" className="h-40" />}
      {q.isError && <Alert tone="danger">{t("msg.err.load")}</Alert>}
      {p && (
        <div className="divide-y divide-line rounded-lg border border-line bg-surface px-4">
          <div className="py-1"><Switch checked={p.in_app} onCheckedChange={(v) => m.mutate({ in_app: v })} label={<span><span className="block font-bold">{t("msg.pref.in_app")}</span><span className="block text-sm font-normal text-muted">{t("msg.pref.in_app_hint")}</span></span>} /></div>
          {ROWS.map((r) => (
            <div key={r.key} className="py-1">
              <Switch checked={p[r.key]} disabled={!p.in_app} onCheckedChange={(v) => m.mutate({ [r.key]: v })}
                label={<span><span className="block font-semibold">{t(r.label)}</span><span className="block text-sm font-normal text-muted">{t(r.hint)}</span></span>} />
            </div>
          ))}
        </div>
      )}
      <p className="m-0 flex items-start gap-2 text-sm text-muted"><BellOff aria-hidden size={18} className="mt-0.5 shrink-0" />{t("msg.pref.push_off")}</p>

      {identity.kind === "guest" && guest && (
        <div className="space-y-3 rounded-lg border border-line p-4">
          <p className="m-0 text-sm"><span className="font-semibold">{t("msg.guest.as", { name: guest.name })}</span><br /><span className="text-muted">{t("msg.guest.private")}</span></p>
          <div className="flex flex-wrap gap-2">
            <Link to={signInHref("/messages")} onClick={onClose} className="inline-flex min-h-12 items-center gap-2 rounded-md bg-brand px-4 font-semibold text-on-brand no-underline"><LogIn aria-hidden size={18} />{t("nav.signin")}</Link>
            <Button variant="secondary" onClick={() => setConfirm(true)}>{t("msg.guest.switch")}</Button>
          </div>
        </div>
      )}
      <Dialog open={confirm} onOpenChange={setConfirm} title={t("msg.guest.switch")} description={t("msg.guest.switch_warn")} closeLabel={t("common.close")}>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirm(false)}>{t("common.cancel")}</Button>
          <Button variant="danger" onClick={() => { setGuest(null); void qc.removeQueries({ queryKey: ["msg"] }); setConfirm(false); onClose(); }}>{t("msg.guest.switch_do")}</Button>
        </div>
      </Dialog>
    </div>
  );
}
