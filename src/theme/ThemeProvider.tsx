import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { applyFx, detectFx, readFxPref, savePref, type FxPref, type FxTier } from "./fx";
import { brandCss, deriveBrand, type BrandResult } from "./brand";

export type ThemeMode = "light" | "dark" | "system";

type Ctx = {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  fxPref: FxPref;
  fx: FxTier;
  setFxPref: (p: FxPref) => void;
  /** Vendor brand: pass the primary colour; null resets to the default charcoal. */
  setBrandColor: (hex: string | null) => BrandResult | null;
};
const ThemeCtx = createContext<Ctx | null>(null);

/** Light is the default for first-time visitors; "system" is only used when the visitor chose it. */
export const readMode = (): ThemeMode => {
  try { const v = localStorage.getItem("theme"); return v === "dark" || v === "system" ? v : "light"; } catch { return "light"; }
};

/** Browser UI colour (Android status bar) follows the page background of the active theme. */
function syncThemeColor() {
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
  if (bg) document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", bg));
}

export function ThemeProvider({ children, brandColor }: { children: React.ReactNode; brandColor?: string | null }) {
  const [mode, setModeState] = useState<ThemeMode>(readMode);
  const [fxPref, setFxPrefState] = useState<FxPref>(readFxPref);
  const [fx, setFx] = useState<FxTier>(() => detectFx());

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    const root = document.documentElement;
    if (m === "system") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", m);
    try { localStorage.setItem("theme", m); } catch { /* storage blocked */ }
    syncThemeColor();
  }, []);

  const setFxPref = useCallback((p: FxPref) => {
    savePref(p);
    setFxPrefState(p);
    const tier = detectFx(p);
    setFx(tier);
    applyFx(tier);
  }, []);

  useEffect(() => { applyFx(fx); }, [fx]);

  const setBrandColor = useCallback((hex: string | null) => {
    let el = document.getElementById("brand-vars") as HTMLStyleElement | null;
    const result = hex ? deriveBrand(hex) : null;
    if (!result) { el?.remove(); return null; }
    if (!el) { el = document.createElement("style"); el.id = "brand-vars"; document.head.appendChild(el); }
    el.textContent = brandCss(result);
    return result;
  }, []);

  useEffect(() => { if (brandColor !== undefined) setBrandColor(brandColor); }, [brandColor, setBrandColor]);

  const value = useMemo(() => ({ mode, setMode, fxPref, fx, setFxPref, setBrandColor }), [mode, setMode, fxPref, fx, setFxPref, setBrandColor]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const c = useContext(ThemeCtx);
  if (!c) throw new Error("useTheme outside ThemeProvider");
  return c;
}
