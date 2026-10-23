import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { badgeText } from "@/messaging/format";
import { useUnread } from "@/messaging/hooks";
import { House, LayoutDashboard, MessageCircle, Package, ShoppingBag, ShoppingCart, User, cn, type LucideIcon } from "@/ui";
import { usePendingOrders } from "@/admin/usePending";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useT } from "@/lib/i18n";
import { signInHref } from "./Header";

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

type Item = { to: string; label: string; icon: LucideIcon; end?: boolean; badge?: number; compact?: boolean };

/** Docked bottom bar, compact screens only (hidden at >= 840 px, during checkout, and while the keyboard is open). */
export function BottomNav() {
  const { t } = useT();
  const { count } = useCart();
  const { user, isStaff } = useAuth();
  const pending = usePendingOrders().data ?? 0;
  const { pathname, search } = useLocation();
  const keyboard = useKeyboardOpen();
  const unread = useUnread().total;
  if (pathname.startsWith("/checkout") || keyboard) return null;

  const items: Item[] = [
    { to: "/", label: t("nav.home"), icon: House, end: true },
    { to: "/shop", label: t("nav.shop"), icon: ShoppingBag },
    isStaff ? { to: "/admin", label: t("nav.admin"), icon: LayoutDashboard, badge: pending } : { to: "/cart", label: t("nav.cart"), icon: ShoppingCart, badge: count },
    isStaff ? { to: "/admin/orders", label: t("admin.orders"), icon: Package } : { to: "/messages", label: t("nav.messages"), icon: MessageCircle, badge: unread, compact: true },
    { to: user ? "/account" : signInHref(pathname + search), label: user ? t("nav.account") : t("nav.signin"), icon: User },
  ];

  return (
    <nav aria-label={t("shell.primary_nav")} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface md:hidden" style={{ paddingBottom: "var(--safe-bottom)" }}>
      <ul className="m-0 grid h-16 list-none grid-cols-5 p-0">
        {items.map(({ to, label, icon: Icon, end, badge, compact }) => (
          <li key={to} className="min-w-0">
            <NavLink to={to} end={end} viewTransition aria-label={compact && badge ? t("msg.nav_unread", { n: badge }) : undefined} className="relative flex h-full flex-col items-center justify-center gap-0.5 no-underline">
              {({ isActive }) => (
                <>
                  <span className={cn("flex h-8 w-14 items-center justify-center rounded-pill transition-colors duration-[var(--duration-2)]", isActive ? "bg-brand-tint text-brand-strong" : "text-ink")}>
                    <Icon aria-hidden size={22} strokeWidth={isActive ? 2.25 : 1.75} />
                  </span>
                  <span className={cn("max-w-full truncate px-1 text-xs leading-tight", isActive ? "font-bold text-brand-strong" : "font-semibold text-muted")}>{label}</span>
                  {!!badge && <span aria-hidden key={badge} className="cart-bump absolute left-1/2 top-1 ml-2 flex min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-bold text-on-brand ring-2 ring-[var(--surface)]" style={{ height: 20 }}>{compact ? badgeText(badge) : badge > 99 ? "99+" : badge}</span>}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
