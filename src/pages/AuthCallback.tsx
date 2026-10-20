import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Loading } from "@/components/ui";

// Landing page for Google OAuth, email links and password sign-in. supabase-js exchanges the
// ?code= for a session by itself (PKCE); we then activate any staff invite for this email.
export default function AuthCallback() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { refresh } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const next = sp.get("next") ?? "/";
    const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/";
    (async () => {
      const code = sp.get("code");
      let reason = sp.get("error_description") ?? "";
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) reason = error.message;
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) { nav(`/login?error=${encodeURIComponent(reason || "Sign-in failed. Open the link in the same browser you requested it from.")}`, { replace: true }); return; }
      await supabase.rpc("claim_staff_invite");
      await refresh();
      nav(safe, { replace: true });
    })();
  }, [sp, nav, refresh]);

  return <Loading />;
}
