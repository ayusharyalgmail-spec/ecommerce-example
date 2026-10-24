// Network Layout — the chrome/shell for the main domain (directory, about, CTA).
// Clean, minimal: header with brand + language toggle, footer with credits.
import { Link, Outlet } from "react-router-dom";
import { useT, pick } from "@/lib/i18n";
import { usePlatformSettings } from "@/platform/queries";
import { Globe, MapPin } from "@/ui/icons";

export default function NetworkLayout() {
  const { locale, setLocale } = useT();
  const { data: settings } = usePlatformSettings();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)]">
      {/* Skip link */}
      <a href="#main-content" className="skip-link">Skip to content</a>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)]">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/network" className="flex items-center gap-2 font-bold text-lg">
            <MapPin size={20} className="text-[var(--brand)]" />
            <span>{pick(locale, settings?.network_name ?? "Dumarwana", settings?.network_name_ne)}</span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocale(locale === "en" ? "ne" : "en")}
              className="flex items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-1.5 text-sm font-medium transition-colors hover:border-[var(--brand)] hover:bg-[var(--brand-tint)]"
              aria-label="Switch language"
            >
              <Globe size={14} />
              {locale === "en" ? "नेपाली" : "English"}
            </button>
            <Link
              to="/login"
              className="rounded-xl bg-[var(--brand)] px-4 py-1.5 text-sm font-semibold text-[var(--on-brand)] transition-transform hover:scale-105 active:scale-95"
            >
              {pick(locale, "Sign In", "साइन इन")}
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--line)] bg-[var(--surface)] py-8">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <MapPin size={14} className="text-[var(--brand)]" />
              <span>{pick(locale, settings?.network_name ?? "Dumarwana", settings?.network_name_ne)} — {pick(locale, "Local Business Network", "स्थानीय व्यवसाय नेटवर्क")}</span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              © {new Date().getFullYear()} {pick(locale, settings?.network_name ?? "Dumarwana", settings?.network_name_ne)}. {pick(locale, "Built by Ayush.", "आयुषद्वारा निर्मित।")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
