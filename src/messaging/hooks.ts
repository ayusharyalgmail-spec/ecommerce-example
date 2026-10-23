import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { MsgError, fetchUnread, setGuest, useGuest, type Counts } from "./guest";

export type Identity = { kind: "loading" | "none" | "guest" | "user"; key: string };


/** Who is using Messages: a signed-in user, a guest holding a session secret, or nobody yet. */
export function useIdentity(): Identity {
  const { user, loading } = useAuth();
  const guest = useGuest();

  if (loading) return { kind: "loading", key: "loading" };
  if (user) return { kind: "user", key: `u:${user.id}` };
  if (guest) return { kind: "guest", key: `g:${guest.token.slice(0, 8)}` };
  return { kind: "none", key: "none" };
}

/** Runs a messaging call; an unknown or expired guest secret is dropped so the page falls back to the identity step. */
export async function guarded<T>(run: () => Promise<T>): Promise<T> {
  try { return await run(); } catch (e) {
    if (e instanceof MsgError && e.expired) {
      try { sessionStorage.setItem("msg.expired", "1"); } catch { /* the identity step simply omits the notice */ }
      setGuest(null);
    }
    throw e;
  }
}

const ZERO: Counts = { total: 0, chat: 0, order: 0, alert: 0, promo: 0 };

/** Unread counts from the database. Polls every 30 s while the tab is visible (no realtime channel is configured for messages). */
export function useUnread() {
  const id = useIdentity();
  const q = useQuery({
    queryKey: ["msg", "unread", id.key], enabled: id.kind === "user" || id.kind === "guest", staleTime: 15_000, gcTime: 60_000,
    refetchInterval: () => (typeof document !== "undefined" && document.visibilityState === "visible" ? 30_000 : false),
    refetchOnWindowFocus: true, retry: 1,
    queryFn: () => guarded(fetchUnread),
  });
  const data = q.data ?? ZERO;
  return { ...data, total: Math.max(0, data.total) };
}

const subscribeOnline = (cb: () => void) => {
  window.addEventListener("online", cb); window.addEventListener("offline", cb);
  return () => { window.removeEventListener("online", cb); window.removeEventListener("offline", cb); };
};
export const useOnline = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
