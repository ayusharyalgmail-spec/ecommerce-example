// Demo catalogue switch. Fixture products only ever appear in two places:
//   * the dev server (`npm run dev`), and
//   * a build made explicitly as a demo deployment with VITE_DEMO_CATALOG=1.
// A normal production build makes DEMO_ALLOWED a literal `false`, so `demoOn()` is always false there and
// call sites written as `DEMO_ALLOWED && ...` drop the fixture chunk from the bundle. A real vendor's store
// therefore can never show sample products or block checkout, whatever is in the URL or localStorage.
//
// Where it is allowed, it is still off by default: VITE_DEMO_CATALOG=1 turns it on, and ?demo=1 / ?demo=0
// turns it on or off for this browser (remembered in localStorage).

export const DEMO_ALLOWED: boolean = import.meta.env.DEV || import.meta.env.VITE_DEMO_CATALOG === "1";

const KEY = "demo-catalog";

export function demoOn(): boolean {
  if (!DEMO_ALLOWED) return false;
  const byDefault = import.meta.env.VITE_DEMO_CATALOG === "1";
  try {
    const p = new URLSearchParams(window.location.search).get("demo");
    if (p === "1") localStorage.setItem(KEY, "1");
    else if (p === "0") localStorage.setItem(KEY, "0");
    const saved = localStorage.getItem(KEY);
    return saved === null ? byDefault : saved === "1";
  } catch {
    return byDefault;
  }
}
