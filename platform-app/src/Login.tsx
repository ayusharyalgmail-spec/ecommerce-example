import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useT } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { Button, Field, Input } from "@/ui";
import { safeNext } from "./safeNext";

export default function Login() {
  const { t } = useT();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const redirectTo = `${window.location.origin}${next}`;

  const google = () => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setMsg(error.message);
    else window.location.assign(next);
  };
  const link = async () => {
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo, shouldCreateUser: false } });
    setBusy(false);
    setMsg(error ? error.message : t("auth.sent"));
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center gap-4 p-4">
      <h1 className="text-2xl font-bold">{t("auth.title")}</h1>
      <Button onClick={google} variant="secondary">{t("auth.google")}</Button>
      <p className="text-center text-sm text-[var(--muted)]">{t("auth.or")}</p>
      <form onSubmit={submit} className="space-y-3">
        <Field label={t("auth.email")} required>
          {(p) => <Input {...p} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label={t("auth.password")}>
          {(p) => <Input {...p} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        <Button type="submit" disabled={busy || !password}>{t("auth.title")}</Button>
        <Button type="button" variant="ghost" disabled={busy || !email} onClick={link}>{t("auth.link")}</Button>
      </form>
      {msg && <p role="status" className="text-sm">{msg}</p>}
    </main>
  );
}
