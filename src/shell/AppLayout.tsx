import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Outlet, ScrollRestoration, useLocation } from "react-router-dom";
import { useT } from "@/lib/i18n";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
// Below the fold or on demand: separate chunks so the shell stays inside the entry budget.
const Footer = lazy(() => import("./Footer").then((m) => ({ default: m.Footer })));
const ShortcutsDialog = lazy(() => import("./ShortcutsDialog").then((m) => ({ default: m.ShortcutsDialog })));
import { useShortcuts } from "./useShortcuts";

/**
 * Storefront shell for ui_v2: skip link, glass top bar, content, flat footer, floating glass bottom nav.
 * Admin routes get their own chrome (AdminShell), so here they only render the outlet.
 */
export default function AppLayout() {
  const { t } = useT();
  const { pathname } = useLocation();
  const [help, setHelp] = useState(false);
  const [helpEver, setHelpEver] = useState(false);
  const content = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useShortcuts(() => { setHelpEver(true); setHelp(true); });

  // After a route change move focus to the content so keyboard and screen-reader users start at the top of the new page.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    content.current?.focus({ preventScroll: true });
  }, [pathname]);

  if (pathname.startsWith("/admin") || pathname.startsWith("/_ui/shells")) return <><Outlet /><ScrollRestoration /></>;

  return (
    <>
      <a href="#content" className="skip-link">{t("shell.skip")}</a>
      <Header />
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
