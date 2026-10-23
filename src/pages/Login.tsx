import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { useTitle } from "@/components/ui";
import { useStoreSettings } from "@/lib/queries";
import { Alert, Button, Field, Input, Mail } from "@/ui";
import { StoreMark } from "@/shell/Header";

const safeNext = (n: string) => (n.startsWith("/") && !n.startsWith("//") ? n : "/");

/** Google's "G" mark, drawn inline so the button needs no external asset. */
function GoogleMark() {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export default function Login() {
  const { t } = useT();
  const [sp] = useSearchParams();
  const store = useStoreSettings().data;
  const next = safeNext(sp.get("next") ?? "/");
  useTitle(t("auth.title"));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(sp.get("error") ? { ok: false, text: sp.get("error")! } : null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const emailOk = /^\S+@\S+\.\S+$/.test(email);

  async function run(fn: () => Promise<{ error: { message: string } | null }>, okText?: string) {
    setBusy(true); setMsg(null);
    const { error } = await fn();
    setBusy(false);
    if (error) setMsg({ ok: false, text: error.message });
    else if (okText) setMsg({ ok: true, text: okText });
    else window.location.assign(`/auth/callback?next=${encodeURIComponent(next)}&session=1`);
  }

  return (
    <main className="page-in flex min-h-[calc(100dvh-12rem)] items-start justify-center px-4 py-8 sm:items-center sm:py-12">
      <div className="w-full max-w-[26rem] space-y-6 rounded-xl border border-line bg-surface p-5 shadow-[var(--e1)] sm:p-8">
        <div className="space-y-3">
          <StoreMark name={store?.store_name} />
          <h1 className="m-0 pt-2 text-title font-bold">{t("auth.title")}</h1>
          <p className="m-0 text-muted">{t("auth.hint")}</p>
        </div>

        {msg && <Alert tone={msg.ok ? "success" : "danger"}>{msg.text}</Alert>}

        <Button block size="lg" variant="secondary" disabled={busy}
          onClick={() => run(() => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } }))}>
          <GoogleMark />{t("auth.google")}
        </Button>

        <div className="flex items-center gap-3 text-sm text-muted" role="separator" aria-label={t("auth.or")}>
          <span aria-hidden className="h-px flex-1 bg-[var(--line)]" />{t("auth.or")}<span aria-hidden className="h-px flex-1 bg-[var(--line)]" />
        </div>

        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void run(() => supabase.auth.signInWithPassword({ email, password })); }}>
          <Field label={t("auth.email")} required>
            {(a) => <Input {...a} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" enterKeyHint="next" />}
          </Field>
          <Field label={t("auth.password")} hint={t("auth.password_hint")}>
            {(a) => <Input {...a} type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" enterKeyHint="go" />}
          </Field>
          <Button type="submit" block size="lg" loading={busy} disabled={password.length < 6 || !emailOk}>{t("nav.signin")}</Button>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="ghost" disabled={busy || password.length < 6 || !emailOk}
              onClick={async () => {
                setBusy(true); setMsg(null);
                const r = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
                setBusy(false);
                if (r.error) setMsg({ ok: false, text: r.error.message });
                // With "Confirm email" on there is no session yet: that is success, so say to check the inbox.
                else if (!r.data.session) setMsg({ ok: true, text: t("auth.sent") });
                else window.location.assign(`/auth/callback?next=${encodeURIComponent(next)}&session=1`);
              }}>
              {t("auth.signup")}
            </Button>
            <Button type="button" variant="ghost" leadingIcon={Mail} disabled={busy || !emailOk}
              onClick={() => run(() => supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } }), t("auth.sent"))}>
              {t("auth.link_short")}
            </Button>
          </div>
        </form>

        <p className="m-0 border-t border-line pt-4 text-sm text-muted">
          {t("auth.guest")} <Link to="/track" className="font-semibold text-brand-strong">{t("nav.track")}</Link>
        </p>
      </div>
    </main>
  );
}
