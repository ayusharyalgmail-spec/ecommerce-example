import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
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

const queryClient = new QueryClient();

const lazyEl = (el: React.ReactNode) => <Suspense fallback={<PageSkeleton />}>{el}</Suspense>;

const router = createBrowserRouter([
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
