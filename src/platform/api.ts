import { supabase } from "@/lib/supabase";

// ---- Fetch tenant by slug (public anon read) ----
export async function getTenantBySlug(slug: string) {
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data;
}

// ---- Record page view (fire and forget, no await needed) ----
export function recordPageView(tenantId: string, page: string) {
  supabase.from("tenant_analytics").insert({
    tenant_id: tenantId,
    page,
    referrer: document.referrer || null,
  }).then(() => {}); // fire and forget
}

// ---- Submit inquiry (public) ----
export async function submitInquiry(tenantId: string, data: { name: string; phone: string; email: string; message: string }): Promise<string | null> {
  if (!data.name.trim() || !data.message.trim()) return "VALIDATION_FAILED";
  const { error } = await supabase.from("tenant_inquiries").insert({
    tenant_id: tenantId,
    name: data.name.trim(),
    phone: data.phone.trim() || null,
    email: data.email.trim() || null,
    message: data.message.trim(),
  });
  return error?.message ?? null;
}

// ---- Mark inquiry as read (staff) ----
export async function markInquiryRead(inquiryId: string): Promise<string | null> {
  const { error } = await supabase.from("tenant_inquiries").update({ is_read: true }).eq("id", inquiryId);
  return error?.message ?? null;
}

// ---- Save tenant profile (owner/editor) ----
export async function saveTenantProfile(tenantId: string, data: Record<string, string | null>): Promise<string | null> {
  const s = (k: string) => (data[k] ?? "").trim() || null;
  const { error } = await supabase.from("tenants").update({
    business_name: s("business_name") ?? "Business",
    business_name_ne: s("business_name_ne"),
    tagline: s("tagline"),
    tagline_ne: s("tagline_ne"),
    about: s("about"),
    about_ne: s("about_ne"),
    phone: s("phone"),
    whatsapp: s("whatsapp"),
    email: s("email"),
    website: s("website"),
    address: s("address"),
    address_ne: s("address_ne"),
    municipality: s("municipality"),
    district: s("district"),
    province: s("province"),
    map_embed_url: s("map_embed_url"),
    business_type: s("business_type"),
    business_type_ne: s("business_type_ne"),
    brand_primary: s("brand_primary") || "#F5A524",
    social_links: (() => {
      try { return JSON.parse(data.social_links ?? "{}"); } catch { return {}; }
    })(),
    seo_title: s("seo_title"),
    seo_description: s("seo_description"),
  }).eq("id", tenantId);
  return error?.message ?? null;
}

// ---- Save tenant logo ----
export async function saveTenantLogo(tenantId: string, file: File): Promise<{ path: string } | { error: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `tenants/${tenantId}/logo.${ext}`;
  const { error: uploadErr } = await supabase.storage.from("tenant-assets").upload(path, file, { contentType: file.type, upsert: true });
  if (uploadErr) return { error: uploadErr.message };
  const { error: updateErr } = await supabase.from("tenants").update({ logo_path: path }).eq("id", tenantId);
  if (updateErr) return { error: updateErr.message };
  return { path };
}

// ---- Save tenant cover ----
export async function saveTenantCover(tenantId: string, file: File): Promise<{ path: string } | { error: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `tenants/${tenantId}/cover.${ext}`;
  const { error: uploadErr } = await supabase.storage.from("tenant-assets").upload(path, file, { contentType: file.type, upsert: true });
  if (uploadErr) return { error: uploadErr.message };
  const { error: updateErr } = await supabase.from("tenants").update({ cover_path: path }).eq("id", tenantId);
  if (updateErr) return { error: updateErr.message };
  return { path };
}

// ---- Save service ----
export async function saveService(
  tenantId: string,
  data: { name_en: string; name_ne?: string; description_en?: string; description_ne?: string; price_display?: string },
  serviceId?: string,
): Promise<{ id?: string; error?: string }> {
  const row = {
    tenant_id: tenantId,
    name_en: data.name_en.trim(),
    name_ne: data.name_ne?.trim() || null,
    description_en: data.description_en?.trim() || null,
    description_ne: data.description_ne?.trim() || null,
    price_display: data.price_display?.trim() || null,
  };
  if (serviceId) {
    const { error } = await supabase.from("tenant_services").update(row).eq("id", serviceId);
    return error ? { error: error.message } : { id: serviceId };
  }
  const { data: inserted, error } = await supabase.from("tenant_services").insert(row).select("id").single();
  return error ? { error: error.message } : { id: inserted.id };
}

// ---- Delete service ----
export async function deleteService(serviceId: string): Promise<string | null> {
  const { error } = await supabase.from("tenant_services").delete().eq("id", serviceId);
  return error?.message ?? null;
}

// ---- Upload service image ----
export async function uploadServiceImage(tenantId: string, serviceId: string, file: File): Promise<{ path: string } | { error: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `tenants/${tenantId}/services/${serviceId}.${ext}`;
  const { error: uploadErr } = await supabase.storage.from("tenant-assets").upload(path, file, { contentType: file.type, upsert: true });
  if (uploadErr) return { error: uploadErr.message };
  const { error: updateErr } = await supabase.from("tenant_services").update({ image_path: path }).eq("id", serviceId);
  if (updateErr) return { error: updateErr.message };
  return { path };
}

// ---- Upload gallery image ----
export async function uploadGalleryImage(tenantId: string, file: File, caption_en?: string): Promise<{ id?: string; error?: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const path = `tenants/${tenantId}/gallery/${name}`;
  const { error: uploadErr } = await supabase.storage.from("tenant-assets").upload(path, file, { contentType: file.type });
  if (uploadErr) return { error: uploadErr.message };
  const { data, error } = await supabase.from("tenant_gallery").insert({
    tenant_id: tenantId,
    storage_path: path,
    caption_en: caption_en?.trim() || null,
  }).select("id").single();
  if (error) {
    await supabase.storage.from("tenant-assets").remove([path]);
    return { error: error.message };
  }
  return { id: data.id };
}

// ---- Delete gallery image ----
export async function deleteGalleryImage(imageId: string, storagePath: string): Promise<string | null> {
  const { error } = await supabase.from("tenant_gallery").delete().eq("id", imageId);
  if (error) return error.message;
  await supabase.storage.from("tenant-assets").remove([storagePath]);
  return null;
}

// ---- Save opening hours ----
export async function saveTenantHours(tenantId: string, hours: { day_of_week: number; open_time: string | null; close_time: string | null; is_closed: boolean }[]): Promise<string | null> {
  // Delete existing and re-insert (simpler than upsert for 7 rows)
  const { error: delErr } = await supabase.from("tenant_hours").delete().eq("tenant_id", tenantId);
  if (delErr) return delErr.message;
  if (hours.length === 0) return null;
  const rows = hours.map((h) => ({
    tenant_id: tenantId,
    day_of_week: h.day_of_week,
    open_time: h.open_time || null,
    close_time: h.close_time || null,
    is_closed: h.is_closed,
  }));
  const { error } = await supabase.from("tenant_hours").insert(rows);
  return error?.message ?? null;
}
