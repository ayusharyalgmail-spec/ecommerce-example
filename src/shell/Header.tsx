import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Button, GlassPanel, IconLink, Input, Search, ShoppingCart, cn } from "@/ui";
import { useCart } from "@/lib/cart";
import { useT } from "@/lib/i18n";
import { useStoreSettings } from "@/lib/queries";
import { useHideOnScroll } from "./useHideOnScroll";

// Desktop-only menus (popover content, appearance panel) are a separate chunk: phones never download them.
const CategoriesMenu = lazy(() => import("./HeaderMenus").then((m) => ({ default: m.CategoriesMenu })));
const AccountMenu = lazy(() => import("./HeaderMenus").then((m) => ({ default: m.AccountMenu })));

const navLink = ({ isActive }: { isActive: boolean }) =>
  cn("inline-flex min-h-12 items-center rounded-md px-3 font-semibold text-ink no-underline", isActive && "bg-[var(--brand-tint)]");

function LanguageButton() {
  const { t, locale, setLocale } = useT();
  const next = locale === "en" ? "ne" : "en";
  return (
    <Button variant="ghost" size="sm" lang={next} aria-label={t("shell.switch_language")} onClick={() => { void setLocale(next); }}>
      {t("common.language")}
    </Button>
  );
}

/**
 * Glass top bar (SH-1, SH-3). Compact: logo, search, language, cart; slides away while scrolling down.
 * Expanded (>= 840 px): category menu, links, search, language, cart, account menu; never hides.
 */
export function Header() {
  const { t } = useT();
  const nav = useNavigate();
  const { count } = useCart();
  const { data: store } = useStoreSettings();
  const scrolledDown = useHideOnScroll();
  const [focusWithin, setFocusWithin] = useState(false);
  const [q, setQ] = useState("");
  const hidden = scrolledDown && !focusWithin;

  return (
    <GlassPanel
      as="header" shape="bar"
      onFocusCapture={() => setFocusWithin(true)} onBlurCapture={() => setFocusWithin(false)}
      className={cn("sticky top-0 z-40 border-x-0 border-t-0 transition-transform duration-[var(--duration-2)] ease-[var(--ease-out)]", hidden && "-translate-y-full")}
    >
      <div className="mx-auto flex h-16 max-w-[75rem] items-center gap-1 px-3 sm:px-6 md:gap-2 md:px-8">
        <Link to="/" viewTransition className="mr-auto min-w-0 truncate rounded-md px-1 text-lg font-bold text-ink no-underline md:mr-2">{store?.store_name ?? " "}</Link>

        <nav aria-label={t("shell.main_nav")} className="mr-auto hidden items-center gap-1 md:flex">
          <Suspense fallback={<span className="inline-block h-12 w-28" />}><CategoriesMenu /></Suspense>
          <NavLink to="/" end viewTransition className={navLink}>{t("nav.home")}</NavLink>
          <NavLink to="/shop" viewTransition className={navLink}>{t("nav.shop")}</NavLink>
          <NavLink to="/track" viewTransition className={navLink}>{t("nav.track")}</NavLink>
        </nav>

        <form role="search" className="hidden w-64 lg:block" onSubmit={(e) => { e.preventDefault(); nav(`/shop?q=${encodeURIComponent(q)}`, { viewTransition: true }); }}>
          <Input id="site-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("shop.search")} aria-label={t("shop.search")} enterKeyHint="search" />
        </form>
        <IconLink to="/shop?focus=search" icon={Search} label={t("shop.search")} className="lg:hidden" />

        <LanguageButton />
        <IconLink to="/cart" icon={ShoppingCart} label={`${t("nav.cart")}${count ? ` (${count})` : ""}`} badge={count} viewTransition />
        <span className="hidden size-12 md:block"><Suspense fallback={null}><AccountMenu /></Suspense></span>
      </div>
    </GlassPanel>
  );
}
