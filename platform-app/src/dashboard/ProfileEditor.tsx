// Profile Editor — edit business name, about, contact, location, etc.
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useT, pick } from "@/lib/i18n";
import { useManagedTenant } from "./useManagedTenant";
import { useTenantBySlug, tenantAssetUrl } from "@/platform/queries";
import { saveTenantProfile, saveTenantLogo, saveTenantCover } from "@/platform/api";
import { Button, Field, Input, Textarea } from "@/ui";
import { toast } from "@/ui/toast";
import { Building2, Camera, Save } from "@/ui/icons";

export default function ProfileEditor() {
  const tenant = useManagedTenant();
  const { locale } = useT();
  const { data: full } = useTenantBySlug(tenant.slug);
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState(false);

  const [syncedFull, setSyncedFull] = useState<typeof full>();
  if (full && full !== syncedFull) {
    setSyncedFull(full);
      setForm({
        business_name: full.business_name,
        business_name_ne: full.business_name_ne,
        tagline: full.tagline,
        tagline_ne: full.tagline_ne,
        about: full.about,
        about_ne: full.about_ne,
        phone: full.phone,
        whatsapp: full.whatsapp,
        email: full.email,
        website: full.website,
        address: full.address,
        address_ne: full.address_ne,
        municipality: full.municipality,
        district: full.district,
        province: full.province,
        map_embed_url: full.map_embed_url,
        business_type: full.business_type,
        business_type_ne: full.business_type_ne,
        brand_primary: full.brand_primary,
        social_links: JSON.stringify(full.social_links ?? {}),
        seo_title: full.seo_title,
        seo_description: full.seo_description,
      });
  }

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = useCallback(async () => {
    setSaving(true);
    const err = await saveTenantProfile(tenant.id, form);
    setSaving(false);
    if (err) toast.error(err);
    else {
      toast.success(pick(locale, "Profile saved!", "प्रोफाइल सेभ भयो!"));
      qc.invalidateQueries({ queryKey: ["tenant", tenant.slug] });
    }
  }, [form, tenant.id, tenant.slug, locale, qc]);

  const handleLogo = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await saveTenantLogo(tenant.id, file);
    if ("error" in result) toast.error(result.error);
    else {
      toast.success(pick(locale, "Logo uploaded!", "लोगो अपलोड भयो!"));
      qc.invalidateQueries({ queryKey: ["tenant", tenant.slug] });
    }
  }, [tenant.id, tenant.slug, locale, qc]);

  const handleCover = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await saveTenantCover(tenant.id, file);
    if ("error" in result) toast.error(result.error);
    else {
      toast.success(pick(locale, "Cover uploaded!", "कभर अपलोड भयो!"));
      qc.invalidateQueries({ queryKey: ["tenant", tenant.slug] });
    }
  }, [tenant.id, tenant.slug, locale, qc]);

  if (!full) return null;

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Building2 size={24} className="text-[var(--brand)]" />
          {pick(locale, "Business Profile", "व्यवसाय प्रोफाइल")}
        </h1>
        <Button onClick={handleSave} disabled={saving}>
          <Save size={16} className="mr-1.5" />
          {saving ? pick(locale, "Saving...", "सेभ गर्दै...") : pick(locale, "Save", "सेभ")}
        </Button>
      </div>

      {/* Logo + Cover */}
      <div className="flex gap-6 flex-wrap">
        <div>
          <p className="mb-2 text-sm font-medium">{pick(locale, "Logo", "लोगो")}</p>
          <label className="group relative block h-24 w-24 cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-[var(--line)] hover:border-[var(--brand)]">
            {full.logo_path ? (
              <img src={tenantAssetUrl(full.logo_path)!} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[var(--surface-2)]">
                <Camera size={24} className="text-[var(--text-muted)]" />
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleLogo} className="sr-only" />
          </label>
        </div>
        <div className="flex-1 min-w-[200px]">
          <p className="mb-2 text-sm font-medium">{pick(locale, "Cover Image", "कभर छवि")}</p>
          <label className="group relative block h-24 w-full cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-[var(--line)] hover:border-[var(--brand)]">
            {full.cover_path ? (
              <img src={tenantAssetUrl(full.cover_path)!} alt="Cover" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[var(--surface-2)]">
                <Camera size={24} className="text-[var(--text-muted)]" />
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleCover} className="sr-only" />
          </label>
        </div>
      </div>

      {/* Basic Info */}
      <fieldset className="space-y-4">
        <legend className="mb-2 text-sm font-bold text-[var(--text-muted)] uppercase tracking-wide">{pick(locale, "Basic Info", "आधारभूत जानकारी")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={pick(locale, "Business Name (English)", "व्यवसायको नाम (अंग्रेजी)")} required>
            {(p) => <Input {...p} value={form.business_name ?? ""} onChange={(e) => set("business_name", e.target.value)} />}
          </Field>
          <Field label={pick(locale, "Business Name (नेपाली)", "व्यवसायको नाम (नेपाली)")}>
            {(p) => <Input {...p} value={form.business_name_ne ?? ""} onChange={(e) => set("business_name_ne", e.target.value)} />}
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={pick(locale, "Business Type", "व्यवसायको प्रकार")}>
            {(p) => <Input {...p} value={form.business_type ?? ""} onChange={(e) => set("business_type", e.target.value)} placeholder="Shop, Restaurant, Service..." />}
          </Field>
          <Field label={pick(locale, "Tagline", "ट्यागलाइन")}>
            {(p) => <Input {...p} value={form.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} />}
          </Field>
        </div>
        <Field label={pick(locale, "About (English)", "बारेमा (अंग्रेजी)")}>
          {(p) => <Textarea {...p} value={form.about ?? ""} onChange={(e) => set("about", e.target.value)} rows={4} />}
        </Field>
        <Field label={pick(locale, "About (नेपाली)", "बारेमा (नेपाली)")}>
          {(p) => <Textarea {...p} value={form.about_ne ?? ""} onChange={(e) => set("about_ne", e.target.value)} rows={4} />}
        </Field>
      </fieldset>

      {/* Contact */}
      <fieldset className="space-y-4">
        <legend className="mb-2 text-sm font-bold text-[var(--text-muted)] uppercase tracking-wide">{pick(locale, "Contact", "सम्पर्क")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={pick(locale, "Phone", "फोन")}>
            {(p) => <Input {...p} type="tel" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="+977 ..." />}
          </Field>
          <Field label="WhatsApp">
            {(p) => <Input {...p} type="tel" value={form.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} placeholder="+977 ..." />}
          </Field>
          <Field label={pick(locale, "Email", "इमेल")}>
            {(p) => <Input {...p} type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />}
          </Field>
          <Field label={pick(locale, "Website", "वेबसाइट")}>
            {(p) => <Input {...p} type="url" value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} />}
          </Field>
        </div>
      </fieldset>

      {/* Location */}
      <fieldset className="space-y-4">
        <legend className="mb-2 text-sm font-bold text-[var(--text-muted)] uppercase tracking-wide">{pick(locale, "Location", "स्थान")}</legend>
        <Field label={pick(locale, "Address (English)", "ठेगाना (अंग्रेजी)")}>
          {(p) => <Input {...p} value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={pick(locale, "Municipality", "नगरपालिका")}>
            {(p) => <Input {...p} value={form.municipality ?? ""} onChange={(e) => set("municipality", e.target.value)} />}
          </Field>
          <Field label={pick(locale, "District", "जिल्ला")}>
            {(p) => <Input {...p} value={form.district ?? ""} onChange={(e) => set("district", e.target.value)} />}
          </Field>
          <Field label={pick(locale, "Province", "प्रदेश")}>
            {(p) => <Input {...p} value={form.province ?? ""} onChange={(e) => set("province", e.target.value)} />}
          </Field>
        </div>
        <Field label={pick(locale, "Google Maps Embed URL", "गुगल म्यापको Embed URL")}>
          {(p) => <Input {...p} value={form.map_embed_url ?? ""} onChange={(e) => set("map_embed_url", e.target.value)} placeholder="https://www.google.com/maps/embed?..." />}
        </Field>
      </fieldset>

      {/* Save */}
      <div className="flex justify-end pt-4 border-t border-[var(--line)]">
        <Button onClick={handleSave} disabled={saving}>
          <Save size={16} className="mr-1.5" />
          {saving ? pick(locale, "Saving...", "सेभ गर्दै...") : pick(locale, "Save Profile", "प्रोफाइल सेभ")}
        </Button>
      </div>
    </div>
  );
}
