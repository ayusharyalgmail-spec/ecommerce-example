import { Link, NavLink, Outlet, ScrollRestoration } from "react-router-dom";
import { House, MessageCircle, ShoppingBag, ShoppingCart, User } from "@/ui";
import { badgeText } from "@/messaging/format";
import { useUnread } from "@/messaging/hooks";
import { useCart } from "@/lib/cart";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useStoreSettings } from "@/lib/queries";

export function useStoreName() {
  return useStoreSettings().data?.store_name ?? "Store";
}

function Header() {
  const { t, locale, setLocale } = useT();
  const { count } = useCart();
  const { user, isStaff, signOut } = useAuth();
  const unread = useUnread().total;
  const storeName = useStoreName();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur">
      <div className="container-page flex items-center gap-3 !py-3">
        <Link to="/" className="text-lg font-bold no-underline">{storeName}</Link>
        <nav className="ml-auto hidden items-center gap-4 text-sm md:flex" aria-label="Main">
          <NavLink to="/">{t("nav.home")}</NavLink>
          <NavLink to="/shop">{t("nav.shop")}</NavLink>
          <NavLink to="/cart">{t("nav.cart")}{count > 0 && <span className="badge badge-info ml-1">{count}</span>}</NavLink>
          <NavLink to="/messages">{t("nav.messages")}{unread > 0 && <span className="badge badge-info ml-1">{badgeText(unread)}</span>}</NavLink>
          {isStaff && <NavLink to="/admin">{t("nav.admin")}</NavLink>}
          {user ? (
            <>
              <NavLink to="/account">{t("nav.account")}</NavLink>
              <button className="underline" onClick={signOut}>{t("nav.signout")}</button>
            </>
          ) : <NavLink to="/login">{t("nav.signin")}</NavLink>}
        </nav>
        <button className="btn btn-secondary ml-auto !min-h-0 !py-1 text-sm md:ml-0" aria-label="Switch language" onClick={() => setLocale(locale === "en" ? "ne" : "en")}>
          {t("common.language")}
        </button>
      </div>
    </header>
  );
}

function BottomNav() {
  const { t } = useT();
  const { count } = useCart();
  const { user } = useAuth();
  const unread = useUnread().total;
  const items = [
    { to: "/", label: t("nav.home"), icon: House, end: true },
    { to: "/shop", label: t("nav.shop"), icon: ShoppingBag },
    { to: "/cart", label: t("nav.cart"), icon: ShoppingCart, badge: count },
    { to: "/messages", label: t("nav.messages"), icon: MessageCircle, badge: unread > 0 ? badgeText(unread) : undefined },
    { to: user ? "/account" : "/login", label: user ? t("nav.account") : t("nav.signin"), icon: User },
  ];
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <ul className="m-0 grid h-[60px] list-none grid-cols-5 p-0">
        {items.map((i) => (
          <li key={i.to}>
            <NavLink to={i.to} end={i.end} className="relative flex h-full flex-col items-center justify-center text-xs no-underline"
              style={({ isActive }) => ({ color: isActive ? "var(--color-accent)" : undefined })}>
              <i.icon aria-hidden size={24} strokeWidth={1.75} />
              {i.label}
              {!!i.badge && <span className="badge badge-info absolute right-4 top-1">{i.badge}</span>}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function Layout() {
  return (
    <>
      <Header />
      <Outlet />
      <BottomNav />
      <ScrollRestoration />
    </>
  );
}
