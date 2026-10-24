import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { useTenantKey } from "@/platform/TenantContext";

// Mirrors app_private.role_permissions in SQL (DATABASE.md §11). Hiding UI is cosmetic only:
// every table has row-level security and every sensitive RPC re-checks the permission.
const ALL = ["products.view", "products.manage", "orders.view", "orders.manage", "orders.verify_payment", "orders.override_confirmation",
  "customers.view", "coupons.manage", "delivery.manage", "reviews.moderate", "reports.view", "csv.manage", "staff.manage", "settings.manage", "audit.view", "messages.reply", "messages.manage"];
const BY_ROLE: Record<string, string[]> = {
  owner: ALL,
  manager: ALL.filter((p) => !["staff.manage", "settings.manage", "orders.override_confirmation"].includes(p)),
  staff: ["products.view", "orders.view", "orders.manage", "messages.reply"],
};

type Ctx = {
  user: User | null;
  loading: boolean;
  perms: Set<string>;
  isStaff: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};
const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [perms, setPerms] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  // Permissions are per store: re-read them whenever the active tenant changes (the x-tenant-id header changes with it).
  const tenantKey = useTenantKey();

  const loadPerms = useCallback(async (u: User | null) => {
    if (!u) { setPerms(new Set()); return; }
    const { data } = await supabase.from("staff_members").select("role,permissions,is_active").eq("user_id", u.id).maybeSingle();
    setPerms(data?.is_active ? new Set([...(BY_ROLE[data.role] ?? []), ...(data.permissions ?? [])]) : new Set());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantKey]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setUser(data.session?.user ?? null);
    await loadPerms(data.session?.user ?? null);
  }, [loadPerms]);

  useEffect(() => {
    let alive = true;
    // Initial session load: the state updates happen after an awaited network call, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    refresh().finally(() => alive && setLoading(false));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      // Defer: calling Supabase inside this callback can deadlock the auth lock.
      setTimeout(() => { setUser(session?.user ?? null); loadPerms(session?.user ?? null); }, 0);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [refresh, loadPerms]);

  const signOut = useCallback(async () => { await supabase.auth.signOut(); }, []);
  const value = useMemo(() => ({ user, loading, perms, isStaff: perms.size > 0, signOut, refresh }), [user, loading, perms, signOut, refresh]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

/** Static auth for stories and the dev gallery: no network, fixed permissions. */
export function MockAuthProvider({ perms, email = "owner@example.com", children }: { perms: string[]; email?: string; children: React.ReactNode }) {
  const value = useMemo<Ctx>(() => ({
    user: { id: "mock", email } as User, loading: false, perms: new Set(perms), isStaff: perms.length > 0,
    signOut: async () => {}, refresh: async () => {},
  }), [perms, email]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}
