import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

/** Orders waiting for the vendor to confirm. Polls every 30 s while the tab is visible; RLS limits it to staff with orders.view. */
export function usePendingOrders() {
  const { perms } = useAuth();
  const on = perms.has("orders.view");
  return useQuery({
    queryKey: ["admin", "pending-count"], enabled: on, staleTime: 15_000, gcTime: 60_000,
    refetchInterval: () => (typeof document !== "undefined" && document.visibilityState === "visible" ? 30_000 : false),
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { count, error } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending_confirmation");
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
  });
}
