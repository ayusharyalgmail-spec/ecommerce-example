// Visual-effects tier (docs/ux-overhaul/DESIGN.md section 3.5). Applied as data-fx on <html>.
// `connection.saveData` and `deviceMemory` are Chromium-only; other browsers get "full" and rely on
// the CSS fallbacks (prefers-reduced-transparency, @supports, forced-colors).

export type FxTier = "full" | "lite";
export type FxPref = "auto" | FxTier;

type Env = {
  pref: string | null;
  saveData?: boolean;
  deviceMemory?: number;
};

export function chooseFx(env: Env): FxTier {
  if (env.pref === "full" || env.pref === "lite") return env.pref;
  if (env.saveData) return "lite";
  if (env.deviceMemory !== undefined && env.deviceMemory <= 2) return "lite";
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
  return chooseFx({ pref: pref === "auto" ? null : pref, saveData: n.connection?.saveData, deviceMemory: n.deviceMemory });
}

export function applyFx(tier: FxTier) {
  document.documentElement.setAttribute("data-fx", tier);
}

export function savePref(pref: FxPref) {
  try { pref === "auto" ? localStorage.removeItem("fx") : localStorage.setItem("fx", pref); } catch { /* storage blocked */ }
}
