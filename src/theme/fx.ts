// Visual-effects tier (docs/ux-overhaul/DESIGN.md section 3.5). Applied as data-fx on <html>.
// `connection.saveData` and `deviceMemory` are Chromium-only; other browsers get "full" and rely on
// the CSS fallbacks (prefers-reduced-transparency, @supports, forced-colors).

export type FxTier = "full" | "lite";
export type FxPref = "auto" | FxTier;

type Env = {
  pref: string | null;
  saveData?: boolean;
  deviceMemory?: number;
  cores?: number;
  touch?: boolean;
};

export function chooseFx(env: Env): FxTier {
  if (env.pref === "full" || env.pref === "lite") return env.pref;
  if (env.saveData) return "lite";
  if (env.deviceMemory !== undefined && env.deviceMemory <= 2) return "lite";
  // Touch phones and tablets with 4 GB or less, or 6 or fewer cores, drop frames with live backdrop blur: start them on Lite.
  if (env.touch && ((env.deviceMemory !== undefined && env.deviceMemory <= 4) || (env.cores !== undefined && env.cores <= 6))) return "lite";
  return "full";
}

type Nav = Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };

export function readFxPref(): FxPref {
  try {
    const v = localStorage.getItem("fx");
    return v === "full" || v === "lite" ? v : "auto";
  } catch { return "auto"; }
}

export function detectFx(pref: FxPref = readFxPref()): FxTier {
  const n = navigator as Nav;
  return chooseFx({ pref: pref === "auto" ? null : pref, saveData: n.connection?.saveData, deviceMemory: n.deviceMemory, cores: n.hardwareConcurrency, touch: window.matchMedia?.("(pointer: coarse)").matches });
}

export function applyFx(tier: FxTier) {
  document.documentElement.setAttribute("data-fx", tier);
}

export function savePref(pref: FxPref) {
  try { if (pref === "auto") localStorage.removeItem("fx"); else localStorage.setItem("fx", pref); } catch { /* storage blocked */ }
}
