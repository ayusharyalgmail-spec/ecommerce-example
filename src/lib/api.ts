import { randomUUID } from "@/lib/uuid";
import { DEMO_ALLOWED, demoOn } from "@/catalog/demoMode";
// All data access goes straight from the browser to Supabase. Authorisation is enforced by
// Postgres (RLS policies + SECURITY DEFINER functions that re-check permissions), never by this file.
import { supabase, errorCode } from "./supabase";
import { normalizePhone, rupeesToPaisa } from "./money";
import { minQty } from "./minQty";
import { ImageError, prepareImage, type ImageErrorCode } from "./image";

/* ----- storefront ----- */

export type CartLine = {
  id: string; slug: string; category_id?: string | null; name_en: string; name_ne: string | null;
  price_paisa: number; discount_price_paisa: number | null; available: number; image: string | null;
  /** products.min_purchase_qty (1 = no minimum). */
  min_qty: number;
};

export async function loadCartProducts(ids: string[]): Promise<CartLine[]> {
  if (!ids.length) return [];
  if (DEMO_ALLOWED && demoOn()) return (await import("@/catalog/demo")).cartLines(ids);
  const { data } = await supabase.from("products")
    .select("id,slug,category_id,name_en,name_ne,price_paisa,discount_price_paisa,stock_quantity,reserved_quantity,min_purchase_qty,product_images(storage_path,is_primary,sort_order)")
    .in("id", ids).eq("status", "published");
  return (data ?? []).map((p) => {
    const imgs = [...(p.product_images ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
    return { id: p.id, slug: p.slug, category_id: p.category_id, name_en: p.name_en, name_ne: p.name_ne, price_paisa: p.price_paisa,
      discount_price_paisa: p.discount_price_paisa, available: p.stock_quantity - p.reserved_quantity, image: imgs[0]?.storage_path ?? null,
      min_qty: minQty(p.min_purchase_qty) };
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
  paymentMethod: "cod" | "manual"; name: string; phone: string; confirmPhone?: string; email: string;
  address: string; landmark: string; municipality: string; district: string; locale: string;
};

export type PlaceResult =
  | { ok: true; token: string }
  /** The server already has an order for this idempotency key (a lost response or a double submit). The token is
   * stored hashed, so it cannot be returned again; the shopper is shown the order number instead. */
  | { ok: true; replayed: true; orderNumber: string }
  /** `retryable`: the request may or may not have reached the server, so the caller must keep the same idempotency key. */
  | { ok: false; code: string; retryable: boolean };

/** Codes the SQL function raises before committing anything: the order definitely does not exist. */
const DEFINITE = new Set(["INSUFFICIENT_STOCK", "COUPON_UNAVAILABLE", "VALIDATION_FAILED", "RATE_LIMIT_EXCEEDED", "NOT_FOUND", "IDEMPOTENCY_CONFLICT"]);

export async function placeOrder(i: PlaceInput): Promise<PlaceResult> {
  const phone = normalizePhone(i.phone);
  if (!phone || i.name.trim().length < 2 || i.address.trim().length < 3 || !i.items.length) return { ok: false, code: "VALIDATION_FAILED", retryable: false };
  // Optional fields are sent as null (omitting them makes PostgREST look for a different function signature).
  const { data, error } = await supabase.rpc("place_order", {
    p_idempotency_key: i.idempotencyKey, p_items: i.items, p_zone_id: i.zoneId, p_coupon: i.coupon.trim() || null,
    p_payment_method: i.paymentMethod, p_name: i.name.trim(), p_phone: phone, p_email: i.email.trim() || null,
    p_recipient: i.name.trim(), p_ship_phone: phone, p_address: i.address.trim(), p_landmark: i.landmark.trim() || null,
    p_municipality: i.municipality.trim() || null, p_district: i.district.trim() || null, p_locale: i.locale,
  });
  if (error) {
    const code = errorCode(error.message);
    // A fetch failure has no Postgres code; the order may still have been committed.
    if (!error.code && code === "UNKNOWN") return { ok: false, code: "NETWORK", retryable: true };
    return { ok: false, code, retryable: !DEFINITE.has(code) };
  }
  const res = data as { trackingToken?: string; orderNumber?: string; replayed?: boolean };
  if (res.trackingToken) return { ok: true, token: res.trackingToken };
  if (res.replayed && res.orderNumber) return { ok: true, replayed: true, orderNumber: res.orderNumber };
  return { ok: false, code: "UNKNOWN", retryable: true };
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
    min_purchase_qty: Math.max(1, Math.floor(Number(f.min_purchase_qty ?? 1))),
  };
  if (id) {
    const { error } = await supabase.from("products").update(row).eq("id", id);
    return error ? { error: error.message } : { id };
  }
  const slug = `${slugify(row.name_en)}-${Math.random().toString(36).slice(2, 6)}`;
  const { data, error } = await supabase.from("products").insert({ ...row, slug, stock_quantity: Math.max(0, Math.floor(Number(f.stock ?? 0))) }).select("id").single();
  return error ? { error: error.message } : { id: data.id };
}

/** Publish, unpublish (draft) or archive one product. RLS allows it only for staff with products.manage. */
export async function setProductStatus(id: string, status: "published" | "draft" | "archived") {
  const patch = status === "published" ? { status, published_at: new Date().toISOString() } : { status };
  const { error } = await supabase.from("products").update(patch).eq("id", id);
  return error ? error.message : null;
}

export async function addProductImage(productId: string, path: string, meta?: { width: number; height: number; blur_color: string }) {
  const { data: existing, error: e1 } = await supabase.from("product_images").select("id,is_primary,sort_order").eq("product_id", productId);
  if (e1) return e1.message;
  const next = Math.max(-1, ...(existing ?? []).map((r) => r.sort_order)) + 1;
  const { error } = await supabase.from("product_images").insert({ product_id: productId, storage_path: path, is_primary: !existing?.some((r) => r.is_primary), sort_order: next, ...meta });
  return error?.message ?? null;
}

/** Codes the editors translate as `img.<code>`. */
export type UploadCode = ImageErrorCode | "not_saved" | "storage_denied" | "storage_too_large" | "storage" | "metadata" | "network";

/** Prepare, upload, then record the image. Metadata is written only after the upload succeeds, and the stored
 * file is removed again if the metadata insert fails, so no orphan is left behind. */
export async function uploadProductImage(productId: string | undefined, file: File): Promise<{ ok: true } | { ok: false; code: UploadCode; detail?: string }> {
  if (!productId) return { ok: false, code: "not_saved" };
  let prepared;
  try { prepared = await prepareImage(file); }
  catch (e) { return { ok: false, code: e instanceof ImageError ? e.code : "decode", detail: String(e) }; }
  const path = `products/${productId}/${randomUUID()}.${prepared.ext}`;
  const up = await supabase.storage.from("product-images").upload(path, prepared.blob, { contentType: prepared.blob.type, upsert: false });
  if (up.error) {
    const st = Number((up.error as { statusCode?: string | number }).statusCode ?? (up.error as { status?: number }).status);
    const m = up.error.message ?? "";
    const code: UploadCode = st === 413 || /too large|exceeded/i.test(m) ? "storage_too_large"
      : st === 401 || st === 403 || /row-level security|unauthori[sz]ed|not allowed/i.test(m) ? "storage_denied"
      : /fetch|network/i.test(m) ? "network" : "storage";
    return { ok: false, code, detail: m };
  }
  const err = await addProductImage(productId, path, prepared.meta);
  if (err) {
    await supabase.storage.from("product-images").remove([path]); // best effort; staff have delete permission
    return { ok: false, code: "metadata", detail: err };
  }
  return { ok: true };
}

/** Swap the order of two images. */
export async function swapImageOrder(a: { id: string; sort_order: number }, b: { id: string; sort_order: number }) {
  const r1 = await supabase.from("product_images").update({ sort_order: b.sort_order }).eq("id", a.id);
  if (r1.error) return r1.error.message;
  const r2 = await supabase.from("product_images").update({ sort_order: a.sort_order }).eq("id", b.id);
  if (r2.error) { await supabase.from("product_images").update({ sort_order: a.sort_order }).eq("id", a.id); return r2.error.message; }
  return null;
}

/** One primary per product is enforced by a partial unique index, so clear the old one first. */
export async function setPrimaryImage(productId: string, imageId: string) {
  const { data: prev } = await supabase.from("product_images").select("id").eq("product_id", productId).eq("is_primary", true).maybeSingle();
  const r1 = await supabase.from("product_images").update({ is_primary: false }).eq("product_id", productId).eq("is_primary", true);
  if (r1.error) return r1.error.message;
  const r2 = await supabase.from("product_images").update({ is_primary: true }).eq("id", imageId);
  if (r2.error) {
    if (prev) await supabase.from("product_images").update({ is_primary: true }).eq("id", prev.id);
    return r2.error.message;
  }
  return null;
}

/** Delete the row first (what the storefront reads), then the file. Promotes another image if the primary was removed. */
export async function deleteProductImage(imageId: string, path: string, productId?: string) {
  const { data: row } = await supabase.from("product_images").select("is_primary").eq("id", imageId).maybeSingle();
  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  if (error) return error.message;
  await supabase.storage.from("product-images").remove([path]); // an orphaned file is harmless; a missing row is not
  if (row?.is_primary && productId) {
    const { data: next } = await supabase.from("product_images").select("id").eq("product_id", productId).order("sort_order").limit(1).maybeSingle();
    if (next) await supabase.from("product_images").update({ is_primary: true }).eq("id", next.id);
  }
  return null;
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
