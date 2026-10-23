import { supabase } from "@/lib/supabase";
import { MsgError, type ChatMsg } from "./api";

// Staff-only calls (admin chunk). Every one re-checks its permission in SQL.
const CODES = ["VALIDATION_FAILED", "RATE_LIMIT_EXCEEDED", "NOT_FOUND", "FORBIDDEN", "INVALID_TRANSITION"];
async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new MsgError(error.message, CODES.find((c) => error.message.startsWith(c)) ?? "UNKNOWN");
  return data as T;
}

export type StaffOverview = { conversations: number; unread: number; awaiting: number; announcements: number; promos: number; drafts: number };
export type InboxRow = { id: string; name: string; phone: string | null; is_guest: boolean; preview: string; last_sender: "customer" | "staff" | null; last_message_at: string; unread: number; status: "open" | "resolved"; assigned_to: string | null };
export type StaffConversation = {
  id: string; status: "open" | "resolved"; customer: { name: string; phone: string | null; is_guest: boolean }; messages: ChatMsg[];
  orders: { id: string; number: string; status: string; total_paisa: number; placed_at: string }[];
};
export type Campaign = {
  id: string; kind: "alert" | "promo"; title: string; body: string; title_ne: string | null; body_ne: string | null; image_path: string | null;
  cta_label: string | null; cta_label_ne: string | null; cta_url: string | null; audience: "all" | "signed_in" | "guests";
  status: "draft" | "published" | "archived"; starts_at: string | null; ends_at: string | null; published_at: string | null; updated_at: string;
};
export type CampaignInput = Omit<Campaign, "id" | "status" | "published_at" | "updated_at">;

export const staffApi = {
  overview: () => call<StaffOverview>("msg_staff_overview"),
  inbox: (filter: string, search: string) => call<InboxRow[]>("msg_staff_inbox", { p_filter: filter, p_search: search || null, p_limit: 100 }),
  conversation: (id: string) => call<StaffConversation>("msg_staff_conversation", { p_id: id }),
  reply: (id: string, body: string, clientId: string) => call<ChatMsg>("msg_staff_reply", { p_id: id, p_body: body, p_client_id: clientId }),
  setStatus: (id: string, status: "open" | "resolved") => call<void>("msg_staff_set_status", { p_id: id, p_status: status }),
  campaigns: () => call<Campaign[]>("msg_staff_campaigns"),
  saveCampaign: (id: string | null, data: CampaignInput) => call<string>("msg_save_campaign", { p_id: id, p_data: data }),
  setCampaignStatus: (id: string, status: Campaign["status"]) => call<number>("msg_set_campaign_status", { p_id: id, p_status: status }),
  deleteCampaign: (id: string) => call<void>("msg_delete_campaign", { p_id: id }),
  audience: (a: Campaign["audience"]) => call<number>("msg_audience_count", { p_audience: a }),
};

