// Business Layout — the shell for an individual business website (/b/:slug).
// Resolves tenant from URL, loads branding, wraps the business pages.
import { useEffect } from "react";
import { Link, Outlet, useParams } from "react-router-dom";
import { useT, pick } from "@/lib/i18n";
import { useTenantBySlug, tenantAssetUrl } from "@/platform/queries";
import { recordPageView } from "@/platform/api";
import { BusinessProvider } from "@/platform/TenantContext";
import { useTheme } from "@/theme/ThemeProvider";
import { Skeleton } from "@/ui";
import { Globe, MapPin, Phone } from "@/ui/icons";

export default function BusinessLayout() {
  const { slug } = useParams<{ slug: string }>();
  const { data: tenant, isLoading, error } = useTenantBySlug(slug);
  const { locale, setLocale } = useT();
  const { setBrandColor } = useTheme();

  // Apply tenant branding
  useEffect(() => {
    if (tenant?.brand_primary) setBrandColor(tenant.brand_primary);
    return () => { setBrandColor(null); };
  }, [tenant?.brand_primary, setBrandColor]);

  // Record page view
  useEffect(() => {
    if (tenant?.id) recordPageView(tenant.id, window.location.pathname);
  }, [tenant?.id]);

  // SEO
  useEffect(() => {
    if (tenant) {
      document.title = tenant.seo_title || `${tenant.business_name} — ${tenant.tagline || ""}`;
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute("content", tenant.seo_description || tenant.tagline || tenant.about || "");
    }
  }, [tenant]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg)] p-8">
        <Skeleton className="h-16 w-16 rounded-2xl" />
        <Skeleton className="mt-4 h-6 w-48 rounded-lg" />
        <Skeleton className="mt-2 h-4 w-64 rounded-lg" />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg)] p-8 text-center">
        <MapPin size={48} className="mb-4 text-[var(--text-muted)] opacity-40" />
        <h1 className="text-2xl font-bold">{pick(locale, "Business Not Found", "व्यवसाय भेटिएन")}</h1>
        <p className="mt-2 text-[var(--text-muted)]">
          {pick(locale, "This business page doesn't exist or isn't published yet.", "यो व्यवसाय पृष्ठ अवस्थित छैन वा अझै प्रकाशित भएको छैन।")}
        </p>
        <Link to="/network" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-2.5 font-semibold text-[var(--on-brand)] transition-transform hover:scale-105">
          {pick(locale, "Back to Home", "गृहपृष्ठमा फर्कनुहोस्")}
        </Link>
      </div>
    );
  }

  return (
    <BusinessProvider value={tenant}>
      <div className="flex min-h-screen flex-col bg-[var(--bg)]">
        {/* Skip link */}
        <a href="#main-content" className="skip-link">Skip to content</a>

        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)]">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
            <Link to={`/b/${tenant.slug}`} className="flex items-center gap-2.5 font-bold text-lg min-w-0">
              {tenant.logo_path ? (
                <img
                  src={tenantAssetUrl(tenant.logo_path)!}
                  alt={`${tenant.business_name} logo`}
                  className="h-8 w-8 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)] text-sm font-bold text-[var(--on-brand)]">
                  {tenant.business_name.charAt(0)}
                </div>
              )}
              <span className="truncate">{pick(locale, tenant.business_name, tenant.business_name_ne)}</span>
            </Link>

            <div className="flex items-center gap-2">
              {tenant.phone && (
                <a
                  href={`tel:${tenant.phone}`}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-1.5 text-sm font-medium transition-colors hover:border-[var(--brand)] hover:bg-[var(--brand-tint)]"
                  aria-label="Call"
                >
                  <Phone size={14} />
                  <span className="hidden sm:inline">{pick(locale, "Call", "कल")}</span>
                </a>
              )}
              <button
                onClick={() => setLocale(locale === "en" ? "ne" : "en")}
                className="flex items-center gap-1 rounded-full border border-[var(--line)] px-3 py-1.5 text-sm transition-colors hover:border-[var(--brand)]"
                aria-label="Switch language"
              >
                <Globe size={14} />
                {locale === "en" ? "ने" : "EN"}
              </button>
            </div>
          </div>
        </header>

        {/* Main */}
        <main id="main-content" className="flex-1">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-[var(--line)] bg-[var(--surface)] py-6">
          <div className="mx-auto max-w-5xl px-4 text-center">
            <p className="text-xs text-[var(--text-muted)]">
              © {new Date().getFullYear()} {pick(locale, tenant.business_name, tenant.business_name_ne)}.{" "}
              <Link to="/network" className="underline hover:text-[var(--brand-strong)]">
                {pick(locale, "Powered by Dumarwana", "दुमरवानाद्वारा सञ्चालित")}
              </Link>
            </p>
          </div>
        </footer>
      </div>
    </BusinessProvider>
  );
}
