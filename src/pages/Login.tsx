import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { ErrorBox, OkBox, useTitle } from "@/components/ui";

const safeNext = (n: string) => (n.startsWith("/") && !n.startsWith("//") ? n : "/");

export default function Login() {
  const { t } = useT();
  const [sp] = useSearchParams();
  const next = safeNext(sp.get("next") ?? "/");
  useTitle(t("auth.title"));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(sp.get("error") ? { ok: false, text: sp.get("error")! } : null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function run(fn: () => Promise<{ error: { message: string } | null }>, okText?: string) {
    setBusy(true); setMsg(null);
    const { error } = await fn();
    setBusy(false);
    if (error) setMsg({ ok: false, text: error.message });
    else if (okText) setMsg({ ok: true, text: okText });
    else window.location.assign(`/auth/callback?next=${encodeURIComponent(next)}&session=1`);
  }

  return (
    <main className="container-page max-w-md space-y-4 py-12">
      <h1 className="text-center text-3xl font-bold">{t("auth.title")}</h1>
      <p className="muted text-center">{t("auth.hint")}</p>
      <div className="space-y-4">
        <button className="btn btn-secondary w-full" disabled={busy}
          onClick={() => run(() => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } }))}>
          {t("auth.google")}
        </button>
        <p className="muted m-0 text-center text-sm">{t("auth.or")}</p>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => supabase.auth.signInWithPassword({ email, password })); }}>
          <label className="field"><span>{t("auth.email")}</span><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
          <label className="field"><span>{t("auth.password")}</span><input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn btn-primary" disabled={busy || password.length < 6}>{t("nav.signin")}</button>
            <button type="button" className="btn btn-secondary" disabled={busy || password.length < 6 || !email}
              onClick={() => run(async () => {
                const r = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
                if (r.error) return r;
                // With "Confirm email" on there is no session yet: tell the user to check their inbox.
                return r.data.session ? { error: null } : { error: { message: t("auth.sent") } };
              })}>
              {t("auth.signup")}
            </button>
          </div>
          <button type="button" className="btn btn-secondary w-full" disabled={busy || !email}
            onClick={() => run(() => supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } }), t("auth.sent"))}>
            {t("auth.link")}
          </button>
        </form>
        {msg && (msg.ok ? <OkBox>{msg.text}</OkBox> : <ErrorBox>{msg.text}</ErrorBox>)}
      </div>
    </main>
  );
}
