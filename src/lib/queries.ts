// Shared, de-duplicated queries (TanStack Query). Cache policy per docs/ux-overhaul/ARCHITECTURE.md 7.1.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { demoOn } from "@/catalog/demoMode";

export const TEN_MIN = 10 * 60_000;

export type Category = { id: string; slug: string; name_en: string; name_ne: string | null };

/** Categories change rarely and are used by Home and Shop: one request, shared and cached for 10 minutes. */
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    staleTime: TEN_MIN,
    queryFn: async (): Promise<Category[]> => {
      if (import.meta.env.DEV && demoOn()) return (await import("@/catalog/demo")).categories;
      const { data, error } = await supabase.from("categories").select("id,slug,name_en,name_ne").eq("is_active", true).order("sort_order");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export type DeliveryZone = { id: string; name_en: string; name_ne: string | null; fee_paisa: number };

/** What the shop actually offers (active delivery zones, cash on delivery), so marketing copy never over-promises.
 *  Both are public reads that checkout already relies on. */
export function useServiceInfo() {
  return useQuery({
    queryKey: ["service-info"],
    staleTime: TEN_MIN,
    queryFn: async () => {
      const [z, s] = await Promise.all([
        supabase.from("delivery_zones").select("id,name_en,name_ne,fee_paisa").eq("is_active", true).order("sort_order"),
        supabase.from("store_settings").select("payment_settings").single(),
      ]);
      const ps = (s.data?.payment_settings ?? {}) as { cod_enabled?: boolean };
      return { zones: (z.data ?? []) as DeliveryZone[], cod: ps.cod_enabled === true };
    },
  });
}

export function useStoreSettings() {
  return useQuery({
    queryKey: ["settings", "public"],
    staleTime: TEN_MIN,
    queryFn: async () => {
      const { data, error } = await supabase.from("store_settings").select("store_name,brand,ui_v2,contact_phone,whatsapp_number,contact_email,policies").single();
      if (error) throw new Error(error.message);
      return data as {
        store_name: string; brand: { primary?: string } | null; ui_v2: boolean;
        contact_phone: string | null; whatsapp_number: string | null; contact_email: string | null;
        policies: { returns_en?: string; returns_ne?: string } | null;
      };
    },
  });
}
