// Multi-tenant context: provides the current tenant to all components downstream.
// The tenant is resolved from the URL slug (/b/:slug) and cached in TanStack Query.
import { createContext, useContext } from "react";

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

const TenantCtx = createContext<Tenant | null>(null);

export const TenantProvider = TenantCtx.Provider;

export function useTenant(): Tenant {
  const t = useContext(TenantCtx);
  if (!t) throw new Error("useTenant outside TenantProvider — wrap with <TenantProvider>");
  return t;
}

export function useTenantOptional(): Tenant | null {
  return useContext(TenantCtx);
}
