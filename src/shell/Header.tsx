import { useState, useSyncExternalStore } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Button, IconLink, LayoutDashboard, Search, ShoppingBasket, ShoppingCart, User, cn } from "@/ui";
import { useAuth } from "@/lib/auth";
import { usePendingOrders } from "@/admin/usePending";
import { useCart } from "@/lib/cart";
import { useT } from "@/lib/i18n";
import { useStoreSettings } from "@/lib/queries";
import { useHideOnScroll } from "./useHideOnScroll";
import { UnreadPill } from "@/messaging/NavBadge";
import { useUnread } from "@/messaging/hooks";

// Desktop-only menus (popover content, appearance panel) are a separate chunk: phones never download them.
const CategoriesMenu = lazy(() => import("./HeaderMenus").then((m) => ({ default: m.CategoriesMenu })));
const AccountMenu = lazy(() => import("./HeaderMenus").then((m) => ({ default: m.AccountMenu })));
// The inline search field only exists from 1200 px; smaller screens use the search icon, so phones never load it here.
const SearchBox = lazy(() => import("@/catalog/SearchBox").then((m) => ({ default: m.SearchBox })));

const WIDE = "(min-width: 1200px)";
const useWide = () => useSyncExternalStore(
  (cb) => { const m = window.matchMedia(WIDE); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
  () => window.matchMedia(WIDE).matches, () => false);

/** Sign-in link that brings the shopper back to where they were (the login page only accepts same-site paths). */
export const signInHref = (from: string) => (from && from !== "/" && !from.startsWith("/login") ? `/login?next=${encodeURIComponent(from)}` : "/login");

const navLink = ({ isActive }: { isActive: boolean }) =>
  cn(
    "relative inline-flex min-h-12 items-center rounded-md px-3 font-semibold no-underline transition-colors duration-[var(--duration-1)]",
    isActive ? "text-brand-strong after:absolute after:inset-x-3 after:bottom-2 after:h-0.5 after:rounded-pill after:bg-brand-strong" : "text-ink hover-fine:hover:bg-surface-2",
  );

/** Desktop Messages link with the live unread pill. Order tracking stays reachable from messages, the account page and /track. */
function MessagesLink() {
  const { t } = useT();
  const { total } = useUnread();
  return (
    <NavLink to="/messages" viewTransition aria-label={total > 0 ? t("msg.nav_unread", { n: total }) : undefined} className={(s) => cn(navLink(s), "gap-2")}>
      {t("nav.messages")}<UnreadPill />
    </NavLink>
  );
}

function LanguageButton() {
  const { t, locale, setLocale } = useT();
  const next = locale === "en" ? "ne" : "en";
  return (
    <Button variant="ghost" size="sm" lang={next} aria-label={t("shell.switch_language")} onClick={() => { void setLocale(next); }}>
      {t("common.language")}
    </Button>
  );
}

/** Store identity: a small basket mark in the brand colour next to the store name. */
export function StoreMark({ name, className }: { name?: string; className?: string }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
      <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand text-on-brand">
        <ShoppingBasket size={20} strokeWidth={2} />
      </span>
      <span className="truncate text-lg font-bold leading-tight text-ink">{name}</span>
    </span>
  );
}

/** One cart link for every width: an icon with a count badge on phones, a labelled brand button from 840 px. */
function CartLink({ count }: { count: number }) {
  const { t } = useT();
  return (
    <Link to="/cart" viewTransition aria-label={`${t("nav.cart")}${count ? ` (${count})` : ""}`}
      className="relative inline-flex size-12 items-center justify-center gap-2 rounded-full text-ink no-underline transition-colors duration-[var(--duration-1)] hover-fine:hover:bg-surface-2 md:w-auto md:rounded-md md:bg-brand md:px-4 md:font-semibold md:text-on-brand md:hover-fine:hover:bg-[var(--brand-hover)]">
      <ShoppingCart aria-hidden size={22} strokeWidth={1.9} />
      <span className="hidden md:inline">{t("nav.cart")}</span>
      <span aria-hidden key={count}
        className={cn("cart-bump min-w-5 rounded-pill px-1.5 text-center text-xs font-bold tabular md:static md:min-w-6 md:bg-[var(--on-brand)] md:text-sm md:text-brand md:ring-0",
          "absolute -right-0.5 -top-0.5 bg-brand text-on-brand ring-2 ring-[var(--surface)]", !count && "hidden md:inline")}>{count}</span>
    </Link>
  );
}

/**
 * Solid top bar. Compact (< 840 px): store mark, search shortcut, language, cart; slides away while scrolling down.
 * Expanded: store mark, categories, links, product search, language, account, labelled cart; never hides.
 */
export function Header() {
  const { t } = useT();
  const { pathname, search } = useLocation();
  const { count } = useCart();
  const { isStaff, user, loading } = useAuth();
  const pending = usePendingOrders().data ?? 0;
  const { data: store } = useStoreSettings();
  const scrolledDown = useHideOnScroll();
  const [focusWithin, setFocusWithin] = useState(false);
  const hidden = scrolledDown && !focusWithin;
  // The shop page has its own search field; a second one in the header would compete with it.
  const showSearch = pathname !== "/shop";
  const wide = useWide();

  return (
    <header
      onFocusCapture={() => setFocusWithin(true)} onBlurCapture={() => setFocusWithin(false)}
      className={cn("sticky top-0 z-40 border-b border-line bg-surface transition-transform duration-[var(--duration-2)] ease-[var(--ease-out)] md:translate-y-0", hidden && "-translate-y-full")}
    >
      <div className="mx-auto flex h-16 max-w-[80rem] items-center gap-1 px-3 sm:px-6 md:gap-2 md:px-8">
        <Link to="/" viewTransition className="mr-auto min-w-0 rounded-md no-underline md:mr-3" aria-label={store?.store_name ? `${store.store_name}, ${t("nav.home")}` : t("nav.home")}>
          <StoreMark name={store?.store_name ?? " "} />
        </Link>

        <nav aria-label={t("shell.main_nav")} className="hidden items-center gap-0.5 md:flex">
          <Suspense fallback={<span className="inline-block h-12 w-28" />}><CategoriesMenu /></Suspense>
          {/* the store mark already links home; the extra link appears once there is room */}
          <span className="hidden lg:contents"><NavLink to="/" end viewTransition className={navLink}>{t("nav.home")}</NavLink></span>
          <NavLink to="/shop" viewTransition className={navLink}>{t("nav.shop")}</NavLink>
          <MessagesLink />
        </nav>

        {wide && <div className="ml-auto w-full max-w-sm">{showSearch && <Suspense fallback={<span className="block h-12 rounded-md bg-surface-2" />}><SearchBox compact /></Suspense>}</div>}
        {showSearch && !wide && <IconLink to="/shop?focus=search" icon={Search} label={t("shop.search")} className={pathname === "/" ? "md:ml-auto" : "ml-0 md:ml-auto"} />}

        <LanguageButton />
        {isStaff && <IconLink to="/admin" icon={LayoutDashboard} label={t("nav.admin")} badge={pending} />}
        {user ? (
          <span className="hidden size-12 md:block"><Suspense fallback={null}><AccountMenu /></Suspense></span>
        ) : !loading && pathname !== "/login" ? (
          <Link to={signInHref(pathname + search)} className="hidden min-h-11 items-center gap-2 rounded-md border border-line-strong px-3.5 font-semibold text-ink no-underline transition-colors hover-fine:hover:bg-surface-2 md:inline-flex">
            <User aria-hidden size={18} strokeWidth={2} />{t("nav.signin")}
          </Link>
        ) : null}
        {!isStaff && <CartLink count={count} />}
      </div>
    </header>
  );
}
