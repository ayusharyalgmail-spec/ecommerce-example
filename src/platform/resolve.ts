// Decides which tenant a page load belongs to. Pure (no React, no network) so it is unit-tested.
import { FLAGSHIP_SLUG } from "./features";

export type TenantRef =
  | { kind: "hub" }
  | { kind: "slug"; slug: string; via: "path" | "query" | "subdomain" | "session" }
  | { kind: "domain"; domain: string };

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
export const SESSION_KEY = "tenant";

export const DEFAULT_ROOT_DOMAIN = "amanaryal.com";
export const SUPPORTED_ROOT_DOMAINS = ["amanaryal.com", "dumarwana.com"] as const;

type Loc = { hostname: string; pathname: string; search: string };
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;

const isLocalHost = (h: string) => h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h.endsWith(".localhost") || /^\d+\.\d+\.\d+\.\d+$/.test(h);

/** Path prefix to give the router when the tenant came from /s/:slug (so every in-app link stays inside it). */
export function basenameFor(ref: TenantRef): string {
  return ref.kind === "slug" && ref.via === "path" ? `/s/${ref.slug}` : "/";
}

/**
 * Order: /s/:slug  >  ?tenant=slug (remembered for the tab)  >  subdomain / custom domain  >  remembered tenant (dev hosts only).
 * Root domain defaults to amanaryal.com (with support for dumarwana.com / configured rootDomain).
 * `amanaryal.com` / `dumarwana.com`, `www`, and bare localhost are the hub;
 * any vendor subdomain (e.g. `myshop.amanaryal.com`, `family-mart.amanaryal.com`, `<vendor>.amanaryal.com`)
 * resolves to a store with that tenant slug;
 * an unrelated hostname is looked up as a custom_domain.
 */
export function resolveTenantRef(loc: Loc, rootDomain?: string, session?: Store): TenantRef {
  const read = () => { try { return session?.getItem(SESSION_KEY) ?? null; } catch { return null; } };
  const write = (v: string | null) => { try { if (v === null) session?.removeItem(SESSION_KEY); else session?.setItem(SESSION_KEY, v); } catch { /* storage blocked */ } };

  const m = loc.pathname.match(/^\/s\/([^/]+)(?:\/|$)/);
  if (m && SLUG_RE.test(m[1])) return { kind: "slug", slug: m[1], via: "path" };

  const q = new URLSearchParams(loc.search).get("tenant");
  if (q === "hub" || q === "reset") { write(null); if (q === "hub") return { kind: "hub" }; }
  else if (q && SLUG_RE.test(q.toLowerCase())) { write(q.toLowerCase()); return { kind: "slug", slug: q.toLowerCase(), via: "query" }; }

  const host = loc.hostname.toLowerCase();
  const dev = isLocalHost(host);

  // In local dev, also allow testing via <vendor>.localhost
  if (dev && host.endsWith(".localhost")) {
    const sub = host.slice(0, -".localhost".length);
    if (sub === "" || sub === "www") return { kind: "hub" };
    if (SLUG_RE.test(sub) || sub === "ecommerce") return { kind: "slug", slug: sub, via: "subdomain" };
  }

  // Check candidate roots: explicit rootDomain (if provided), followed by default supported roots
  const candidateRoots = Array.from(new Set([rootDomain, ...SUPPORTED_ROOT_DOMAINS].filter((d): d is string => Boolean(d))))
    .map((d) => d.toLowerCase().replace(/^\./, ""));

  if (!dev) {
    const matchedRoot = candidateRoots.find((r) => host === r || host.endsWith("." + r));
    if (matchedRoot) {
      const sub = host === matchedRoot ? "" : host.slice(0, -(matchedRoot.length + 1));
      if (sub === "" || sub === "www") return { kind: "hub" };
      if (SLUG_RE.test(sub) || sub === "ecommerce") return { kind: "slug", slug: sub, via: "subdomain" };
      return { kind: "hub" };
    }
    return { kind: "domain", domain: host };
  }

  const saved = read();
  if (saved && SLUG_RE.test(saved)) return { kind: "slug", slug: saved, via: "session" };
  return { kind: "hub" };
}

export const isFlagship = (ref: TenantRef) => ref.kind === "slug" && ref.slug === FLAGSHIP_SLUG;

/**
 * If visiting the root domain (amanaryal.com or www.amanaryal.com),
 * automatically redirect to https://ayush.amanaryal.com/ (preserving path/query,
 * while allowing /admin for Super Admin access).
 */
export function shouldRedirectRootDomain(loc: Loc): string | null {
  const host = loc.hostname.toLowerCase();
  if (host === "amanaryal.com" || host === "www.amanaryal.com") {
    const p = loc.pathname.toLowerCase();
    // Allow platform admin, auth callbacks, and login to be reached directly on root domain
    if (!p.startsWith("/admin") && !p.startsWith("/auth") && !p.startsWith("/login")) {
      const path = loc.pathname === "" ? "/" : loc.pathname;
      return `https://ayush.amanaryal.com${path}${loc.search}`;
    }
  }
  return null;
}
