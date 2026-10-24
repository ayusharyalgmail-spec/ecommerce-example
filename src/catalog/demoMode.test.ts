import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// DEMO_ALLOWED is computed when the module loads, so each case stubs the env and imports a fresh copy.
async function load(env: { DEV: boolean; VITE_DEMO_CATALOG?: string }) {
  vi.stubEnv("DEV", env.DEV);
  vi.stubEnv("PROD", !env.DEV);
  vi.stubEnv("VITE_DEMO_CATALOG", env.VITE_DEMO_CATALOG ?? "");
  vi.resetModules();
  return import("./demoMode");
}

function visit(search: string) {
  window.history.replaceState(null, "", `/${search}`);
}

describe("demo catalogue switch", () => {
  beforeEach(() => { localStorage.clear(); visit(""); });
  afterEach(() => { vi.unstubAllEnvs(); localStorage.clear(); visit(""); });

  it("is always off in a normal production build, even with ?demo=1 or a saved preference", async () => {
    const m = await load({ DEV: false });
    expect(m.DEMO_ALLOWED).toBe(false);
    expect(m.demoOn()).toBe(false);
    localStorage.setItem("demo-catalog", "1");
    visit("?demo=1");
    expect(m.demoOn()).toBe(false);
  });

  it("is off by default on the dev server and can be toggled with ?demo=1 / ?demo=0", async () => {
    const m = await load({ DEV: true });
    expect(m.demoOn()).toBe(false);
    visit("?demo=1");
    expect(m.demoOn()).toBe(true);
    visit("");
    expect(m.demoOn()).toBe(true); // remembered
    visit("?demo=0");
    expect(m.demoOn()).toBe(false);
  });

  it("is on by default for an explicit demo build (VITE_DEMO_CATALOG=1) and can still be turned off", async () => {
    const m = await load({ DEV: false, VITE_DEMO_CATALOG: "1" });
    expect(m.DEMO_ALLOWED).toBe(true);
    expect(m.demoOn()).toBe(true);
    visit("?demo=0");
    expect(m.demoOn()).toBe(false);
  });
});
