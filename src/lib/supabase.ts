import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

// One browser client. Sessions live in localStorage and refresh automatically; every query
// runs as the signed-in user (or anon), so Postgres row-level security does the authorising.
export const supabase = createClient(SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY as string, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: "pkce" },
});

/** Stable error codes raised by our SQL functions ("CODE: detail"). */
export function errorCode(message: string | undefined): string {
  const m = message?.match(/^(INSUFFICIENT_STOCK|COUPON_UNAVAILABLE|IDEMPOTENCY_CONFLICT|VALIDATION_FAILED|RATE_LIMIT_EXCEEDED|NOT_FOUND|FORBIDDEN|STALE_STATUS|INVALID_TRANSITION)/);
  return m ? m[1] : "UNKNOWN";
}

/** Licensed photos (Wikimedia, Unsplash, external CDNs) are absolute URLs. */
export const isDemoPhoto = (path: string) => /^https?:\/\//.test(path);

export const imageUrl = (path?: string | null) =>
  !path ? null : isDemoPhoto(path) ? path : `${SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;
