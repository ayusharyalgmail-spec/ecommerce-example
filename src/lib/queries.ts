// Shared, de-duplicated queries (TanStack Query). Cache policy per docs/ux-overhaul/ARCHITECTURE.md 7.1.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";

export const TEN_MIN = 10 * 60_000;

export type Category = { id: string; slug: string; name_en: string; name_ne: string | null };

/** Categories change rarely and are used by Home and Shop: one request, shared and cached for 10 minutes. */
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    staleTime: TEN_MIN,
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase.from("categories").select("id,slug,name_en,name_ne").eq("is_active", true).order("sort_order");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useStoreSettings() {
  return useQuery({
    queryKey: ["settings", "public"],
    staleTime: TEN_MIN,
    queryFn: async () => {
      const { data, error } = await supabase.from("store_settings").select("store_name").single();
      if (error) throw new Error(error.message);
      return data as { store_name: string };
    },
  });
}
