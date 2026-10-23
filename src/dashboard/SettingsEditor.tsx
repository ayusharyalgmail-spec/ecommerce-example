// Settings Editor — brand accent color, social media links, SEO meta tags, and site settings.
import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useT, pick } from "@/lib/i18n";
import { useManagedTenant } from "./useManagedTenant";
import { useTenantBySlug } from "@/platform/queries";
import { saveTenantProfile } from "@/platform/api";
import { Button, Field, Input, Textarea } from "@/ui";
import { toast } from "@/ui/toast";
import { Settings, Palette, Share2, Search, Save, Globe, Check } from "lucide-react";

const COLOR_PRESETS = [
  { name: "Gold / Amber", hex: "#E8A317" },
  { name: "Warm Orange", hex: "#F59E0B" },
  { name: "Emerald Green", hex: "#10B981" },
  { name: "Teal", hex: "#14B8A6" },
  { name: "Royal Blue", hex: "#2563EB" },
  { name: "Indigo", hex: "#6366F1" },
  { name: "Rose Crimson", hex: "#E11D48" },
  { name: "Charcoal", hex: "#374151" },
];

export default function SettingsEditor() {
  const tenant = useManagedTenant();
  const { locale } = useT();
  const qc = useQueryClient();
  const { data: full } = useTenantBySlug(tenant.slug);

  const [brandPrimary, setBrandPrimary] = useState("#E8A317");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  // Social Links
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [youtube, setYoutube] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (full) {
      setBrandPrimary(full.brand_primary || "#E8A317");
      setSeoTitle(full.seo_title || "");
      setSeoDescription(full.seo_description || "");

      const socials = full.social_links as Record<string, string> | null;
      if (socials) {
        setFacebook(socials.facebook || "");
        setInstagram(socials.instagram || "");
        setWhatsapp(socials.whatsapp || "");
        setTiktok(socials.tiktok || "");
        setYoutube(socials.youtube || "");
      }
    }
  }, [full]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const social_links = JSON.stringify({
      facebook: facebook.trim() || undefined,
      instagram: instagram.trim() || undefined,
      whatsapp: whatsapp.trim() || undefined,
      tiktok: tiktok.trim() || undefined,
      youtube: youtube.trim() || undefined,
    });

    const err = await saveTenantProfile(tenant.id, {
      business_name: full?.business_name ?? tenant.business_name,
      brand_primary: brandPrimary,
      seo_title: seoTitle,
      seo_description: seoDescription,
      social_links,
    });
    setSaving(false);

    if (err) {
      toast.error(err);
    } else {
      toast.success(pick(locale, "Settings saved!", "सेटिङ सुरक्षित गरियो!"));
      qc.invalidateQueries({ queryKey: ["tenant", tenant.slug] });
    }
  }, [brandPrimary, seoTitle, seoDescription, facebook, instagram, whatsapp, tiktok, youtube, tenant.id, tenant.slug, tenant.business_name, full?.business_name, locale, qc]);

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <Settings className="text-[var(--brand)]" size={26} />
            {pick(locale, "Website Settings", "वेबसाइट सेटिङ")}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {pick(
              locale,
              "Customize your brand theme, social media links, and search engine optimization.",
              "आफ्नो ब्रान्डको रङ, सामाजिक सञ्जालका लिङ्कहरू र सर्च इन्जिन सेटिङ अनुकूलित गर्नुहोस्।"
            )}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2 self-start sm:self-auto">
          <Save size={18} />
          {saving ? pick(locale, "Saving...", "बचत गर्दै...") : pick(locale, "Save Settings", "सेटिङ सेभ गर्नुहोस्")}
        </Button>
      </div>

      {/* ── Brand Color Styling ── */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Palette className="text-[var(--brand)]" size={20} />
          {pick(locale, "Brand Identity & Accent Color", "ब्रान्ड रङ तथा पहिचान")}
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {pick(
            locale,
            "Choose a primary color that will highlight buttons, badges, and accents on your site.",
            "तपाईंको वेबसाइटका बटन तथा मुख्य भागहरूमा प्रयोग हुने मुख्य रङ रोज्नुहोस्।"
          )}
        </p>

        {/* Color Presets */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {COLOR_PRESETS.map((preset) => {
            const isSelected = brandPrimary.toLowerCase() === preset.hex.toLowerCase();
            return (
              <button
                key={preset.hex}
                type="button"
                onClick={() => setBrandPrimary(preset.hex)}
                className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all ${
                  isSelected
                    ? "border-[var(--brand)] bg-[var(--brand-tint)] shadow-sm ring-1 ring-[var(--brand)]"
                    : "border-[var(--line)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-lg shadow-inner flex-shrink-0"
                  style={{ backgroundColor: preset.hex }}
                >
                  {isSelected && <Check size={14} className="text-white drop-shadow" />}
                </span>
                <span className="text-xs font-semibold text-[var(--ink)] truncate">{preset.name}</span>
              </button>
            );
          })}
        </div>

        {/* Custom hex input */}
        <div className="mt-4 flex items-center gap-3">
          <input
            type="color"
            value={brandPrimary}
            onChange={(e) => setBrandPrimary(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded-lg border border-[var(--line)] bg-transparent p-0.5"
          />
          <Input
            value={brandPrimary}
            onChange={(e) => setBrandPrimary(e.target.value)}
            placeholder="#E8A317"
            className="w-36 font-mono text-xs uppercase"
          />
          <span className="text-xs text-[var(--text-muted)]">
            {pick(locale, "Custom Hex Code", "कस्टम हेक्स कोड")}
          </span>
        </div>
      </div>

      {/* ── Social Media Links ── */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Share2 className="text-[var(--brand)]" size={20} />
          {pick(locale, "Social Media Links", "सामाजिक सञ्जालहरू")}
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {pick(
            locale,
            "Links to your active social pages will show up prominently in your site header and footer.",
            "यी लिङ्कहरू तपाईंको वेबसाइटको हेडर र फुटरमा देखिनेछन्।"
          )}
        </p>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Facebook Page URL">
            {(p) => (
              <Input
                {...p}
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="https://facebook.com/your-business"
              />
            )}
          </Field>
          <Field label="Instagram Profile URL">
            {(p) => (
              <Input
                {...p}
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="https://instagram.com/your-business"
              />
            )}
          </Field>
          <Field label="WhatsApp Direct Link or Phone">
            {(p) => (
              <Input
                {...p}
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+977 9800000000 or https://wa.me/..."
              />
            )}
          </Field>
          <Field label="TikTok Profile">
            {(p) => (
              <Input
                {...p}
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                placeholder="https://tiktok.com/@your-business"
              />
            )}
          </Field>
          <Field label="YouTube Channel">
            {(p) => (
              <Input
                {...p}
                value={youtube}
                onChange={(e) => setYoutube(e.target.value)}
                placeholder="https://youtube.com/@your-channel"
              />
            )}
          </Field>
        </div>
      </div>

      {/* ── SEO Settings ── */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Search className="text-[var(--brand)]" size={20} />
          {pick(locale, "Search Engine Optimization (SEO)", "सर्च इन्जिन अप्टिमाइजेसन (SEO)")}
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {pick(
            locale,
            "Control how your website appears on Google searches and Facebook/WhatsApp share cards.",
            "गुगल र सामाजिक सञ्जालमा सेयर गर्दा देखिने शीर्षक र विवरण तय गर्नुहोस्।"
          )}
        </p>

        <div className="mt-5 space-y-4">
          <Field label={pick(locale, "SEO Meta Title", "SEO शीर्षक")}>
            {(p) => (
              <Input
                {...p}
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="e.g. Royal Bakery & Cafe — Best Cakes in Dumarwana"
              />
            )}
          </Field>
          <Field label={pick(locale, "SEO Meta Description", "SEO विवरण")}>
            {(p) => (
              <Textarea
                {...p}
                rows={3}
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="A brief 1-2 sentence description explaining what your business does and where you are located."
              />
            )}
          </Field>
        </div>
      </div>

      {/* ── Address & Domain Info ── */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Globe className="text-[var(--brand)]" size={20} />
          {pick(locale, "Live Website URL", "वेबसाइट लिङ्क")}
        </h2>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 rounded-xl bg-[var(--surface-2)] px-4 py-2.5 font-mono text-sm text-[var(--ink)]">
            {typeof window !== "undefined" ? `${window.location.origin}/b/${tenant.slug}` : `/b/${tenant.slug}`}
          </div>
          <a
            href={`/b/${tenant.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-[var(--line)] px-4 py-2.5 text-xs font-semibold hover:border-[var(--brand)] hover:text-[var(--brand-strong)]"
          >
            {pick(locale, "Open Site", "साइट खोल्नुहोस्")}
          </a>
        </div>
      </div>
    </div>
  );
}
