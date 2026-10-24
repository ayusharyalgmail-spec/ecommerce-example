import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, RouterProvider, type RouteObject } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider, loadMsgMessages, useT } from "@/lib/i18n";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { BrandLoader } from "@/theme/BrandLoader";
import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import AppLayout from "@/shell/AppLayout";
import { RouteError } from "@/shell/RouteError";
import { NotFound } from "@/shell/NotFound";
import { PageSkeleton } from "@/shell/PageSkeleton";
import { ToastHost } from "@/ui";
import { RequireAuth, RequireStaff } from "@/components/ui";
import { TenantProvider, useTenant } from "@/platform/TenantContext";
import { basenameFor, resolveTenantRef } from "@/platform/resolve";
import { StoreGate } from "@/platform/StoreGate";

// Shop (Bazaar Glass v2 is the only storefront)
const HomeV2 = lazy(() => import("@/catalog/HomeV2"));
const ShopV2 = lazy(() => import("@/catalog/ShopV2"));
const ProductV2 = lazy(() => import("@/catalog/ProductPageV2"));
const CartV2 = lazy(() => import("@/checkout/CartV2"));
const CheckoutV2 = lazy(() => import("@/checkout/CheckoutV2"));
const TrackV2 = lazy(() => import("@/account/TrackV2"));
const Login = lazy(() => import("@/pages/Login"));
import AuthCallback from "@/pages/AuthCallback";
const AccountV2 = lazy(() => import("@/account/AccountV2"));
import Wishlist from "@/pages/Wishlist";
import Addresses from "@/pages/Addresses";
import Invoice from "@/pages/Invoice";

const NetworkLayout = lazy(() => import("@/network/NetworkLayout"));
const NetworkHome = lazy(() => import("@/network/NetworkHome"));
const AboutPlatform = lazy(() => import("@/network/AboutPlatform"));
const BusinessLayout = lazy(() => import("@/business/BusinessLayout"));
const BusinessHome = lazy(() => import("@/business/BusinessHome"));
// Hub pages are lazy chunks too.
// The hub dashboard (vendor profile editors) is code-split so directory visitors never download it.
const DashboardLayout = lazy(() => import("@/dashboard/DashboardLayout"));
const DashboardHome = lazy(() => import("@/dashboard/DashboardHome"));
const ProfileEditor = lazy(() => import("@/dashboard/ProfileEditor"));
const ServicesEditor = lazy(() => import("@/dashboard/ServicesEditor"));
const GalleryEditor = lazy(() => import("@/dashboard/GalleryEditor"));
const HoursEditor = lazy(() => import("@/dashboard/HoursEditor"));
const InquiriesView = lazy(() => import("@/dashboard/InquiriesView"));
const SettingsEditor = lazy(() => import("@/dashboard/SettingsEditor"));

// The shop admin is code-split so shoppers never download it.
// Dev-only primitives gallery (not part of the production bundle: the route is added only in DEV).
const UiGallery = import.meta.env.DEV ? lazy(() => import("@/pages/UiGallery")) : null;
const DevShells = import.meta.env.DEV ? lazy(() => import("@/pages/DevShells")) : null;
const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout"));
const DashboardV2 = lazy(() => import("@/admin/DashboardV2"));
const AdminOrdersV2 = lazy(() => import("@/admin/OrdersV2"));
const OrderDetailV2 = lazy(() => import("@/admin/OrderDetailV2"));
const ProductsV2 = lazy(() => import("@/admin/ProductsV2"));
const ProductEditV2 = lazy(() => import("@/admin/ProductEditV2"));
const AdminReviews = lazy(() => import("@/pages/admin/Reviews"));
const AdminCoupons = lazy(() => import("@/pages/admin/Coupons"));
const AdminZones = lazy(() => import("@/pages/admin/Zones"));
const AdminMoney = lazy(() => import("@/pages/admin/Money"));
const ReportsV2 = lazy(() => import("@/admin/ReportsV2"));
const AdminImport = lazy(() => import("@/pages/admin/ImportExport"));
const AdminStaff = lazy(() => import("@/pages/admin/Staff"));
const AdminAudit = lazy(() => import("@/pages/admin/Audit"));
const AdminStorefront = lazy(() => import("@/pages/admin/Storefront"));
const AdminCategories = lazy(() => import("@/admin/Categories"));
const AdminSettings = lazy(() => import("@/pages/admin/Settings"));
const AdminMessages = lazy(() => import("@/admin/MessagesAdmin"));
// Customer Messages replaces Track order in the navigation; /track itself is unchanged.
const MessagesPage = lazy(() => loadMsgMessages().then(() => import("@/messaging/MessagesPage")));

/** Platform-level cache (tenant lookup only). Each tenant then gets its own cache inside TenantProvider. */
const platformClient = new QueryClient();

const safeSession = () => { try { return window.sessionStorage; } catch { return null; } };
/** Resolved once per page load: the tenant never changes without a navigation that reloads the app. */
const tenantRef = resolveTenantRef(window.location, import.meta.env.VITE_ROOT_DOMAIN as string | undefined, safeSession());
const isHub = tenantRef.kind === "hub";

const lazyEl = (el: React.ReactNode) => <Suspense fallback={<PageSkeleton />}>{el}</Suspense>;

const storeRoutes: RouteObject[] = [
  // The shop, at its original paths
  {
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { path: "/", element: lazyEl(<HomeV2 />) },
      { path: "/shop", element: lazyEl(<ShopV2 />) },
      { path: "/product/:slug", element: lazyEl(<ProductV2 />) },
      { path: "/cart", element: lazyEl(<CartV2 />) },
      { path: "/checkout", element: lazyEl(<CheckoutV2 />) },
      { path: "/track", element: lazyEl(<TrackV2 />) },
      { path: "/messages", element: lazyEl(<MessagesPage />) },
      { path: "/login", element: lazyEl(<Login />) },
      { path: "/auth/callback", element: <AuthCallback /> },
      { path: "/account", element: <RequireAuth>{lazyEl(<AccountV2 />)}</RequireAuth> },
      { path: "/account/wishlist", element: <RequireAuth><Wishlist /></RequireAuth> },
      { path: "/account/addresses", element: <RequireAuth><Addresses /></RequireAuth> },
      { path: "/orders/:id/invoice", element: <RequireAuth><Invoice /></RequireAuth> },
      {
        path: "/admin",
        element: <RequireStaff>{lazyEl(<AdminLayout />)}</RequireStaff>,
        children: [
          { index: true, element: lazyEl(<DashboardV2 />) },
          { path: "orders", element: lazyEl(<AdminOrdersV2 />) },
          { path: "orders/:id", element: lazyEl(<OrderDetailV2 />) },
          { path: "products", element: lazyEl(<ProductsV2 />) },
          { path: "products/new", element: lazyEl(<ProductEditV2 />) },
          { path: "products/:id", element: lazyEl(<ProductEditV2 />) },
          { path: "reviews", element: lazyEl(<AdminReviews />) },
          { path: "coupons", element: lazyEl(<AdminCoupons />) },
          { path: "zones", element: lazyEl(<AdminZones />) },
          { path: "money", element: lazyEl(<AdminMoney />) },
          { path: "messages", element: lazyEl(<AdminMessages />) },
          { path: "categories", element: lazyEl(<AdminCategories />) },
          { path: "storefront", element: lazyEl(<AdminStorefront />) },
          { path: "reports", element: lazyEl(<ReportsV2 />) },
          { path: "import", element: lazyEl(<AdminImport />) },
          { path: "staff", element: lazyEl(<AdminStaff />) },
          { path: "audit", element: lazyEl(<AdminAudit />) },
          { path: "settings", element: lazyEl(<AdminSettings />) },
        ],
      },
      ...(UiGallery ? [{ path: "/_ui", element: lazyEl(<UiGallery />) }] : []),
      ...(DevShells ? [{ path: "/_ui/shells/*", element: lazyEl(<DevShells />) }] : []),
      { path: "*", element: <NotFound /> },
    ],
  },
];

/** Hub: the vendor directory, public business pages and the vendor dashboard. */
const hubRoutes: RouteObject[] = [
  { path: "/", element: <Navigate to="/network" replace /> },
  { path: "/network", element: lazyEl(<NetworkLayout />), errorElement: <RouteError />, children: [{ index: true, element: lazyEl(<NetworkHome />) }, { path: "about", element: lazyEl(<AboutPlatform />) }] },
  { path: "/b/:slug", element: lazyEl(<BusinessLayout />), errorElement: <RouteError />, children: [{ index: true, element: lazyEl(<BusinessHome />) }] },
  { path: "/login", element: lazyEl(<Login />), errorElement: <RouteError /> },
  { path: "/auth/callback", element: <AuthCallback /> },
  {
    path: "/dashboard", element: <RequireAuth>{lazyEl(<DashboardLayout />)}</RequireAuth>, errorElement: <RouteError />,
    children: [
      { index: true, element: lazyEl(<DashboardHome />) },
      { path: "profile", element: lazyEl(<ProfileEditor />) },
      { path: "services", element: lazyEl(<ServicesEditor />) },
      { path: "gallery", element: lazyEl(<GalleryEditor />) },
      { path: "hours", element: lazyEl(<HoursEditor />) },
      { path: "inquiries", element: lazyEl(<InquiriesView />) },
      { path: "settings", element: lazyEl(<SettingsEditor />) },
    ],
  },
  { path: "*", element: <NotFound /> },
];

const router = createBrowserRouter(isHub ? hubRoutes : storeRoutes, { basename: basenameFor(tenantRef) });

function Toasts() {
  const { t } = useT();
  return <ToastHost closeLabel={t("common.close")} />;
}

/** Store-only providers: cart (one per store), brand colour, and the not-found/loading gate. */
function StoreApp() {
  const { slug } = useTenant();
  return (
    <CartProvider scope={slug}>
      <BrandLoader />
      <StoreGate><RouterProvider router={router} /></StoreGate>
    </CartProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={platformClient}>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <TenantProvider tenantRef={tenantRef}>
              {isHub ? <RouterProvider router={router} /> : <StoreApp />}
              <Toasts />
            </TenantProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
