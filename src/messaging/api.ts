import { call, tok } from "./guest";
export { setGuest, getGuest, useGuest, MsgError, type Guest, type Counts } from "./guest";

export type Prefs = { in_app: boolean; orders: boolean; replies: boolean; announcements: boolean; promos: boolean };
export type Kind = "chat" | "order" | "alert" | "promo";

export type FeedItem = {
  ref: "notification" | "campaign"; id: string; kind: "order" | "alert" | "promo"; at: string; unread: boolean;
  // order notices carry a status code; text comes from the dictionary
  code?: string; order_id?: string; order_number?: string;
  // campaigns carry authored text
  title?: string; body?: string; title_ne?: string | null; body_ne?: string | null; image_path?: string | null;
  cta_label?: string | null; cta_label_ne?: string | null; cta_url?: string | null; ends_at?: string | null;
};
export type ChatMsg = { id: string; role: "customer" | "staff"; body: string; client_id: string; at: string };
export type Conversation = { conversation: { id: string; status: "open" | "resolved"; last_message_at: string } | null; messages: ChatMsg[] };
export type Me = { kind: "user" | "guest"; name: string | null; phone: string | null };

export const msgApi = {
  guestStart: (name: string, phone: string | null) => call<{ guest_id: string; token: string; name: string; phone: string | null }>("msg_guest_start", { p_name: name, p_phone: phone }),
  me: () => call<Me>("msg_me", tok()),
  feed: (kind: Exclude<Kind, "chat">) => call<FeedItem[]>("msg_feed", { ...tok(), p_kind: kind, p_limit: 50 }),
  markRead: (ref: FeedItem["ref"], id: string) => call<void>("msg_mark_read", { ...tok(), p_ref: ref, p_id: id }),
  markAll: (kind: Kind | null) => call<void>("msg_mark_all_read", { ...tok(), p_kind: kind }),
  conversation: () => call<Conversation>("msg_conversation", tok()),
  send: (body: string, clientId: string) => call<ChatMsg>("msg_send", { ...tok(), p_body: body, p_client_id: clientId }),
  prefs: () => call<Prefs>("msg_get_prefs", tok()),
  setPrefs: (p: Partial<Prefs>) => call<Prefs>("msg_set_prefs", { ...tok(), p_prefs: p }),
  claimGuest: (token: string) => call<void>("msg_claim_guest", { p_token: token }),
};

export const campaignImage = (path?: string | null) =>
  path ? `${import.meta.env.VITE_SUPABASE_URL as string}/storage/v1/object/public/store-assets/${path}` : null;
