import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Outlet, ScrollRestoration, useLocation } from "react-router-dom";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
// Below the fold or on demand: separate chunks so the shell stays inside the entry budget.
const Footer = lazy(() => import("./Footer").then((m) => ({ default: m.Footer })));
const ShortcutsDialog = lazy(() => import("./ShortcutsDialog").then((m) => ({ default: m.ShortcutsDialog })));
const OrderAlerts = lazy(() => import("@/admin/OrderAlerts"));
import { useShortcuts } from "./useShortcuts";
import { demoOn } from "@/catalog/demoMode";

/** Development only: makes it impossible to mistake the demo fixture for real inventory. */
function DemoStrip() {
  const { t } = useT();
  return (
    <div role="note" className="border-b border-[var(--warning)] bg-[var(--warning-tint)] text-sm text-ink">
      <p className="mx-auto m-0 flex max-w-[80rem] flex-wrap items-center gap-x-3 px-4 py-1.5 sm:px-6 md:px-8">
        <span className="font-semibold">{t("demo.banner")}</span>
        <a href="?demo=0" className="inline-flex min-h-9 items-center font-semibold underline">{t("demo.off")}</a>
        <a href="/_ui/shells/credits" className="inline-flex min-h-9 items-center font-semibold underline">{t("demo.credits")}</a>
      </p>
    </div>
  );
}

/**
 * Storefront shell for ui_v2: skip link, glass top bar, content, flat footer, floating glass bottom nav.
 * Admin routes get their own chrome (AdminShell), so here they only render the outlet.
 */
export default function AppLayout() {
  const { t } = useT();
  const { pathname } = useLocation();
  const { perms } = useAuth();
  const alerts = perms.has("orders.view") ? <Suspense fallback={null}><OrderAlerts /></Suspense> : null;
  const [help, setHelp] = useState(false);
  const [helpEver, setHelpEver] = useState(false);
  const content = useRef<HTMLDivElement>(null);
  // Compare paths (not a first-run flag) so StrictMode's double effect run never steals focus on the first load.
  const lastPath = useRef(pathname);
  useShortcuts(() => { setHelpEver(true); setHelp(true); });

  // After a route change move focus to the content so keyboard and screen-reader users start at the top of the new page.
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    content.current?.focus({ preventScroll: true });
  }, [pathname]);

  if (pathname.startsWith("/admin") || pathname.startsWith("/_ui/shells")) return <>{alerts}<Outlet /><ScrollRestoration /></>;

  return (
    <>
      <a href="#content" className="skip-link">{t("shell.skip")}</a>
      {import.meta.env.DEV && demoOn() && <DemoStrip />}
      <Header />
      {alerts}
      <div id="content" ref={content} tabIndex={-1} className="outline-none">
        <Outlet />
      </div>
      <Suspense fallback={<div className="mt-12 min-h-64" aria-hidden />}><Footer /></Suspense>
      <BottomNav />
      {helpEver && <Suspense fallback={null}><ShortcutsDialog open={help} onOpenChange={setHelp} /></Suspense>}
      <ScrollRestoration />
    </>
  );
}
