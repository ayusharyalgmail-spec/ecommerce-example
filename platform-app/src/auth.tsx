import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// Control-plane auth: identity only. What a user may do is decided by Postgres RLS and the platform_* RPCs
// (membership in tenant_staff / tenants.owner_id / platform_admins), never by this context.
type Ctx = { user: User | null; loading: boolean; signOut: () => Promise<void> };
const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) { setUser(data.session?.user ?? null); setLoading(false); }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      // Defer: calling Supabase inside this callback can deadlock the auth lock.
      setTimeout(() => setUser(session?.user ?? null), 0);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  const signOut = useCallback(async () => { await supabase.auth.signOut(); }, []);
  const value = useMemo(() => ({ user, loading, signOut }), [user, loading, signOut]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}
