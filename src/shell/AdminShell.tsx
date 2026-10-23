import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  Bell, ChartColumn, ChevronLeft, ChevronRight, ClipboardList, Ellipsis, ExternalLink, History, IconButton, IconLink, LayoutDashboard, LogOut, MessageCircle, Package,
  Palette, Popover, Search, Settings, Sheet, Star, Store, Tag, Ticket, Truck, Upload, Users, Wallet, cn, type LucideIcon,
} from "@/ui";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { useStoreSettings } from "@/lib/queries";
import { usePendingOrders } from "@/admin/usePending";
import { useStaffUnreadChats } from "@/admin/useStaffChats";
import { AppearancePanel } from "./AppearancePanel";
import { StoreMark } from "./Header";
import { CommandPalette } from "@/admin/CommandPalette";

type NavItem = { to: string; label: string; perm: string; icon: LucideIcon; end?: boolean; group: "sell" | "catalog" | "store" | "team" };

const GROUPS = ["sell", "catalog", "store", "team"] as const;

function useAdminNav(): NavItem[] {
  const { t } = useT();
  const { perms } = useAuth();
  // Hiding links is cosmetic only; the database re-checks every permission (ARCHITECTURE.md section 5).
  const all: NavItem[] = [
    { to: "/admin", label: t("admin.dashboard"), perm: "orders.view", icon: LayoutDashboard, end: true, group: "sell" },
    { to: "/admin/orders", label: t("admin.orders"), perm: "orders.view", icon: ClipboardList, group: "sell" },
    { to: "/admin/messages", label: t("admin.messages"), perm: "messages.reply", icon: MessageCircle, group: "sell" },
    { to: "/admin/money", label: t("admin.money"), perm: "orders.manage", icon: Wallet, group: "sell" },
    { to: "/admin/reports", label: t("admin.reports"), perm: "reports.view", icon: ChartColumn, group: "sell" },
    { to: "/admin/products", label: t("admin.products"), perm: "products.view", icon: Package, group: "catalog" },
    { to: "/admin/categories", label: t("admin.categories"), perm: "products.manage", icon: Tag, group: "catalog" },
    { to: "/admin/reviews", label: t("admin.reviews"), perm: "reviews.moderate", icon: Star, group: "catalog" },
    { to: "/admin/coupons", label: t("admin.coupons"), perm: "coupons.manage", icon: Ticket, group: "catalog" },
    { to: "/admin/zones", label: t("admin.zones"), perm: "delivery.manage", icon: Truck, group: "store" },
    { to: "/admin/storefront", label: t("admin.storefront"), perm: "settings.manage", icon: Palette, group: "store" },
    { to: "/admin/settings", label: t("admin.settings"), perm: "settings.manage", icon: Settings, group: "store" },
    { to: "/admin/staff", label: t("admin.staff"), perm: "staff.manage", icon: Users, group: "team" },
    { to: "/admin/import", label: t("admin.csv"), perm: "csv.manage", icon: Upload, group: "team" },
    { to: "/admin/audit", label: t("admin.audit"), perm: "audit.view", icon: History, group: "team" },
  ];
  return all.filter((i) => perms.has(i.perm));
}

const readCollapsed = () => { try { return localStorage.getItem("admin.sidebar") === "collapsed"; } catch { return false; } };

/** Active item: a filled charcoal capsule (shape plus fill, not colour alone). */
const item = (isActive: boolean, collapsed = false) => cn(
  "relative flex min-h-11 items-center gap-3 rounded-md px-3 text-[0.9375rem] font-semibold no-underline transition-colors duration-[var(--duration-1)]",
  collapsed && "justify-center px-0",
  isActive ? "bg-ink text-[var(--surface)] shadow-[var(--e1)]" : "text-ink hover-fine:hover:bg-surface-2",
);

function NavList({ items, collapsed = false, onPick }: { items: NavItem[]; collapsed?: boolean; onPick?: () => void }) {
  const { t } = useT();
  const pending = usePendingOrders().data ?? 0;
  const chats = useStaffUnreadChats().data ?? 0;
  return (
    <>
      {GROUPS.map((g) => {
        const list = items.filter((i) => i.group === g);
        if (!list.length) return null;
        return (
          <div key={g} className="space-y-0.5">
            {!collapsed && <p className="m-0 px-3 pb-1 pt-3 text-xs font-semibold text-muted">{t(`admin.group.${g}`)}</p>}
            {collapsed && <hr className="mx-2 my-2 border-0 border-t border-line first:hidden" />}
            {list.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} onClick={onPick} title={collapsed ? label : undefined} aria-label={collapsed ? label : undefined} className={({ isActive }) => item(isActive, collapsed)}>
                {({ isActive }) => (
                  <>
                    <Icon aria-hidden size={20} strokeWidth={isActive ? 2.2 : 1.8} className="shrink-0" />
                    {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
                    {to === "/admin/messages" && chats > 0 && (
                      <span aria-hidden className={cn("rounded-pill bg-accent px-1.5 text-xs font-bold text-on-accent tabular", collapsed && "absolute right-1 top-1")}>{chats > 9 ? "9+" : chats}</span>
                    )}
                    {to === "/admin/orders" && pending > 0 && (
                      <span aria-hidden className={cn("rounded-pill bg-accent px-1.5 text-xs font-bold text-on-accent tabular", collapsed && "absolute right-1 top-1")}>{pending}</span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        );
      })}
    </>
  );
}

function Sidebar({ items }: { items: NavItem[] }) {
  const { t } = useT();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const toggle = () => setCollapsed((c) => { try { localStorage.setItem("admin.sidebar", c ? "expanded" : "collapsed"); } catch { /* storage blocked */ } return !c; });
  return (
    <aside className={cn("sticky top-16 hidden h-[calc(100dvh-4rem)] shrink-0 flex-col border-r border-line bg-surface md:flex", collapsed ? "w-[4.75rem]" : "w-64")}>
      <nav aria-label={t("shell.admin_nav")} className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        <NavList items={items} collapsed={collapsed} />
      </nav>
      <div className="border-t border-line p-3">
        <button type="button" onClick={toggle} aria-expanded={!collapsed} aria-label={collapsed ? t("shell.expand") : t("shell.collapse")}
          className={cn("flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold text-muted transition-colors hover-fine:hover:bg-surface-2 hover-fine:hover:text-ink", collapsed && "justify-center px-0")}>
          {collapsed ? <ChevronRight aria-hidden size={18} /> : <><ChevronLeft aria-hidden size={18} />{t("shell.collapse")}</>}
        </button>
      </div>
    </aside>
  );
}

function AccountButton() {
  const { t } = useT();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const letter = user?.email?.[0]?.toUpperCase() ?? "?";
  return (
    <Popover open={open} onOpenChange={setOpen} align="end" className="w-80"
      trigger={<button type="button" aria-label={t("shell.account_menu")} className="flex size-11 items-center justify-center rounded-full bg-ink text-sm font-bold text-[var(--surface)] transition-transform active:scale-95">{letter}</button>}>
      <div className="space-y-4">
        <p className="m-0 truncate text-sm font-semibold">{user?.email}</p>
        <AppearancePanel />
        <button type="button" onClick={() => { setOpen(false); void signOut(); }} className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 font-semibold text-ink hover-fine:hover:bg-surface-2">
          <LogOut aria-hidden size={18} strokeWidth={1.8} />{t("nav.signout")}
        </button>
      </div>
    </Popover>
  );
}

/**
 * Shop dashboard shell: solid top bar (store, page search, pending orders, store link, account), a grouped sidebar on
 * expanded screens, and a docked bottom bar with a More sheet on compact screens.
 */
export default function AdminShell() {
  const { t } = useT();
  const items = useAdminNav();
  const { data: store } = useStoreSettings();
  const pending = usePendingOrders().data ?? 0;
  const [more, setMore] = useState(false);
  const primary = ["/admin", "/admin/orders", "/admin/products"].map((to) => items.find((i) => i.to === to)).filter((i): i is NavItem => !!i);

  return (
    <div className="min-h-dvh bg-page">
      <header className="sticky top-0 z-40 border-b border-line bg-surface">
        <div className="flex h-16 items-center gap-2 px-3 sm:px-5">
          <Link to="/" aria-label={t("shell.view_store")} className="mr-auto min-w-0 rounded-md no-underline md:mr-4 md:w-56">
            <StoreMark name={store?.store_name} />
          </Link>
          <button type="button" onClick={() => window.dispatchEvent(new Event("palette:open"))}
            className="hidden min-h-11 w-full max-w-md items-center gap-2 rounded-md border border-line bg-surface-2 px-3 text-left text-muted transition-colors hover-fine:hover:border-line-strong md:mr-auto md:flex">
            <Search aria-hidden size={18} /><span className="flex-1">{t("admin.palette.placeholder")}</span>
            <kbd className="rounded-xs border border-line bg-surface px-1.5 font-sans text-xs font-semibold text-muted">Ctrl K</kbd>
          </button>
          <IconButton icon={Search} label={t("admin.palette")} className="md:hidden" onClick={() => window.dispatchEvent(new Event("palette:open"))} />
          {items.some((i) => i.to === "/admin/orders") && (
            <Link to="/admin/orders?tab=pending" aria-label={t("dash.pending_link", { n: pending })}
              className="relative flex size-11 items-center justify-center rounded-full text-ink transition-colors hover-fine:hover:bg-surface-2">
              <Bell aria-hidden size={21} strokeWidth={1.8} />
              {pending > 0 && <span aria-hidden className="absolute right-1 top-1 min-w-5 rounded-pill bg-accent px-1 text-center text-xs font-bold text-on-accent ring-2 ring-[var(--surface)] tabular">{pending > 99 ? "99+" : pending}</span>}
            </Link>
          )}
          <IconLink to="/" icon={Store} label={t("shell.view_store")} className="sm:hidden" />
          <Link to="/" className="hidden min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-ink no-underline hover-fine:hover:bg-surface-2 sm:inline-flex">
            <ExternalLink aria-hidden size={18} strokeWidth={1.8} />{t("shell.view_store")}
          </Link>
          <AccountButton />
        </div>
      </header>

      <div className="flex">
        <Sidebar items={items} />
        <div id="content" tabIndex={-1} className="min-w-0 flex-1 pb-24 outline-none md:pb-0">
          <div className="page-in mx-auto max-w-[90rem] p-4 sm:p-6 lg:p-8"><Outlet /></div>
        </div>
      </div>

      <nav aria-label={t("shell.primary_nav")} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface md:hidden" style={{ paddingBottom: "var(--safe-bottom)" }}>
        <ul className="m-0 grid h-16 list-none p-0" style={{ gridTemplateColumns: `repeat(${primary.length + 1}, minmax(0, 1fr))` }}>
          {primary.map(({ to, label, icon: Icon, end }) => (
            <li key={to} className="min-w-0">
              <NavLink to={to} end={end} className="flex h-full flex-col items-center justify-center gap-0.5 no-underline">
                {({ isActive }) => (
                  <>
                    <span className={cn("flex h-8 w-14 items-center justify-center rounded-pill transition-colors", isActive ? "bg-ink text-[var(--surface)]" : "text-ink")}><Icon aria-hidden size={21} strokeWidth={isActive ? 2.2 : 1.8} /></span>
                    <span className={cn("max-w-full truncate px-1 text-xs leading-tight", isActive ? "font-bold text-ink" : "font-semibold text-muted")}>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
          <li className="min-w-0">
            <button type="button" onClick={() => setMore(true)} aria-haspopup="dialog" className="flex h-full w-full flex-col items-center justify-center gap-0.5 bg-transparent">
              <span className="flex h-8 w-14 items-center justify-center rounded-pill text-ink"><Ellipsis aria-hidden size={21} strokeWidth={1.8} /></span>
              <span className="text-xs font-semibold leading-tight text-muted">{t("admin.more")}</span>
            </button>
          </li>
        </ul>
      </nav>

      <CommandPalette commands={items.map((i) => ({ id: i.to, label: i.label, icon: i.icon, to: i.to }))} />

      <Sheet open={more} onOpenChange={setMore} title={t("admin.more")}>
        <nav aria-label={t("shell.admin_nav")} className="space-y-1"><NavList items={items} onPick={() => setMore(false)} /></nav>
        <hr className="my-4 border-0 border-t border-[var(--line)]" />
        <AppearancePanel />
      </Sheet>
    </div>
  );
}
