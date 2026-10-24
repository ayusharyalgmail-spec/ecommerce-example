// Tenant context. Two layers live here:
//   * the RESOLVER (TenantProvider/useTenant): which tenant does this page load belong to, hub or store (see resolve.ts);
//   * the BUSINESS page context (BusinessProvider/useBusiness): the /b/:slug brochure page being rendered.
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ALL_FEATURES, FLAGSHIP_SLUG, normalizeFeatures, type FeatureKey, type TenantFeatures } from "./features";
import { type TenantRef } from "./resolve";
import { setFlagshipFallback } from "@/catalog/demoMode";

export type Tenant = {
  id: string;
  slug: string;
  business_name: string;
  business_name_ne: string | null;
  tagline: string | null;
  tagline_ne: string | null;
  about: string | null;
  about_ne: string | null;
  logo_path: string | null;
  cover_path: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  address_ne: string | null;
  municipality: string | null;
  district: string | null;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
  map_embed_url: string | null;
  brand_primary: string | null;
  brand_config: Record<string, unknown>;
  social_links: Record<string, string>;
  business_type: string | null;
  business_type_ne: string | null;
  seo_title: string | null;
  seo_description: string | null;
  custom_domain: string | null;
  /** Absent until the tenant-features migration is applied; read it through normalizeFeatures. */
  features?: unknown;
  status?: string;
};

export type TenantHours = {
  id: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
};

export type TenantService = {
  id: string;
  name_en: string;
  name_ne: string | null;
  description_en: string | null;
  description_ne: string | null;
  price_display: string | null;
  image_path: string | null;
  sort_order: number;
  is_active: boolean;
};

export type TenantGalleryItem = {
  id: string;
  storage_path: string;
  caption_en: string | null;
  caption_ne: string | null;
  sort_order: number;
};

// ---------------------------------------------------------------- business page (/b/:slug)
const BusinessCtx = createContext<Tenant | null>(null);
export const BusinessProvider = BusinessCtx.Provider;

export function useBusiness(): Tenant {
  const t = useContext(BusinessCtx);
  if (!t) throw new Error("useBusiness outside BusinessProvider");
  return t;
}

// ---------------------------------------------------------------- resolver
export type TenantState = {
  mode: "hub" | "store";
  tenant: Tenant | null;
  /** Database id; null for the hub and for the offline/unseeded flagship fallback. */
  tenantId: string | null;
  slug: string | null;
  isLoading: boolean;
  error: Error | null;
  hasFeature: (key: FeatureKey) => boolean;
  /** True when the flagship could not be read from the database and the bundled demo fixture is being used. */
  isFallback: boolean;
};

const HUB: TenantState = { mode: "hub", tenant: null, tenantId: null, slug: null, isLoading: false, error: null, hasFeature: () => false, isFallback: false };
const Ctx = createContext<TenantState>(HUB);

/** Minimal flagship record used when the database has no `ecommerce` row yet (or is unreachable). Never carries an id. */
const FLAGSHIP_FALLBACK = { slug: FLAGSHIP_SLUG, business_name: "Ecommerce", business_name_ne: null, brand_primary: null } as unknown as Tenant;

async function fetchTenant(ref: TenantRef): Promise<Tenant | null> {
  if (ref.kind === "hub") return null;
  const { data, error } = ref.kind === "slug"
    ? await supabase.rpc("get_tenant_by_slug", { p_slug: ref.slug })
    : await supabase.rpc("get_tenant_by_domain", { p_domain: ref.domain });
  if (error) throw new Error(error.message);
  return (data as Tenant | null) ?? null;
}

/** One React Query cache per tenant, so nothing cached for one store can ever render in another (and no key needs a prefix). */
const clients = new Map<string, QueryClient>();
export function clientFor(scope: string): QueryClient {
  let c = clients.get(scope);
  if (!c) { c = new QueryClient(); clients.set(scope, c); }
  return c;
}

/** Must sit inside the platform-level QueryClientProvider. Children get their own per-tenant cache. */
export function TenantProvider({ tenantRef, children }: { tenantRef: TenantRef; children: ReactNode }) {
  const q = useQuery({
    queryKey: ["platform", "tenant", tenantRef],
    enabled: tenantRef.kind !== "hub",
    staleTime: 5 * 60_000,
    retry: 1,
    queryFn: () => fetchTenant(tenantRef),
  });

  const value = useMemo<TenantState>(() => {
    if (tenantRef.kind === "hub") return HUB;
    setFlagshipFallback(false);
    const flagship = (tenantRef.kind === "slug" && tenantRef.slug === FLAGSHIP_SLUG) || (tenantRef.kind === "domain" && !q.isLoading && !q.data);
    const row = q.data ?? null;
    // The flagship keeps working offline / before it is seeded: it falls back to the bundled demo fixture.
    if (!row && flagship) {
      setFlagshipFallback(!q.isLoading);
      return { mode: "store", tenant: q.isLoading ? null : FLAGSHIP_FALLBACK, tenantId: null, slug: FLAGSHIP_SLUG, isLoading: q.isLoading, error: null, hasFeature: () => true, isFallback: true };
    }
    const slug = row?.slug ?? (tenantRef.kind === "slug" ? tenantRef.slug : null);
    const features: TenantFeatures = row?.slug === FLAGSHIP_SLUG ? ALL_FEATURES : normalizeFeatures(row?.features);
    return {
      mode: "store", tenant: row, tenantId: row?.id ?? null, slug, isLoading: q.isLoading,
      error: q.error ?? (!q.isLoading && !row ? new Error("TENANT_NOT_FOUND") : null),
      hasFeature: (k) => features[k] === true, isFallback: false,
    };
  }, [tenantRef, q.data, q.isLoading, q.error]);

  const scope = value.mode === "hub" ? "hub" : value.tenantId ?? value.slug ?? "default";
  return (
    <Ctx.Provider value={value}>
      <QueryClientProvider client={clientFor(scope)}>{children}</QueryClientProvider>
    </Ctx.Provider>
  );
}

export function useTenant(): TenantState { return useContext(Ctx); }

/** Stable cache-key segment for the current tenant (use it as the first element of every tenant-scoped query key). */
export function useTenantKey(): string {
  const { mode, tenantId, slug } = useTenant();
  return mode === "hub" ? "hub" : tenantId ?? slug ?? "default";
}

/** Whether the current tenant has a feature. Everything is on for `ecommerce`. */
export function useFeature(key: FeatureKey): boolean { return useTenant().hasFeature(key); }
