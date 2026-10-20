import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import en from "@/messages/en.json";
import ne from "@/messages/ne.json";

export type Locale = "en" | "ne";
type Dict = Record<string, string>;
const dict: Record<Locale, Dict> = { en, ne };

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};
const I18nCtx = createContext<Ctx | null>(null);

const initial = (): Locale => {
  try { return localStorage.getItem("lang") === "ne" ? "ne" : "en"; } catch { return "en"; }
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initial);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem("lang", l); } catch { /* private mode */ }
  }, []);
  // Missing Nepali keys fall back to English; a missing key shows the key itself.
  const t = useCallback((key: string, vars?: Record<string, string | number>) => {
    let s = dict[locale][key] ?? dict.en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
    return s;
  }, [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
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
