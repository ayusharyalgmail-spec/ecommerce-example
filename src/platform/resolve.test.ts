import { beforeEach, describe, expect, it } from "vitest";
import { resolveTenantRef, basenameFor, SESSION_KEY } from "./resolve";

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };
const at = (hostname: string, pathname = "/", search = "") => ({ hostname, pathname, search });
const ROOT = "dumarwana.com";
let s = mem();
beforeEach(() => { s = mem(); });

describe("resolveTenantRef", () => {
  it("localhost without a tenant is the hub", () => expect(resolveTenantRef(at("localhost"), ROOT, s)).toEqual({ kind: "hub" }));
  it("www and the bare root are the hub", () => {
    expect(resolveTenantRef(at("www.dumarwana.com"), ROOT, s)).toEqual({ kind: "hub" });
    expect(resolveTenantRef(at("dumarwana.com"), ROOT, s)).toEqual({ kind: "hub" });
  });
  it("ecommerce.<root> is the flagship; other subdomains are vendor stores", () => {
    expect(resolveTenantRef(at("ecommerce.dumarwana.com"), ROOT, s)).toMatchObject({ kind: "slug", slug: "ecommerce" });
    expect(resolveTenantRef(at("family-mart.dumarwana.com"), ROOT, s)).toMatchObject({ kind: "slug", slug: "family-mart", via: "subdomain" });
  });
  it("an unrelated host is a custom domain lookup", () => expect(resolveTenantRef(at("shop.example.com"), ROOT, s)).toEqual({ kind: "domain", domain: "shop.example.com" }));
  it("?tenant=slug wins and is remembered for the tab", () => {
    expect(resolveTenantRef(at("localhost", "/", "?tenant=family-mart"), ROOT, s)).toMatchObject({ kind: "slug", slug: "family-mart", via: "query" });
    expect(s.getItem(SESSION_KEY)).toBe("family-mart");
    expect(resolveTenantRef(at("localhost", "/shop"), ROOT, s)).toMatchObject({ kind: "slug", slug: "family-mart", via: "session" });
  });
  it("?tenant=hub clears the remembered tenant", () => {
    s.setItem(SESSION_KEY, "ecommerce");
    expect(resolveTenantRef(at("localhost", "/", "?tenant=hub"), ROOT, s)).toEqual({ kind: "hub" });
    expect(s.getItem(SESSION_KEY)).toBeNull();
  });
  it("/s/:slug gives the router a basename", () => {
    const r = resolveTenantRef(at("localhost", "/s/family-mart/shop"), ROOT, s);
    expect(r).toMatchObject({ kind: "slug", slug: "family-mart", via: "path" });
    expect(basenameFor(r)).toBe("/s/family-mart");
  });
  it("rejects malformed slugs", () => {
    expect(resolveTenantRef(at("localhost", "/", "?tenant=../x"), ROOT, s)).toEqual({ kind: "hub" });
    expect(resolveTenantRef(at("localhost", "/s/A_B/"), ROOT, s)).toEqual({ kind: "hub" });
  });
  it("a remembered tenant never overrides a real subdomain", () => {
    s.setItem(SESSION_KEY, "family-mart");
    expect(resolveTenantRef(at("www.dumarwana.com"), ROOT, s)).toEqual({ kind: "hub" });
  });
  it("works without a configured root domain", () => {
    expect(resolveTenantRef(at("ecommerce-dumarwana.vercel.app"), undefined, s)).toEqual({ kind: "domain", domain: "ecommerce-dumarwana.vercel.app" });
  });
});
