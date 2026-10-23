import { useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, Mail, MessageCircle, Moon, Phone, Sun, Monitor, cn } from "@/ui";
import { useT, pick } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useCategories, useStoreSettings } from "@/lib/queries";
import { useTheme, type ThemeMode } from "@/theme/ThemeProvider";
import { StoreMark } from "./Header";

const link = "inline-flex min-h-11 items-center gap-2 text-ink no-underline hover-fine:hover:text-brand-strong hover-fine:hover:underline";
const heading = "m-0 mb-2 text-sm font-bold text-muted";

/** Three-way theme switch with icons; the full Appearance panel (effects tier) stays in the account menu. */
function ThemeSwitch() {
  const { t } = useT();
  const { mode, setMode } = useTheme();
  const opts: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
    { value: "light", label: t("appearance.light"), icon: Sun },
    { value: "dark", label: t("appearance.dark"), icon: Moon },
    { value: "system", label: t("appearance.system"), icon: Monitor },
  ];
  return (
    <div role="radiogroup" aria-label={t("appearance.theme")} className="inline-flex rounded-md border border-line bg-surface p-1">
      {opts.map(({ value, label, icon: Icon }) => (
        <button key={value} type="button" role="radio" aria-checked={mode === value} onClick={() => setMode(value)}
          className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-sm px-3 text-sm font-semibold transition-colors duration-[var(--duration-1)]",
            mode === value ? "bg-brand-tint text-brand-strong" : "text-ink hover-fine:hover:bg-surface-2")}>
          <Icon aria-hidden size={16} strokeWidth={2} />{label}
        </button>
      ))}
    </div>
  );
}

/** Flat footer: store identity and contacts, shop links, help links, theme and language. */
export function Footer() {
  const { t, locale, setLocale } = useT();
  const { user } = useAuth();
  const { data: s } = useStoreSettings();
  const cats = useCategories().data ?? [];
  const [policy, setPolicy] = useState(false);
  const wa = s?.whatsapp_number?.replace(/\D/g, "");
  const returns = locale === "ne" ? s?.policies?.returns_ne || s?.policies?.returns_en : s?.policies?.returns_en;
  const hasContact = !!(wa || s?.contact_phone || s?.contact_email);

  return (
    <footer className="mt-16 border-t border-line bg-surface text-ink">
      <div className="mx-auto grid max-w-[80rem] grid-cols-2 gap-x-6 gap-y-8 px-4 py-10 sm:px-6 md:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <section aria-label={s?.store_name ?? t("footer.about")} className="col-span-2 space-y-3 lg:col-span-1">
          <StoreMark name={s?.store_name} />
          <p className="m-0 max-w-xs text-muted">{t("footer.tagline")}</p>
          {hasContact && (
            <ul className="m-0 list-none p-0">
              {wa && <li><a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className={link}><MessageCircle aria-hidden size={18} strokeWidth={1.75} />{t("footer.whatsapp")}</a></li>}
              {s?.contact_phone && <li><a href={`tel:${s.contact_phone}`} className={link}><Phone aria-hidden size={18} strokeWidth={1.75} />{s.contact_phone}</a></li>}
              {s?.contact_email && <li><a href={`mailto:${s.contact_email}`} className={link}><Mail aria-hidden size={18} strokeWidth={1.75} />{s.contact_email}</a></li>}
            </ul>
          )}
        </section>

        <nav aria-labelledby="f-shop">
          <h2 id="f-shop" className={heading}>{t("footer.shop")}</h2>
          <ul className="m-0 list-none p-0">
            <li><Link to="/shop" className={link}>{t("footer.all_products")}</Link></li>
            {cats.slice(0, 5).map((c) => <li key={c.id}><Link to={`/shop?category=${c.slug}`} className={link}>{pick(locale, c.name_en, c.name_ne)}</Link></li>)}
          </ul>
        </nav>

        <nav aria-labelledby="f-help">
          <h2 id="f-help" className={heading}>{t("footer.help")}</h2>
          <ul className="m-0 list-none p-0">
            <li><Link to="/track" className={link}>{t("footer.delivery")}</Link></li>
            <li><Link to={user ? "/account" : "/login"} className={link}>{user ? t("nav.account") : t("nav.signin")}</Link></li>
            {user && <li><Link to="/account/wishlist" className={link}>{t("wish.title")}</Link></li>}
            {returns && <li><button type="button" onClick={() => setPolicy(true)} className={cn(link, "bg-transparent p-0 font-[inherit]")}>{t("footer.returns")}</button></li>}
          </ul>
        </nav>

        <section aria-labelledby="f-look" className="col-span-2 space-y-3 lg:col-span-1">
          <h2 id="f-look" className={heading}>{t("appearance.title")}</h2>
          <ThemeSwitch />
          <div>
            <button type="button" lang={locale === "en" ? "ne" : "en"} onClick={() => { void setLocale(locale === "en" ? "ne" : "en"); }} className={cn(link, "bg-transparent p-0 font-semibold")}>
              {locale === "en" ? "नेपालीमा हेर्नुहोस्" : "View in English"}
            </button>
          </div>
        </section>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto m-0 max-w-[80rem] px-4 py-5 text-sm text-muted sm:px-6 md:px-8">© {new Date().getFullYear()} {s?.store_name}</p>
      </div>

      <Dialog open={policy} onOpenChange={setPolicy} title={t("footer.returns")} closeLabel={t("common.close")}>
        <p className="m-0 whitespace-pre-line">{returns}</p>
      </Dialog>
    </footer>
  );
}
