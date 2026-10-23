import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { staffApi } from "@/messaging/staffApi";

/** Customer chats waiting for a staff read. Shares its query with the Messages overview so the badge and the cards never disagree. */
export function useStaffUnreadChats() {
  const { perms } = useAuth();
  return useQuery({
    queryKey: ["admin", "msg", "overview"], enabled: perms.has("messages.reply"), staleTime: 10_000, gcTime: 60_000,
    refetchInterval: () => (typeof document !== "undefined" && document.visibilityState === "visible" ? 30_000 : false),
    queryFn: staffApi.overview, select: (o) => o.unread,
  });
}
