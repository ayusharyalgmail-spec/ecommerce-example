import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// D-010: the service worker must never cache private or API responses. Guard the deny-list and the fetch rules.
const sw = readFileSync("public/sw.js", "utf8");

describe("service worker (D-010)", () => {
  it("denies caching for every private route", () => {
    const list = /const PRIVATE = \[(.*?)\]/s.exec(sw)?.[1] ?? "";
    for (const p of ["/api", "/account", "/admin", "/checkout", "/track", "/cart", "/auth", "/login", "/orders"]) expect(list).toContain(`"${p}"`);
  });
  it("only handles same-origin GET requests", () => {
    expect(sw).toMatch(/req\.method !== "GET"/);
    expect(sw).toMatch(/url\.origin !== location\.origin/);
  });
});
