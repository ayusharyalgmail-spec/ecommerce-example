// All data access goes straight from the browser to Supabase. Authorisation is enforced by
// Postgres (RLS policies + SECURITY DEFINER functions that re-check permissions), never by this file.
import { supabase, errorCode } from "./supabase";
import { normalizePhone, rupeesToPaisa } from "./money";

/* ----- storefront ----- */

export type CartLine = {
  id: string; slug: string; name_en: string; name_ne: string | null;
  price_paisa: number; discount_price_paisa: number | null; available: number; image: string | null;
};

export async function loadCartProducts(ids: string[]): Promise<CartLine[]> {
  if (!ids.length) return [];
  const { data } = await supabase.from("products")
    .select("id,slug,name_en,name_ne,price_paisa,discount_price_paisa,stock_quantity,reserved_quantity,product_images(storage_path,is_primary,sort_order)")
    .in("id", ids).eq("status", "published");
  return (data ?? []).map((p) => {
    const imgs = [...(p.product_images ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
    return { id: p.id, slug: p.slug, name_en: p.name_en, name_ne: p.name_ne, price_paisa: p.price_paisa,
      discount_price_paisa: p.discount_price_paisa, available: p.stock_quantity - p.reserved_quantity, image: imgs[0]?.storage_path ?? null };
  });
}

export type Quote = {
  items: { productId: string; name_en: string; quantity: number; unitPrice_paisa: number; lineTotal_paisa: number }[];
  itemsListTotal_paisa: number; itemDiscount_paisa: number; couponDiscount_paisa: number;
  deliveryFee_paisa: number; total_paisa: number;
};

export async function quoteCheckout(items: { productId: string; quantity: number }[], zoneId: string, coupon: string):
  Promise<{ ok: true; quote: Quote } | { ok: false; code: string }> {
  const { data, error } = await supabase.rpc("quote_checkout", { p_items: items, p_zone_id: zoneId, p_coupon: coupon.trim() || null });
  if (error) return { ok: false, code: errorCode(error.message) };
  return { ok: true, quote: data as Quote };
}

export type PlaceInput = {
  idempotencyKey: string; items: { productId: string; quantity: number }[]; zoneId: string; coupon: string;
  paymentMethod: "cod" | "manual"; name: string; phone: string; email: string;
  address: string; landmark: string; municipality: string; district: string; locale: string;
};

export async function placeOrder(i: PlaceInput): Promise<{ ok: true; token: string } | { ok: false; code: string }> {
  const phone = normalizePhone(i.phone);
  if (!phone || i.name.trim().length < 2 || i.address.trim().length < 3 || !i.items.length) return { ok: false, code: "VALIDATION_FAILED" };
  // Optional fields are sent as null (omitting them makes PostgREST look for a different function signature).
  const { data, error } = await supabase.rpc("place_order", {
    p_idempotency_key: i.idempotencyKey, p_items: i.items, p_zone_id: i.zoneId, p_coupon: i.coupon.trim() || null,
    p_payment_method: i.paymentMethod, p_name: i.name.trim(), p_phone: phone, p_email: i.email.trim() || null,
    p_recipient: i.name.trim(), p_ship_phone: phone, p_address: i.address.trim(), p_landmark: i.landmark.trim() || null,
    p_municipality: i.municipality.trim() || null, p_district: i.district.trim() || null, p_locale: i.locale,
  });
  if (error) return { ok: false, code: errorCode(error.message) };
  const res = data as { trackingToken?: string };
  return res.trackingToken ? { ok: true, token: res.trackingToken } : { ok: false, code: "IDEMPOTENCY_CONFLICT" };
}

export async function cancelOrder(orderId: string) {
  const { error } = await supabase.rpc("cancel_order_by_customer", { p_order_id: orderId });
  return error ? errorCode(error.message) : null;
}

export async function trackOrder(args: { token?: string; number?: string; phone?: string }) {
  const phone = args.phone ? args.phone.replace(/[\s-]/g, "").replace(/^(\+?977)?/, "+977") : null;
  const { data, error } = await supabase.rpc("track_order", {
    p_token: args.token || null, p_number: args.number?.trim().toUpperCase() || null, p_phone: phone,
  });
  return error || !data ? null : data;
}

/* ----- account ----- */

export async function toggleWishlist(productId: string): Promise<boolean | "login"> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return "login";
  const { data: existing } = await supabase.from("wishlists").select("product_id").eq("user_id", u.user.id).eq("product_id", productId).maybeSingle();
  if (existing) { await supabase.from("wishlists").delete().eq("user_id", u.user.id).eq("product_id", productId); return false; }
  await supabase.from("wishlists").insert({ user_id: u.user.id, product_id: productId });
  return true;
}

export async function saveAddress(f: Record<string, string | boolean>): Promise<string | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return "UNAUTHORIZED";
  const s = (k: string) => String(f[k] ?? "").trim() || null;
  const phone = normalizePhone(String(f.phone ?? ""));
  if (!phone || !s("recipient_name") || !s("address_line")) return "VALIDATION_FAILED";
  if (f.is_default) await supabase.from("customer_addresses").update({ is_default: false }).eq("user_id", u.user.id);
  const { error } = await supabase.from("customer_addresses").insert({
    user_id: u.user.id, label: s("label"), recipient_name: s("recipient_name"), phone, address_line: s("address_line"),
    landmark: s("landmark"), municipality: s("municipality"), district: s("district"), delivery_zone_id: s("delivery_zone_id"), is_default: !!f.is_default,
  });
  return error ? "UNKNOWN" : null;
}

export async function submitReview(orderItemId: string, rating: number, title: string, body: string): Promise<string | null> {
  const { error } = await supabase.rpc("submit_review", { p_order_item_id: orderItemId, p_rating: rating, p_title: title.slice(0, 120) || null, p_body: body.slice(0, 2000) || null });
  if (error) return error.code === "23505" ? "REVIEW_EXISTS" : errorCode(error.message);
  return null;
}

/* ----- admin ----- */

const rpc = async (fn: string, args: Record<string, unknown>) => {
  const { error } = await supabase.rpc(fn, args);
  return error ? errorCode(error.message) : null;
};

export const transitionOrder = (orderId: string, to: string, expected: string, note?: string) =>
  rpc("transition_order", { p_order_id: orderId, p_to: to, p_expected: expected, p_note: note || null });
export const verifyPayment = (id: string, decision: "verified" | "rejected", note: string) =>
  rpc("verify_payment", { p_record_id: id, p_decision: decision, p_note: note || null });
export const recordRefund = (orderId: string, rupees: number, note: string) =>
  rpc("record_refund", { p_order_id: orderId, p_amount: Math.round(rupees * 100), p_note: note || null });
export const markCodCollected = (orderId: string) => rpc("mark_cod_collected", { p_order_id: orderId });
export const adjustStock = (productId: string, delta: number, note: string) =>
  rpc("adjust_stock", { p_product_id: productId, p_delta: delta, p_reason: "manual_adjust", p_note: note || null });
export const moderateReview = (id: string, decision: "approved" | "rejected" | "hidden") =>
  rpc("moderate_review", { p_id: id, p_decision: decision });

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "product";

export async function saveProduct(f: Record<string, string>, id?: string): Promise<{ id?: string; error?: string }> {
  const s = (k: string) => (f[k] ?? "").trim() || null;
  const discount = rupeesToPaisa(f.discount_price);
  const status = f.status || "draft";
  const row = {
    name_en: s("name_en")!, name_ne: s("name_ne"), description_en: s("description_en"), description_ne: s("description_ne"),
    price_paisa: rupeesToPaisa(f.price), discount_price_paisa: discount > 0 ? discount : null,
    discount_label_en: s("discount_label_en"), discount_label_ne: s("discount_label_ne"),
    sku: s("sku"), category_id: s("category_id"), status, published_at: status === "published" ? new Date().toISOString() : null,
  };
  if (id) {
    const { error } = await supabase.from("products").update(row).eq("id", id);
    return error ? { error: error.message } : { id };
  }
  const slug = `${slugify(row.name_en)}-${Math.random().toString(36).slice(2, 6)}`;
  const { data, error } = await supabase.from("products").insert({ ...row, slug, stock_quantity: Math.max(0, Math.floor(Number(f.stock ?? 0))) }).select("id").single();
  return error ? { error: error.message } : { id: data.id };
}

export async function addProductImage(productId: string, path: string) {
  const { data: existing } = await supabase.from("product_images").select("id").eq("product_id", productId);
  const { error } = await supabase.from("product_images").insert({ product_id: productId, storage_path: path, is_primary: !existing?.length, sort_order: existing?.length ?? 0 });
  return error?.message ?? null;
}

export async function deleteProductImage(imageId: string, path: string) {
  await supabase.from("product_images").delete().eq("id", imageId);
  await supabase.storage.from("product-images").remove([path]);
}

export async function saveSettings(f: Record<string, string | boolean>) {
  const s = (k: string) => String(f[k] ?? "").trim() || null;
  const { error } = await supabase.from("store_settings").update({
    store_name: s("store_name") ?? "Store", contact_phone: s("contact_phone"), whatsapp_number: s("whatsapp_number"), contact_email: s("contact_email"),
    payment_settings: { cod_enabled: !!f.cod_enabled, manual_enabled: !!f.manual_enabled, instructions_en: s("instructions_en"), instructions_ne: s("instructions_ne") },
    business_info: { legal_name: s("legal_name"), address: s("address"), pan: s("pan"), vat: s("vat") },
    policies: { returns_en: s("returns_en"), returns_ne: s("returns_ne") },
    free_delivery_threshold_paisa: String(f.threshold ?? "") ? rupeesToPaisa(String(f.threshold)) : null,
    unconfirmed_expiry_hours: Math.min(720, Math.max(1, Number(f.expiry) || 24)),
  }).eq("id", 1);
  return error?.message ?? null;
}

export async function saveCoupon(f: Record<string, string>) {
  const type = f.type === "fixed" ? "fixed" : "percent";
  const { error } = await supabase.from("coupons").insert({
    code: f.code.trim(), type, value: type === "fixed" ? rupeesToPaisa(f.value) : Math.round(Number(f.value)),
    min_subtotal_paisa: rupeesToPaisa(f.min_subtotal), max_discount_paisa: f.max_discount ? rupeesToPaisa(f.max_discount) : null,
    ends_at: f.ends_at ? new Date(f.ends_at).toISOString() : null, max_redemptions: f.max_redemptions ? Number(f.max_redemptions) : null,
    per_customer_limit: Number(f.per_customer_limit) || 1,
  });
  return error?.message ?? null;
}

export async function saveZone(f: Record<string, string>) {
  const row = { name_en: f.name_en.trim(), name_ne: f.name_ne?.trim() || null, fee_paisa: rupeesToPaisa(f.fee), free_threshold_paisa: f.threshold ? rupeesToPaisa(f.threshold) : null };
  const { error } = f.id ? await supabase.from("delivery_zones").update(row).eq("id", f.id) : await supabase.from("delivery_zones").insert(row);
  return error?.message ?? null;
}

export async function inviteStaff(email: string, role: string, permissions: string[]) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from("staff_invites").upsert({ email: email.trim().toLowerCase(), role, permissions, invited_by: u.user?.id });
  return error?.message ?? null;
}

export async function importProducts(rows: Record<string, string>[]) {
  const { data, error } = await supabase.rpc("import_products", { p_rows: rows });
  if (error) return { processed: 0, errors: [{ row: 0, error: error.message }] };
  return data as { processed: number; errors: { row: number; error: string }[] };
}
