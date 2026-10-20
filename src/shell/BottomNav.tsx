import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { GlassPanel, House, LayoutDashboard, Package, ShoppingBag, ShoppingCart, User, cn, type LucideIcon } from "@/ui";
import { usePendingOrders } from "@/admin/usePending";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useT } from "@/lib/i18n";

const TEXT_INPUT = /^(text|search|email|tel|url|password|number|)$/i;

/** True while a text field has focus: on Android the keyboard is up, and a floating bar would sit on top of it (SH-2). */
function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const isField = (el: EventTarget | null) => {
      const e = el as HTMLInputElement | null;
      return !!e && (e.tagName === "TEXTAREA" || e.tagName === "SELECT" || (e.tagName === "INPUT" && TEXT_INPUT.test(e.type)));
    };
    const on = (e: FocusEvent) => { if (isField(e.target)) setOpen(true); };
    const off = () => setOpen(false);
    window.addEventListener("focusin", on);
    window.addEventListener("focusout", off);
    return () => { window.removeEventListener("focusin", on); window.removeEventListener("focusout", off); };
  }, []);
  return open;
}

type Item = { to: string; label: string; icon: LucideIcon; end?: boolean; badge?: number };

/** Floating glass pill, compact screens only (hidden at >= 840 px, during checkout, and while the keyboard is open). */
export function BottomNav() {
  const { t } = useT();
  const { count } = useCart();
  const { user, isStaff } = useAuth();
  const pending = usePendingOrders().data ?? 0;
  const { pathname } = useLocation();
  const keyboard = useKeyboardOpen();
  if (pathname.startsWith("/checkout") || keyboard) return null;

  const items: Item[] = [
    { to: "/", label: t("nav.home"), icon: House, end: true },
    { to: "/shop", label: t("nav.shop"), icon: ShoppingBag },
    isStaff ? { to: "/admin", label: t("nav.admin"), icon: LayoutDashboard, badge: pending } : { to: "/cart", label: t("nav.cart"), icon: ShoppingCart, badge: count },
    isStaff ? { to: "/admin/orders", label: t("admin.orders"), icon: Package } : { to: "/track", label: t("nav.orders"), icon: Package },
    { to: user ? "/account" : "/login", label: user ? t("nav.account") : t("nav.signin"), icon: User },
  ];

  return (
    <GlassPanel as="nav" shape="pill" aria-label={t("shell.primary_nav")} className="fixed inset-x-3 z-40 md:hidden" style={{ bottom: "calc(12px + var(--safe-bottom))" }}>
      <ul className="m-0 grid h-16 list-none grid-cols-5 p-0">
        {items.map(({ to, label, icon: Icon, end, badge }) => (
          <li key={to} className="min-w-0">
            <NavLink to={to} end={end} viewTransition className="relative flex h-full flex-col items-center justify-center gap-0.5 rounded-pill text-ink no-underline">
              {({ isActive }) => (
                <>
                  <span className={cn("flex h-7 w-14 items-center justify-center rounded-pill", isActive && "bg-[var(--brand)] text-on-brand")}>
                    <Icon aria-hidden size={22} strokeWidth={isActive ? 2.25 : 1.75} />
                  </span>
                  <span className={cn("max-w-full truncate px-1 text-xs leading-tight", isActive ? "font-bold" : "font-semibold")}>{label}</span>
                  {!!badge && <span aria-hidden className="absolute right-3 top-1 flex min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-semibold text-on-accent" style={{ height: 20 }}>{badge > 99 ? "99+" : badge}</span>}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </GlassPanel>
  );
}
