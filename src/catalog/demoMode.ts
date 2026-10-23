// Demo catalogue switch (development only). Turn on with VITE_DEMO_CATALOG=1 in .env.development.local, or visit any
// page with ?demo=1 (remembered for this browser; ?demo=0 turns it off). Every call site guards with
// `import.meta.env.DEV && demoOn()`, so production builds fold the check to false and drop the fixture chunk.

const KEY = "demo-catalog";

export function demoOn(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    const p = new URLSearchParams(window.location.search).get("demo");
    if (p === "1") localStorage.setItem(KEY, "1");
    else if (p === "0") localStorage.removeItem(KEY);
    return import.meta.env.VITE_DEMO_CATALOG === "1" || localStorage.getItem(KEY) === "1";
  } catch { return import.meta.env.VITE_DEMO_CATALOG === "1"; }
}

