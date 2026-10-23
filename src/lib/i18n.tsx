import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import en from "@/messages/en.json";

export type Locale = "en" | "ne";
type Dict = Record<string, string>;
// English ships in the entry chunk (it is the fallback for every missing key). Nepali is a separate
// chunk fetched only when the locale is "ne" (about 3.7 kB gzip saved for English visitors).
let neDict: Dict | null = null;
const loadNe = () => import("@/messages/ne.json").then((m) => (neDict = m.default as Dict));

// Strings used only by the shop dashboard live in their own chunk, so shoppers never download them.
let adminEn: Dict | null = null;
let adminNe: Dict | null = null;
export const adminMessagesReady = () => adminEn !== null;
export async function loadAdminMessages() {
  if (adminEn) return;
  const [e, n] = await Promise.all([import("@/messages/admin.en.json"), import("@/messages/admin.ne.json")]);
  adminEn = e.default as Dict; adminNe = n.default as Dict;
}

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => Promise<void>;
  t: (key: string, vars?: Record<string, string | number>) => string;
};
const I18nCtx = createContext<Ctx | null>(null);

const initial = (): Locale => {
  try { return localStorage.getItem("lang") === "ne" ? "ne" : "en"; } catch { return "en"; }
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initial);
  const [, setLoaded] = useState(neDict !== null);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  useEffect(() => { if (locale === "ne" && !neDict) loadNe().then(() => setLoaded(true)); }, [locale]);
  const setLocale = useCallback(async (l: Locale) => {
    // Fetch the Nepali dictionary BEFORE switching so the UI never blanks or flashes untranslated text.
    if (l === "ne" && !neDict) await loadNe();
    setLocaleState(l);
    try { localStorage.setItem("lang", l); } catch { /* private mode */ }
  }, []);
  // Missing Nepali keys fall back to English; a missing key shows the key itself.
  const t = useCallback((key: string, vars?: Record<string, string | number>) => {
    let s = (locale === "ne" ? neDict?.[key] ?? adminNe?.[key] : undefined) ?? (en as Dict)[key] ?? adminEn?.[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
    return s;
  }, [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  // Only on a cold start with a saved Nepali choice: wait for the dictionary (a few ms) instead of flashing English.
  if (locale === "ne" && neDict === null) return null;
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

/** For dashboard screens: true once the dashboard strings are loaded (immediately on later visits). */
export function useAdminMessages() {
  const [ready, setReady] = useState(adminMessagesReady);
  useEffect(() => { if (!ready) void loadAdminMessages().then(() => setReady(true)); }, [ready]);
  return ready;
}

export function useT() {
  const c = useContext(I18nCtx);
  if (!c) throw new Error("useT outside I18nProvider");
  return c;
}

/** Nepali text when the locale is ne and a value exists, else English. */
export const pick = (locale: Locale, en: string | null | undefined, ne: string | null | undefined) =>
  locale === "ne" && ne ? ne : (en ?? "");

export const dateLocale = (l: Locale) => (l === "ne" ? "ne-NP" : "en-GB");
