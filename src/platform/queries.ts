// Tenant data queries — resolves tenant by slug, fetches services, hours, gallery.
// All reads go through Supabase RLS; no private data leaks to unauthenticated visitors.
import { useQuery } from "@tanstack/react-query";
import { supabase, SUPABASE_URL } from "@/lib/supabase";
import type { Tenant, TenantHours, TenantService, TenantGalleryItem } from "./TenantContext";

const TEN_MIN = 10 * 60_000;
const FIVE_MIN = 5 * 60_000;

/** Public URL of a file in the tenant-assets bucket. */
export const tenantAssetUrl = (path?: string | null) =>
  path ? `${SUPABASE_URL}/storage/v1/object/public/tenant-assets/${path}` : null;

// ---- Tenant by slug ----
export function useTenantBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["tenant", slug],
    enabled: !!slug,
    staleTime: FIVE_MIN,
    queryFn: async (): Promise<Tenant | null> => {
      if (!slug) return null;
      const { data, error } = await supabase.rpc("get_tenant_by_slug", { p_slug: slug });
      if (error) throw new Error(error.message);
      return (data as Tenant) ?? null;
    },
  });
}

// ---- All active tenants (for network home) ----
export type TenantCard = {
  id: string;
  slug: string;
  business_name: string;
  business_name_ne: string | null;
  tagline: string | null;
  tagline_ne: string | null;
  logo_path: string | null;
  cover_path: string | null;
  business_type: string | null;
  business_type_ne: string | null;
  brand_primary: string | null;
};

export function useActiveTenants() {
  return useQuery({
    queryKey: ["tenants", "active"],
    staleTime: FIVE_MIN,
    queryFn: async (): Promise<TenantCard[]> => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id,slug,business_name,business_name_ne,tagline,tagline_ne,logo_path,cover_path,business_type,business_type_ne,brand_primary")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as TenantCard[];
    },
  });
}

// ---- Tenant services ----
export function useTenantServices(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["tenant-services", tenantId],
    enabled: !!tenantId,
    staleTime: FIVE_MIN,
    queryFn: async (): Promise<TenantService[]> => {
      const { data, error } = await supabase
        .from("tenant_services")
        .select("id,name_en,name_ne,description_en,description_ne,price_display,image_path,sort_order,is_active")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw new Error(error.message);
      return (data ?? []) as TenantService[];
    },
  });
}

// ---- Tenant hours ----
export function useTenantHours(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["tenant-hours", tenantId],
    enabled: !!tenantId,
    staleTime: TEN_MIN,
    queryFn: async (): Promise<TenantHours[]> => {
      const { data, error } = await supabase
        .from("tenant_hours")
        .select("id,day_of_week,open_time,close_time,is_closed")
        .eq("tenant_id", tenantId!)
        .order("day_of_week");
      if (error) throw new Error(error.message);
      return (data ?? []) as TenantHours[];
    },
  });
}

// ---- Tenant gallery ----
export function useTenantGallery(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["tenant-gallery", tenantId],
    enabled: !!tenantId,
    staleTime: FIVE_MIN,
    queryFn: async (): Promise<TenantGalleryItem[]> => {
      const { data, error } = await supabase
        .from("tenant_gallery")
        .select("id,storage_path,caption_en,caption_ne,sort_order")
        .eq("tenant_id", tenantId!)
        .order("sort_order");
      if (error) throw new Error(error.message);
      return (data ?? []) as TenantGalleryItem[];
    },
  });
}

// ---- Platform settings ----
export type PlatformSettings = {
  network_name: string;
  network_name_ne: string | null;
  network_tagline: string | null;
  network_tagline_ne: string | null;
  cta_text: string | null;
  cta_text_ne: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  featured_tenant_ids: string[];
};

export function usePlatformSettings() {
  return useQuery({
    queryKey: ["platform-settings"],
    staleTime: TEN_MIN,
    queryFn: async (): Promise<PlatformSettings> => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data as PlatformSettings;
    },
  });
}

// ---- Tenant inquiries (staff only — RLS enforced) ----
export type Inquiry = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
};

export function useTenantInquiries(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["tenant-inquiries", tenantId],
    enabled: !!tenantId,
    staleTime: 30_000,
    queryFn: async (): Promise<Inquiry[]> => {
      const { data, error } = await supabase
        .from("tenant_inquiries")
        .select("id,name,phone,email,message,is_read,created_at")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return (data ?? []) as Inquiry[];
    },
  });
}

// ---- Analytics (staff only) ----
export type AnalyticsSummary = {
  today: number;
  week: number;
  month: number;
};

export function useTenantAnalytics(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["tenant-analytics", tenantId],
    enabled: !!tenantId,
    staleTime: 60_000,
    queryFn: async (): Promise<AnalyticsSummary> => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString();

      const [todayRes, weekRes, monthRes] = await Promise.all([
        supabase.from("tenant_analytics").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId!).gte("created_at", todayStart),
        supabase.from("tenant_analytics").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId!).gte("created_at", weekStart),
        supabase.from("tenant_analytics").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId!).gte("created_at", monthStart),
      ]);

      return {
        today: todayRes.count ?? 0,
        week: weekRes.count ?? 0,
        month: monthRes.count ?? 0,
      };
    },
  });
}
