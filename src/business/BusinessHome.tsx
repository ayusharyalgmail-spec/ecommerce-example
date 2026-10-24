// Business Home — the main single-page business website.
// Sections: Hero → About → Services → Gallery → Hours → Contact/Inquiry form → Map
// Each section is designed to feel like a real, professional, paid business website.
import { useState, useCallback } from "react";
import { useT, pick } from "@/lib/i18n";
import { useBusiness as useTenant } from "@/platform/TenantContext";
import { useTenantServices, useTenantHours, useTenantGallery, tenantAssetUrl } from "@/platform/queries";
import { submitInquiry } from "@/platform/api";
import { Button, Field, Input, Textarea } from "@/ui";
import { toast } from "@/ui/toast";
import { Clock, ExternalLink, Mail, MapPin, MessageCircle, Phone, Send, Star, X } from "@/ui/icons";

const DAY_NAMES_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_NAMES_NE = ["आइतबार", "सोमबार", "मंगलबार", "बुधबार", "बिहिबार", "शुक्रबार", "शनिबार"];

function SocialIcon({ network }: { network: string }) {
  if (network === "facebook") {
    return (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    );
  }
  if (network === "instagram") {
    return (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </svg>
    );
  }
  if (network === "youtube") {
    return (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
        <polygon points="10 15 15 12 10 9 10 15" fill="currentColor" />
      </svg>
    );
  }
  return <ExternalLink size={16} />;
}

export default function BusinessHome() {
  const tenant = useTenant();
  const { data: services } = useTenantServices(tenant.id);
  const { data: hours } = useTenantHours(tenant.id);
  const { data: gallery } = useTenantGallery(tenant.id);

  return (
    <div>
      <HeroSection />
      {tenant.about && <AboutSection />}
      {services && services.length > 0 && <ServicesSection services={services} />}
      {gallery && gallery.length > 0 && <GallerySection gallery={gallery} />}
      {hours && hours.length > 0 && <HoursSection hours={hours} />}
      <ContactSection />
    </div>
  );
}

// ── Hero ──
function HeroSection() {
  const tenant = useTenant();
  const { locale } = useT();

  return (
    <section className="relative overflow-hidden">
      {/* Cover image or gradient */}
      <div className="relative h-56 sm:h-72 lg:h-80 bg-gradient-to-br from-[var(--surface-2)] via-[var(--bg)] to-[var(--surface)]">
        {tenant.cover_path && (
          <img
            src={tenantAssetUrl(tenant.cover_path)!}
            alt={`${tenant.business_name} cover`}
            className="h-full w-full object-cover"
          />
        )}
        {!tenant.cover_path && (
          <div className="absolute inset-0" style={{
            background: `
              radial-gradient(circle at 30% 40%, var(--mesh-a) 0%, transparent 50%),
              radial-gradient(circle at 70% 60%, var(--mesh-b) 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, var(--mesh-c) 0%, transparent 60%)
            `,
          }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-transparent to-transparent" />
      </div>

      {/* Profile info overlapping the cover */}
      <div className="mx-auto max-w-3xl px-4 -mt-16 relative z-10">
        <div className="flex items-end gap-4">
          {tenant.logo_path ? (
            <img
              src={tenantAssetUrl(tenant.logo_path)!}
              alt={`${tenant.business_name} logo`}
              className="h-24 w-24 shrink-0 rounded-2xl border-4 border-[var(--bg)] object-cover shadow-e2 sm:h-28 sm:w-28"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-4 border-[var(--bg)] bg-[var(--brand)] text-3xl font-bold text-[var(--on-brand)] shadow-e2 sm:h-28 sm:w-28">
              {tenant.business_name.charAt(0)}
            </div>
          )}
          <div className="pb-1">
            {tenant.business_type && (
              <span className="mb-1 inline-block rounded-full bg-[var(--brand-tint)] px-3 py-0.5 text-xs font-semibold text-[var(--brand-strong)]">
                {pick(locale, tenant.business_type, tenant.business_type_ne)}
              </span>
            )}
            <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">
              {pick(locale, tenant.business_name, tenant.business_name_ne)}
            </h1>
            {tenant.tagline && (
              <p className="mt-1 text-[var(--text-muted)]">
                {pick(locale, tenant.tagline, tenant.tagline_ne)}
              </p>
            )}
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          {tenant.phone && (
            <a href={`tel:${tenant.phone}`} className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-2.5 font-semibold text-[var(--on-brand)] shadow-e1 transition-transform hover:scale-105 active:scale-95">
              <Phone size={16} /> {pick(locale, "Call Now", "कल गर्नुहोस्")}
            </a>
          )}
          {tenant.whatsapp && (
            <a href={`https://wa.me/${tenant.whatsapp.replace(/[^0-9+]/g, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-5 py-2.5 font-semibold transition-colors hover:border-[#25D366] hover:bg-[#25D3660d]">
              <MessageCircle size={16} className="text-[#25D366]" /> WhatsApp
            </a>
          )}
          {tenant.email && (
            <a href={`mailto:${tenant.email}`} className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-5 py-2.5 font-semibold transition-colors hover:border-[var(--brand)]">
              <Mail size={16} /> {pick(locale, "Email", "इमेल")}
            </a>
          )}
          <a href="#contact" className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-5 py-2.5 font-semibold transition-colors hover:border-[var(--brand)]">
            <Send size={16} /> {pick(locale, "Inquire", "सोधपुछ")}
          </a>
        </div>

        {/* Social links */}
        {Object.keys(tenant.social_links || {}).length > 0 && (
          <div className="mt-4 flex gap-2">
            {Object.entries(tenant.social_links).map(([key, url]) => (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] text-[var(--text-muted)] transition-colors hover:border-[var(--brand)] hover:text-[var(--brand-strong)]"
                aria-label={key}
              >
                <SocialIcon network={key} />
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ── About ──
function AboutSection() {
  const tenant = useTenant();
  const { locale } = useT();

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h2 className="mb-4 text-xl font-bold">{pick(locale, "About", "बारेमा")}</h2>
      <div className="whitespace-pre-line text-[var(--text-muted)] leading-relaxed">
        {pick(locale, tenant.about, tenant.about_ne)}
      </div>
    </section>
  );
}

// ── Services ──
function ServicesSection({ services }: { services: { id: string; name_en: string; name_ne: string | null; description_en: string | null; description_ne: string | null; price_display: string | null; image_path: string | null }[] }) {
  const { locale } = useT();

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h2 className="mb-6 text-xl font-bold">{pick(locale, "Products & Services", "उत्पादनहरू र सेवाहरू")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {services.map((s) => (
          <div key={s.id} className="flex gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 transition-shadow hover:shadow-e1">
            {s.image_path && (
              <img src={tenantAssetUrl(s.image_path)!} alt={s.name_en} className="h-16 w-16 shrink-0 rounded-lg object-cover" loading="lazy" />
            )}
            <div className="min-w-0">
              <h3 className="font-semibold">{pick(locale, s.name_en, s.name_ne)}</h3>
              {s.description_en && <p className="mt-0.5 text-sm text-[var(--text-muted)] line-clamp-2">{pick(locale, s.description_en, s.description_ne)}</p>}
              {s.price_display && <p className="mt-1 text-sm font-medium text-[var(--brand-strong)]">{s.price_display}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Gallery ──
function GallerySection({ gallery }: { gallery: { id: string; storage_path: string; caption_en: string | null; caption_ne: string | null }[] }) {
  const { locale } = useT();
  const [lightbox, setLightbox] = useState<number | null>(null);

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h2 className="mb-6 text-xl font-bold">{pick(locale, "Gallery", "ग्यालरी")}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {gallery.map((item, i) => (
          <button
            key={item.id}
            onClick={() => setLightbox(i)}
            className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface-2)]"
          >
            <img
              src={tenantAssetUrl(item.storage_path)!}
              alt={pick(locale, item.caption_en, item.caption_ne) || "Gallery image"}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setLightbox(null); }}>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30" aria-label="Close">
            <X size={24} />
          </button>
          <img
            src={tenantAssetUrl(gallery[lightbox].storage_path)!}
            alt={pick(locale, gallery[lightbox].caption_en, gallery[lightbox].caption_ne) || "Gallery image"}
            className="max-h-[85vh] max-w-full rounded-xl object-contain"
          />
          {gallery[lightbox].caption_en && (
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1 text-sm text-white">
              {pick(locale, gallery[lightbox].caption_en, gallery[lightbox].caption_ne)}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

// ── Opening Hours ──
function HoursSection({ hours }: { hours: { day_of_week: number; open_time: string | null; close_time: string | null; is_closed: boolean }[] }) {
  const { locale } = useT();
  const today = new Date().getDay();

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h2 className="mb-6 flex items-center gap-2 text-xl font-bold">
        <Clock size={20} className="text-[var(--brand)]" />
        {pick(locale, "Opening Hours", "खुल्ने समय")}
      </h2>
      <div className="space-y-2">
        {hours.map((h) => {
          const isToday = h.day_of_week === today;
          return (
            <div
              key={h.day_of_week}
              className={`flex items-center justify-between rounded-lg px-4 py-2.5 ${
                isToday ? "bg-[var(--brand-tint)] font-semibold" : ""
              }`}
            >
              <span className="flex items-center gap-2">
                {isToday && <span className="h-2 w-2 rounded-full bg-[var(--brand)]" />}
                {locale === "ne" ? DAY_NAMES_NE[h.day_of_week] : DAY_NAMES_EN[h.day_of_week]}
              </span>
              <span className={h.is_closed ? "text-[var(--danger)]" : "text-[var(--text-muted)]"}>
                {h.is_closed
                  ? pick(locale, "Closed", "बन्द")
                  : `${h.open_time?.slice(0, 5) || "–"} — ${h.close_time?.slice(0, 5) || "–"}`}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Contact + Inquiry Form + Map ──
function ContactSection() {
  const tenant = useTenant();
  const { locale } = useT();
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.message.trim()) return;
    setSending(true);
    const err = await submitInquiry(tenant.id, form);
    setSending(false);
    if (err) {
      toast.error(pick(locale, "Failed to send inquiry", "सोधपुछ पठाउन सकिएन"));
    } else {
      setSent(true);
      setForm({ name: "", phone: "", email: "", message: "" });
      toast.success(pick(locale, "Inquiry sent!", "सोधपुछ पठाइयो!"));
    }
  }, [form, tenant.id, locale]);

  return (
    <section id="contact" className="mx-auto max-w-3xl px-4 py-12">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Contact info */}
        <div>
          <h2 className="mb-6 text-xl font-bold">{pick(locale, "Get in Touch", "सम्पर्क गर्नुहोस्")}</h2>

          <div className="space-y-4">
            {tenant.phone && (
              <a href={`tel:${tenant.phone}`} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--brand)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-tint)]">
                  <Phone size={18} className="text-[var(--brand-strong)]" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">{pick(locale, "Phone", "फोन")}</p>
                  <p className="font-semibold">{tenant.phone}</p>
                </div>
              </a>
            )}
            {tenant.email && (
              <a href={`mailto:${tenant.email}`} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--brand)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-tint)]">
                  <Mail size={18} className="text-[var(--brand-strong)]" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">{pick(locale, "Email", "इमेल")}</p>
                  <p className="font-semibold">{tenant.email}</p>
                </div>
              </a>
            )}
            {tenant.address && (
              <div className="flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-tint)]">
                  <MapPin size={18} className="text-[var(--brand-strong)]" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">{pick(locale, "Address", "ठेगाना")}</p>
                  <p className="font-semibold">{pick(locale, tenant.address, tenant.address_ne)}</p>
                  {tenant.municipality && <p className="text-sm text-[var(--text-muted)]">{tenant.municipality}{tenant.district ? `, ${tenant.district}` : ""}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Map embed */}
          {tenant.map_embed_url && (
            <div className="mt-6 overflow-hidden rounded-xl border border-[var(--line)]">
              <iframe
                src={tenant.map_embed_url}
                className="h-48 w-full border-0"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`${tenant.business_name} location`}
              />
            </div>
          )}
        </div>

        {/* Inquiry form */}
        <div>
          <h2 className="mb-6 text-xl font-bold">{pick(locale, "Send an Inquiry", "सोधपुछ पठाउनुहोस्")}</h2>

          {sent ? (
            <div className="rounded-xl border border-[var(--success)] bg-[var(--success-tint)] p-6 text-center">
              <Star size={32} className="mx-auto mb-3 text-[var(--success)]" />
              <p className="font-semibold text-[var(--success)]">{pick(locale, "Thank you for your inquiry!", "तपाईंको सोधपुछको लागि धन्यवाद!")}</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{pick(locale, "We'll get back to you soon.", "हामी तपाईंलाई चाँडै सम्पर्क गर्नेछौं।")}</p>
              <button onClick={() => setSent(false)} className="mt-4 text-sm font-medium text-[var(--brand-strong)] underline">
                {pick(locale, "Send another", "अर्को पठाउनुहोस्")}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label={pick(locale, "Your Name", "तपाईंको नाम")} required>
                {(p) => <Input {...p} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={pick(locale, "Full name", "पूरा नाम")} />}
              </Field>
              <Field label={pick(locale, "Phone", "फोन")}>
                {(p) => <Input {...p} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+977 ..." />}
              </Field>
              <Field label={pick(locale, "Email", "इमेल")}>
                {(p) => <Input {...p} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />}
              </Field>
              <Field label={pick(locale, "Message", "सन्देश")} required>
                {(p) => <Textarea {...p} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder={pick(locale, "How can we help?", "हामी कसरी मद्दत गर्न सक्छौं?")} rows={4} />}
              </Field>
              <Button type="submit" disabled={sending || !form.name.trim() || !form.message.trim()} className="w-full">
                {sending ? pick(locale, "Sending...", "पठाउँदै...") : (
                  <span className="flex items-center justify-center gap-2">
                    <Send size={16} /> {pick(locale, "Send Inquiry", "सोधपुछ पठाउनुहोस्")}
                  </span>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
