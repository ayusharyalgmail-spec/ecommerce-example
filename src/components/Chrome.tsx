import { Link, NavLink, Outlet, ScrollRestoration } from "react-router-dom";
import { useCart } from "@/lib/cart";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@/lib/useQuery";

export function useStoreName() {
  const { data } = useQuery(async () => (await supabase.from("store_settings").select("store_name").single()).data?.store_name as string | undefined, []);
  return data ?? "Store";
}

function Header() {
  const { t, locale, setLocale } = useT();
  const { count } = useCart();
  const { user, isStaff, signOut } = useAuth();
  const storeName = useStoreName();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur">
      <div className="container-page flex items-center gap-3 !py-3">
        <Link to="/" className="text-lg font-bold no-underline">{storeName}</Link>
        <nav className="ml-auto hidden items-center gap-4 text-sm lg:flex" aria-label="Main">
          <NavLink to="/">{t("nav.home")}</NavLink>
          <NavLink to="/shop">{t("nav.shop")}</NavLink>
          <NavLink to="/cart">{t("nav.cart")}{count > 0 && <span className="badge badge-info ml-1">{count}</span>}</NavLink>
          <NavLink to="/track">{t("nav.track")}</NavLink>
          {isStaff && <NavLink to="/admin">{t("nav.admin")}</NavLink>}
          {user ? (
            <>
              <NavLink to="/account">{t("nav.account")}</NavLink>
              <button className="underline" onClick={signOut}>{t("nav.signout")}</button>
            </>
          ) : <NavLink to="/login">{t("nav.signin")}</NavLink>}
        </nav>
        <button className="btn btn-secondary ml-auto !min-h-0 !py-1 text-sm lg:ml-0" aria-label="Switch language" onClick={() => setLocale(locale === "en" ? "ne" : "en")}>
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
  const items = [
    { to: "/", label: t("nav.home"), icon: "🏠", end: true },
    { to: "/shop", label: t("nav.shop"), icon: "🛍️" },
    { to: "/cart", label: t("nav.cart"), icon: "🛒", badge: count },
    { to: "/track", label: t("nav.orders"), icon: "📦" },
    { to: user ? "/account" : "/login", label: user ? t("nav.account") : t("nav.signin"), icon: "👤" },
  ];
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <ul className="m-0 grid h-[60px] list-none grid-cols-5 p-0">
        {items.map((i) => (
          <li key={i.to}>
            <NavLink to={i.to} end={i.end} className="relative flex h-full flex-col items-center justify-center text-xs no-underline"
              style={({ isActive }) => ({ color: isActive ? "var(--color-accent)" : undefined })}>
              <span aria-hidden>{i.icon}</span>
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
