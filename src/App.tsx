import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider, useT } from "@/lib/i18n";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { BrandLoader } from "@/theme/BrandLoader";
import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import Layout from "@/components/Chrome";
import AppLayout from "@/shell/AppLayout";
import { RouteError } from "@/shell/RouteError";
import { NotFound } from "@/shell/NotFound";
import { PageSkeleton } from "@/shell/PageSkeleton";
import { useUiV2 } from "@/shell/useUiV2";
import { ToastHost } from "@/ui";
import { RequireAuth, RequireStaff } from "@/components/ui";

const HomeLegacy = lazy(() => import("@/pages/Home"));
const HomeV2 = lazy(() => import("@/catalog/HomeV2"));
const ShopLegacy = lazy(() => import("@/pages/Shop"));
const ShopV2 = lazy(() => import("@/catalog/ShopV2"));
const ProductLegacy = lazy(() => import("@/pages/ProductPage"));
const ProductV2 = lazy(() => import("@/catalog/ProductPageV2"));
const CartLegacy = lazy(() => import("@/pages/Cart"));
const CartV2 = lazy(() => import("@/checkout/CartV2"));
const CheckoutLegacy = lazy(() => import("@/pages/Checkout"));
const CheckoutV2 = lazy(() => import("@/checkout/CheckoutV2"));
const TrackLegacy = lazy(() => import("@/pages/Track"));
const TrackV2 = lazy(() => import("@/account/TrackV2"));
import Login from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";
const AccountLegacy = lazy(() => import("@/pages/Account"));
const AccountV2 = lazy(() => import("@/account/AccountV2"));
import Wishlist from "@/pages/Wishlist";
import Addresses from "@/pages/Addresses";
import Invoice from "@/pages/Invoice";

// The dashboard is code-split so shoppers never download it.
// Dev-only primitives gallery (not part of the production bundle: the route is added only in DEV).
const UiGallery = import.meta.env.DEV ? lazy(() => import("@/pages/UiGallery")) : null;
const DevShells = import.meta.env.DEV ? lazy(() => import("@/pages/DevShells")) : null;
const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout"));
const AdminHomeLegacy = lazy(() => import("@/pages/admin/AdminHome"));
const DashboardV2 = lazy(() => import("@/admin/DashboardV2"));
const AdminOrdersV2 = lazy(() => import("@/admin/OrdersV2"));
const AdminOrdersLegacy = lazy(() => import("@/pages/admin/Orders"));
const AdminOrder = lazy(() => import("@/pages/admin/OrderDetail"));
const AdminProducts = lazy(() => import("@/pages/admin/Products"));
const AdminProductEdit = lazy(() => import("@/pages/admin/ProductEdit"));
const AdminReviews = lazy(() => import("@/pages/admin/Reviews"));
const AdminCoupons = lazy(() => import("@/pages/admin/Coupons"));
const AdminZones = lazy(() => import("@/pages/admin/Zones"));
const AdminReports = lazy(() => import("@/pages/admin/Reports"));
const AdminImport = lazy(() => import("@/pages/admin/ImportExport"));
const AdminStaff = lazy(() => import("@/pages/admin/Staff"));
const AdminAudit = lazy(() => import("@/pages/admin/Audit"));
const AdminStorefront = lazy(() => import("@/pages/admin/Storefront"));
const AdminSettings = lazy(() => import("@/pages/admin/Settings"));

/** ui_v2 flag (UX-D020): vendors on the flag get the Bazaar Glass shell, everyone else keeps the current one. */
function Shell() {
  return useUiV2() ? <AppLayout /> : <Layout />;
}

/** Picks the v1 or v2 screen by the ui_v2 flag; both are lazy chunks so neither counts against the entry budget. */
function Routed({ v1, v2 }: { v1: React.ReactNode; v2: React.ReactNode }) {
  const on = useUiV2();
  return <Suspense fallback={<PageSkeleton />}>{on ? v2 : v1}</Suspense>;
}

const queryClient = new QueryClient();

const lazyEl = (el: React.ReactNode) => <Suspense fallback={<PageSkeleton />}>{el}</Suspense>;

const router = createBrowserRouter([
  {
    element: <Shell />,
    errorElement: <RouteError />,
    children: [
      { path: "/", element: <Routed v1={<HomeLegacy />} v2={<HomeV2 />} /> },
      { path: "/shop", element: <Routed v1={<ShopLegacy />} v2={<ShopV2 />} /> },
      { path: "/product/:slug", element: <Routed v1={<ProductLegacy />} v2={<ProductV2 />} /> },
      { path: "/cart", element: <Routed v1={<CartLegacy />} v2={<CartV2 />} /> },
      { path: "/checkout", element: <Routed v1={<CheckoutLegacy />} v2={<CheckoutV2 />} /> },
      { path: "/track", element: <Routed v1={<TrackLegacy />} v2={<TrackV2 />} /> },
      { path: "/login", element: <Login /> },
      { path: "/auth/callback", element: <AuthCallback /> },
      { path: "/account", element: <RequireAuth><Routed v1={<AccountLegacy />} v2={<AccountV2 />} /></RequireAuth> },
      { path: "/account/wishlist", element: <RequireAuth><Wishlist /></RequireAuth> },
      { path: "/account/addresses", element: <RequireAuth><Addresses /></RequireAuth> },
      { path: "/orders/:id/invoice", element: <RequireAuth><Invoice /></RequireAuth> },
      {
        path: "/admin",
        element: <RequireStaff>{lazyEl(<AdminLayout />)}</RequireStaff>,
        children: [
          { index: true, element: <Routed v1={<AdminHomeLegacy />} v2={<DashboardV2 />} /> },
          { path: "orders", element: <Routed v1={<AdminOrdersLegacy />} v2={<AdminOrdersV2 />} /> },
          { path: "orders/:id", element: lazyEl(<AdminOrder />) },
          { path: "products", element: lazyEl(<AdminProducts />) },
          { path: "products/new", element: lazyEl(<AdminProductEdit />) },
          { path: "products/:id", element: lazyEl(<AdminProductEdit />) },
          { path: "reviews", element: lazyEl(<AdminReviews />) },
          { path: "coupons", element: lazyEl(<AdminCoupons />) },
          { path: "zones", element: lazyEl(<AdminZones />) },
          { path: "storefront", element: lazyEl(<AdminStorefront />) },
          { path: "reports", element: lazyEl(<AdminReports />) },
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
]);

function Toasts() {
  const { t } = useT();
  return <ToastHost closeLabel={t("common.close")} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrandLoader />
        <I18nProvider>
          <AuthProvider>
            <CartProvider>
              <RouterProvider router={router} />
              <Toasts />
            </CartProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
