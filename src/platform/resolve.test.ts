import { beforeEach, describe, expect, it } from "vitest";
import { resolveTenantRef, basenameFor, SESSION_KEY, shouldRedirectRootDomain } from "./resolve";

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

  describe("amanaryal.com multi-vendor routing", () => {
    it("amanaryal.com and www are the hub", () => {
      expect(resolveTenantRef(at("amanaryal.com"), undefined, s)).toEqual({ kind: "hub" });
      expect(resolveTenantRef(at("www.amanaryal.com"), undefined, s)).toEqual({ kind: "hub" });
    });

    it("myshop.amanaryal.com resolves to store with slug myshop", () => {
      expect(resolveTenantRef(at("myshop.amanaryal.com"), undefined, s)).toEqual({
        kind: "slug",
        slug: "myshop",
        via: "subdomain",
      });
    });

    it("family-mart.amanaryal.com resolves to store with slug family-mart", () => {
      expect(resolveTenantRef(at("family-mart.amanaryal.com"), undefined, s)).toEqual({
        kind: "slug",
        slug: "family-mart",
        via: "subdomain",
      });
    });

    it("dynamically scales for any <vendor>.amanaryal.com subdomain", () => {
      expect(resolveTenantRef(at("bobs-bakery.amanaryal.com"), undefined, s)).toEqual({
        kind: "slug",
        slug: "bobs-bakery",
        via: "subdomain",
      });
      expect(resolveTenantRef(at("electronics-99.amanaryal.com"), undefined, s)).toEqual({
        kind: "slug",
        slug: "electronics-99",
        via: "subdomain",
      });
    });

    it("supports <vendor>.localhost in local development", () => {
      expect(resolveTenantRef(at("myshop.localhost"), undefined, s)).toEqual({
        kind: "slug",
        slug: "myshop",
        via: "subdomain",
      });
    });

    it("ayush.amanaryal.com resolves to store with slug ayush", () => {
      expect(resolveTenantRef(at("ayush.amanaryal.com"), undefined, s)).toEqual({
        kind: "slug",
        slug: "ayush",
        via: "subdomain",
      });
    });
  });

  describe("shouldRedirectRootDomain", () => {
    it("redirects amanaryal.com to https://ayush.amanaryal.com/", () => {
      expect(shouldRedirectRootDomain(at("amanaryal.com", "/"))).toBe("https://ayush.amanaryal.com/");
      expect(shouldRedirectRootDomain(at("amanaryal.com", ""))).toBe("https://ayush.amanaryal.com/");
    });

    it("redirects www.amanaryal.com to https://ayush.amanaryal.com/", () => {
      expect(shouldRedirectRootDomain(at("www.amanaryal.com", "/"))).toBe("https://ayush.amanaryal.com/");
    });

    it("preserves paths and queries when redirecting from amanaryal.com", () => {
      expect(shouldRedirectRootDomain(at("amanaryal.com", "/shop", "?sort=price"))).toBe("https://ayush.amanaryal.com/shop?sort=price");
      expect(shouldRedirectRootDomain(at("amanaryal.com", "/network"))).toBe("https://ayush.amanaryal.com/network");
    });

    it("does not redirect platform admin or auth routes (retains Super Admin access on root)", () => {
      expect(shouldRedirectRootDomain(at("amanaryal.com", "/admin"))).toBeNull();
      expect(shouldRedirectRootDomain(at("amanaryal.com", "/admin/orders"))).toBeNull();
      expect(shouldRedirectRootDomain(at("amanaryal.com", "/auth/callback"))).toBeNull();
      expect(shouldRedirectRootDomain(at("amanaryal.com", "/login"))).toBeNull();
    });

    it("does not redirect localhost or other domains", () => {
      expect(shouldRedirectRootDomain(at("localhost", "/"))).toBeNull();
      expect(shouldRedirectRootDomain(at("ayush.amanaryal.com", "/"))).toBeNull();
      expect(shouldRedirectRootDomain(at("dumarwana.com", "/"))).toBeNull();
    });
  });
});

