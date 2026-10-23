// Visual-effects tier (docs/ux-overhaul/DESIGN.md section 3.5). Applied as data-fx on <html>.
// Fresh installs start on Lite; Full is opt-in from Appearance and persisted in localStorage("fx").

export type FxTier = "full" | "lite";
export type FxPref = "auto" | FxTier;

type Env = {
  pref: string | null;
  saveData?: boolean;
  deviceMemory?: number;
  cores?: number;
  touch?: boolean;
};

/** Lite is the default for everyone (CLAUDE.md "Required UX defaults"); only a saved explicit choice of Full turns
 * effects on. Device hints are kept in the signature so a future "auto" tier can use them without call-site changes. */
export function chooseFx(env: Env): FxTier {
  if (env.pref === "full" || env.pref === "lite") return env.pref;
  return "lite";
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
