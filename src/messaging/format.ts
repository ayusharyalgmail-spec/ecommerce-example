/** Pure helpers for the messaging UI (kept free of React and Supabase so they are easy to test). */

/** Compact unread indicator: nothing for 0 or less, "9+" above nine. Never negative. */
export function badgeText(n: number | null | undefined): string {
  const v = Math.floor(Number(n) || 0);
  return v <= 0 ? "" : v > 9 ? "9+" : String(v);
}

/** Normalises a typed phone number. Nepal mobile numbers get +977; any other international number is kept. Returns null when invalid. */
export function normalizePhone(raw: string): string | null {
  const s = raw.trim().replace(/[\s-]/g, "");
  if (!s) return null;
  if (!/^\+?\d+$/.test(s)) return null;
  if (/^9[78]\d{8}$/.test(s)) return `+977${s}`;
  if (/^977\d{10}$/.test(s)) return `+${s}`;
  // Any other country must say so: a bare local number is ambiguous.
  const digits = s.slice(1);
  return s.startsWith("+") && digits.length >= 7 && digits.length <= 15 ? s : null;
}

export type Period = "today" | "yesterday" | "week" | "earlier";

/** Which timeline bucket a timestamp belongs to, by calendar day in the viewer's time zone. */
export function periodOf(iso: string, now = new Date()): Period {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(now) - start(d)) / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : days < 7 ? "week" : "earlier";
}

const ORDER: Period[] = ["today", "yesterday", "week", "earlier"];

export function groupByPeriod<T extends { at: string }>(items: T[], now = new Date()): { period: Period; items: T[] }[] {
  const by = new Map<Period, T[]>();
  for (const it of items) {
    const p = periodOf(it.at, now);
    by.set(p, [...(by.get(p) ?? []), it]);
  }
  return ORDER.filter((p) => by.has(p)).map((period) => ({ period, items: by.get(period)! }));
}

/** Only same-site paths and https links may become a CTA. Anything else is dropped, never rendered as a link. */
export function safeCta(url: string | null | undefined): { href: string; external: boolean } | null {
  if (!url) return null;
  if (/^\/(?![/\\])/.test(url)) return { href: url, external: false };
  if (/^https:\/\/[^\s]+$/.test(url)) return { href: url, external: true };
  return null;
}
