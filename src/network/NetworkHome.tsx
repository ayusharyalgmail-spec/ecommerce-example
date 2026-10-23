// Network Home — the main landing page showing the local business directory,
// featured businesses, and a CTA to get your business online.
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useT, pick } from "@/lib/i18n";
import { useActiveTenants, usePlatformSettings, tenantAssetUrl } from "@/platform/queries";
import { Skeleton, SkeletonGroup } from "@/ui";
import ProjectsSection from "@/network/ProjectsSection";
import { ArrowRight, Globe, MapPin, Phone, Star, Zap } from "lucide-react";

export default function NetworkHome() {
  const { t, locale } = useT();
  const { data: settings } = usePlatformSettings();
  const { data: tenants, isLoading } = useActiveTenants();

  useEffect(() => {
    document.title = settings?.network_name
      ? `${pick(locale, settings.network_name, settings.network_name_ne)} — ${pick(locale, settings.network_tagline, settings.network_tagline_ne)}`
      : "Dumarwana — Local Businesses Online";
  }, [settings, locale]);

  return (
    <div className="min-h-screen">
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--surface)] via-[var(--bg)] to-[var(--surface-2)] pt-12 pb-20 sm:pt-20 sm:pb-28">
        {/* Ambient mesh */}
        <div className="absolute inset-0 -z-1 opacity-60" style={{
          background: `
            radial-gradient(circle at 20% 30%, var(--mesh-a) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, var(--mesh-b) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, var(--mesh-c) 0%, transparent 60%)
          `,
        }} />

        <div className="mx-auto max-w-5xl px-4 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--brand-tint)] px-4 py-1.5 text-sm font-semibold text-[var(--brand-strong)]">
            <MapPin size={14} />
            {pick(locale, settings?.network_name ?? "Dumarwana", settings?.network_name_ne)}
          </div>

          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            {pick(locale, "Your Local Businesses,", "तपाईंको स्थानीय व्यवसायहरू,")}
            <br />
            <span className="bg-gradient-to-r from-[var(--brand)] via-[var(--accent)] to-[var(--glacier)] bg-clip-text text-transparent">
              {pick(locale, "Now Online", "अब अनलाइन")}
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg text-[var(--text-muted)]">
            {pick(locale,
              settings?.network_tagline ?? "Discover local shops, services, and businesses near you. Browse their products, services, hours, and get in touch — all in one place.",
              settings?.network_tagline_ne ?? "आफ्नो नजिकका पसलहरू, सेवाहरू र व्यवसायहरू पत्ता लगाउनुहोस्।"
            )}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a href="#businesses" className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-6 py-3 font-semibold text-[var(--on-brand)] shadow-e2 transition-transform hover:scale-105 active:scale-95">
              {pick(locale, "Explore Businesses", "व्यवसायहरू हेर्नुहोस्")}
              <ArrowRight size={18} />
            </a>
            <Link to="/login" className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-6 py-3 font-semibold transition-colors hover:border-[var(--brand)]">
              {pick(locale, settings?.cta_text ?? "Get Your Business Online", settings?.cta_text_ne ?? "आफ्नो व्यवसाय अनलाइन बनाउनुहोस्")}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Value Props ── */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
        <div className="grid gap-8 sm:grid-cols-3">
          {[
            { icon: Globe, title: pick(locale, "Professional Website", "व्यावसायिक वेबसाइट"), desc: pick(locale, "Your business gets a beautiful, mobile-friendly website that customers can find online.", "तपाईंको व्यवसायले सुन्दर, मोबाइल-अनुकूल वेबसाइट पाउँछ।") },
            { icon: Phone, title: pick(locale, "Easy Contact", "सजिलो सम्पर्क"), desc: pick(locale, "Phone buttons, inquiry forms, WhatsApp links — customers reach you in one tap.", "फोन बटनहरू, सम्पर्क फारमहरू, WhatsApp लिङ्कहरू — ग्राहकहरूले एक ट्यापमा सम्पर्क गर्छन्।") },
            { icon: Zap, title: pick(locale, "Managed For You", "तपाईंको लागि व्यवस्थित"), desc: pick(locale, "We handle the technical side. You focus on your business. Update your info anytime.", "हामी प्राविधिक पक्ष सम्हाल्छौं। तपाईं आफ्नो व्यवसायमा ध्यान दिनुहोस्।") },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 transition-shadow hover:shadow-e2">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-tint)]">
                <item.icon size={24} className="text-[var(--brand-strong)]" />
              </div>
              <h3 className="mb-2 text-lg font-bold">{item.title}</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Business Directory ── */}
      <section id="businesses" className="mx-auto max-w-5xl px-4 pb-20">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">
            {pick(locale, "Local Businesses", "स्थानीय व्यवसायहरू")}
          </h2>
          <p className="mt-2 text-[var(--text-muted)]">
            {pick(locale, "Browse businesses in your area", "तपाईंको क्षेत्रका व्यवसायहरू हेर्नुहोस्")}
          </p>
        </div>

        {isLoading ? (
          <SkeletonGroup label={pick(locale, "Loading businesses", "व्यवसायहरू लोड हुँदैछ")} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </SkeletonGroup>
        ) : tenants && tenants.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tenants.map((tenant) => (
              <Link
                key={tenant.id}
                to={`/b/${tenant.slug}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] transition-all hover:shadow-e2 hover:border-[var(--brand)]"
              >
                {/* Cover */}
                <div className="relative h-36 overflow-hidden bg-gradient-to-br from-[var(--surface-2)] to-[var(--bg)]">
                  {tenant.cover_path && (
                    <img
                      src={tenantAssetUrl(tenant.cover_path)!}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  )}
                  {tenant.business_type && (
                    <span className="absolute bottom-2 right-2 rounded-full bg-[var(--glass-bg)] px-3 py-1 text-xs font-medium backdrop-blur-sm">
                      {pick(locale, tenant.business_type, tenant.business_type_ne)}
                    </span>
                  )}
                </div>

                {/* Logo + Info */}
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start gap-3">
                    {tenant.logo_path ? (
                      <img
                        src={tenantAssetUrl(tenant.logo_path)!}
                        alt={`${tenant.business_name} logo`}
                        className="h-12 w-12 shrink-0 rounded-xl border border-[var(--line)] object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-bold text-xl" style={{ backgroundColor: tenant.brand_primary || "var(--brand-tint)", color: "var(--on-brand)" }}>
                        {tenant.business_name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-base group-hover:text-[var(--brand-strong)]">
                        {pick(locale, tenant.business_name, tenant.business_name_ne)}
                      </h3>
                      {tenant.tagline && (
                        <p className="mt-0.5 truncate text-sm text-[var(--text-muted)]">
                          {pick(locale, tenant.tagline, tenant.tagline_ne)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto pt-4">
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--brand-strong)]">
                      {pick(locale, "Visit", "हेर्नुहोस्")} <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-12 text-center">
            <Star size={40} className="mx-auto mb-4 text-[var(--text-muted)] opacity-40" />
            <p className="text-lg font-semibold">{pick(locale, "Coming Soon", "चाँडै आउँदैछ")}</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {pick(locale, "Businesses in your area will appear here.", "तपाईंको क्षेत्रका व्यवसायहरू यहाँ देखिनेछन्।")}
            </p>
          </div>
        )}
      </section>

      {/* ── Projects ── */}
      <ProjectsSection />

      {/* ── CTA Section ── */}
      <section className="bg-gradient-to-r from-[var(--brand)] to-[color-mix(in_oklab,var(--brand)_80%,var(--accent))] py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-2xl font-bold text-[var(--on-brand)] sm:text-3xl">
            {pick(locale, "Ready to get your business online?", "आफ्नो व्यवसाय अनलाइन बनाउन तयार हुनुहुन्छ?")}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[var(--on-brand)] opacity-90">
            {pick(locale,
              "Get a professional website for your shop, service, or business. We handle everything — you just provide the details.",
              "आफ्नो पसल, सेवा, वा व्यवसायको लागि व्यावसायिक वेबसाइट पाउनुहोस्। हामी सबै कुरा व्यवस्थापन गर्छौं।"
            )}
          </p>
          <Link to="/login" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-[var(--ink)] shadow-lg transition-transform hover:scale-105 active:scale-95">
            {pick(locale, "Get Started", "सुरु गर्नुहोस्")} <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
