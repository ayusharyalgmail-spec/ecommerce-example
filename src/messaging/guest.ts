import { useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";

// Guest session = a random secret issued by the server (only its hash is stored there). It proves "this is the same
// browser", nothing more: a typed name or phone number never grants access to a conversation.
const KEY = "msg.guest";
export type Guest = { token: string; name: string; phone: string | null };

let cache: Guest | null | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function read(): Guest | null {
  if (cache !== undefined) return cache;
  try {
    const g = JSON.parse(localStorage.getItem(KEY) ?? "null") as Guest | null;
    cache = g && typeof g.token === "string" && g.token.length >= 40 ? g : null;
  } catch { cache = null; }
  return cache;
}
export function setGuest(g: Guest | null) {
  cache = g;
  try { if (g) localStorage.setItem(KEY, JSON.stringify(g)); else localStorage.removeItem(KEY); } catch { /* storage blocked: session lasts until reload */ }
  emit();
}
export const getGuest = read;
export function useGuest(): Guest | null {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, read, () => null);
}

export class MsgError extends Error {
  constructor(message: string, public code: string) { super(message); this.name = "MsgError"; }
  /** The guest secret is unknown or older than the retention window. */
  get expired() { return this.code === "FORBIDDEN" && /session expired/i.test(this.message); }
}

const CODES = ["VALIDATION_FAILED", "RATE_LIMIT_EXCEEDED", "NOT_FOUND", "FORBIDDEN", "INVALID_TRANSITION"];
export async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    const code = CODES.find((c) => error.message.startsWith(c)) ?? "UNKNOWN";
    throw new MsgError(error.message, code);
  }
  return data as T;
}
export const tok = () => ({ p_token: read()?.token ?? null });

export type Counts = { total: number; chat: number; order: number; alert: number; promo: number };
export const fetchUnread = () => call<Counts>("msg_unread", tok());
