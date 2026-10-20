import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  Button, ChartColumn, ClipboardList, Ellipsis, ExternalLink, GlassPanel, History, IconButton, LayoutDashboard, Package, Palette, Settings,
  Sheet, Star, Tag, Ticket, Truck, Upload, Users, cn, type LucideIcon,
} from "@/ui";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { useStoreSettings } from "@/lib/queries";
import { AppearancePanel } from "./AppearancePanel";
import { CommandPalette } from "@/admin/CommandPalette";

type NavItem = { to: string; label: string; perm: string; icon: LucideIcon; end?: boolean };

const pillBase = "relative flex min-h-12 items-center gap-3 rounded-md px-3 font-semibold text-ink no-underline";

function useAdminNav(): NavItem[] {
  const { t } = useT();
  const { perms } = useAuth();
  // Hiding links is cosmetic only; the database re-checks every permission (ARCHITECTURE.md section 5).
  const all: NavItem[] = [
    { to: "/admin", label: t("admin.dashboard"), perm: "orders.view", icon: LayoutDashboard, end: true },
    { to: "/admin/orders", label: t("admin.orders"), perm: "orders.view", icon: ClipboardList },
    { to: "/admin/products", label: t("admin.products"), perm: "products.view", icon: Package },
    { to: "/admin/categories", label: t("admin.categories"), perm: "products.manage", icon: Tag },
    { to: "/admin/reviews", label: t("admin.reviews"), perm: "reviews.moderate", icon: Star },
    { to: "/admin/coupons", label: t("admin.coupons"), perm: "coupons.manage", icon: Ticket },
    { to: "/admin/zones", label: t("admin.zones"), perm: "delivery.manage", icon: Truck },
    { to: "/admin/reports", label: t("admin.reports"), perm: "reports.view", icon: ChartColumn },
    { to: "/admin/import", label: t("admin.csv"), perm: "csv.manage", icon: Upload },
    { to: "/admin/staff", label: t("admin.staff"), perm: "staff.manage", icon: Users },
    { to: "/admin/audit", label: t("admin.audit"), perm: "audit.view", icon: History },
    { to: "/admin/storefront", label: t("admin.storefront"), perm: "settings.manage", icon: Palette },
    { to: "/admin/settings", label: t("admin.settings"), perm: "settings.manage", icon: Settings },
  ];
  return all.filter((i) => perms.has(i.perm));
}

const readCollapsed = () => { try { return localStorage.getItem("admin.sidebar") === "collapsed"; } catch { return false; } };

function Sidebar({ items }: { items: NavItem[] }) {
  const { t } = useT();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const toggle = () => {
    setCollapsed((c) => { try { localStorage.setItem("admin.sidebar", c ? "expanded" : "collapsed"); } catch { /* storage blocked */ } return !c; });
  };
  return (
    <aside className={cn("sticky top-16 hidden h-[calc(100dvh-4rem)] shrink-0 flex-col gap-1 overflow-y-auto border-r border-line bg-surface p-2 md:flex", collapsed ? "w-[4.5rem]" : "w-60")}>
      <nav aria-label={t("shell.admin_nav")} className="flex flex-1 flex-col gap-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} title={collapsed ? label : undefined} aria-label={collapsed ? label : undefined}
            className={({ isActive }) => cn(pillBase, collapsed && "justify-center px-0", isActive && "bg-[var(--brand-tint)]")}>
            {({ isActive }) => (
              <>
                {isActive && <span aria-hidden className="absolute inset-y-2 left-0 w-1 rounded-r-sm bg-[var(--brand-strong)]" />}
                <Icon aria-hidden size={22} strokeWidth={isActive ? 2.25 : 1.75} />
                {!collapsed && <span className="truncate">{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <Button variant="ghost" size="sm" onClick={toggle} aria-expanded={!collapsed} className="justify-start">
        {collapsed ? "»" : `« ${t("shell.collapse")}`}
      </Button>
    </aside>
  );
}

/**
 * Vendor dashboard shell for ui_v2 (AD-1). Expanded: flat sidebar (collapsible) and a glass top bar.
 * Compact: glass top bar plus a floating bottom nav (Orders, Products, Reports, More); everything else lives in the More sheet.
 * Glass here is limited to the top bar, the bottom nav and overlays so dense tables stay crisp.
 */
export default function AdminShell() {
  const { t } = useT();
  const items = useAdminNav();
  const { data: store } = useStoreSettings();
  const [more, setMore] = useState(false);
  const primary = ["/admin/orders", "/admin/products", "/admin/reports"].map((to) => items.find((i) => i.to === to)).filter((i): i is NavItem => !!i);

  return (
    <div className="min-h-dvh">
      <GlassPanel as="header" shape="bar" className="sticky top-0 z-40 border-x-0 border-t-0">
        <div className="flex h-16 items-center gap-2 px-3 sm:px-6">
          <span className="mr-auto min-w-0 truncate text-lg font-bold">{store?.store_name ?? " "}<span className="ml-2 text-sm font-semibold">{t("shell.dashboard_label")}</span></span>
          <Link to="/" className="inline-flex min-h-12 items-center gap-2 rounded-md px-3 font-semibold text-ink no-underline"><ExternalLink aria-hidden size={20} strokeWidth={1.75} /><span className="hidden sm:inline">{t("shell.view_store")}</span><span className="sr-only-text sm:hidden">{t("shell.view_store")}</span></Link>
          <IconButton icon={Palette} label={t("appearance.title")} onClick={() => setMore(true)} className="md:hidden" />
        </div>
      </GlassPanel>

      <div className="flex">
        <Sidebar items={items} />
        <div id="content" tabIndex={-1} className="min-w-0 flex-1 pb-24 outline-none md:pb-0">
          <div className="mx-auto max-w-[90rem] p-4 sm:p-6 md:p-8"><Outlet /></div>
        </div>
      </div>

      <GlassPanel as="nav" shape="pill" aria-label={t("shell.primary_nav")} className="fixed inset-x-3 z-40 md:hidden" style={{ bottom: "calc(12px + var(--safe-bottom))" }}>
        <ul className="m-0 grid h-16 list-none p-0" style={{ gridTemplateColumns: `repeat(${primary.length + 1}, minmax(0, 1fr))` }}>
          {primary.map(({ to, label, icon: Icon }) => (
            <li key={to} className="min-w-0">
              <NavLink to={to} className="flex h-full flex-col items-center justify-center gap-0.5 rounded-pill text-ink no-underline">
                {({ isActive }) => (
                  <>
                    <span className={cn("flex h-7 w-14 items-center justify-center rounded-pill", isActive && "bg-[var(--brand)] text-on-brand")}><Icon aria-hidden size={22} strokeWidth={isActive ? 2.25 : 1.75} /></span>
                    <span className={cn("max-w-full truncate px-1 text-xs leading-tight", isActive ? "font-bold" : "font-semibold")}>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
          <li className="min-w-0">
            <button type="button" onClick={() => setMore(true)} aria-haspopup="dialog" className="flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-pill bg-transparent text-ink">
              <span className="flex h-7 w-14 items-center justify-center rounded-pill"><Ellipsis aria-hidden size={22} strokeWidth={1.75} /></span>
              <span className="text-xs font-semibold leading-tight">{t("admin.more")}</span>
            </button>
          </li>
        </ul>
      </GlassPanel>

      <CommandPalette commands={items.map((i) => ({ id: i.to, label: i.label, icon: i.icon, to: i.to }))} />

      <Sheet open={more} onOpenChange={setMore} title={t("admin.more")}>
        <ul className="m-0 grid list-none gap-1 p-0">
          {items.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} onClick={() => setMore(false)} className={({ isActive }) => cn(pillBase, isActive && "bg-[var(--brand-tint)]")}>
                <Icon aria-hidden size={22} strokeWidth={1.75} />{label}
              </NavLink>
            </li>
          ))}
        </ul>
        <hr className="my-4 border-0 border-t border-[var(--line)]" />
        <AppearancePanel />
      </Sheet>
    </div>
  );
}
