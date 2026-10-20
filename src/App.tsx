import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider, Link } from "react-router-dom";
import { I18nProvider, useT } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import Layout from "@/components/Chrome";
import { Loading, RequireAuth, RequireStaff } from "@/components/ui";

import Home from "@/pages/Home";
import Shop from "@/pages/Shop";
import ProductPage from "@/pages/ProductPage";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Track from "@/pages/Track";
import Login from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";
import Account from "@/pages/Account";
import Wishlist from "@/pages/Wishlist";
import Addresses from "@/pages/Addresses";
import Invoice from "@/pages/Invoice";

// The dashboard is code-split so shoppers never download it.
const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout"));
const AdminHome = lazy(() => import("@/pages/admin/AdminHome"));
const AdminOrders = lazy(() => import("@/pages/admin/Orders"));
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
const AdminSettings = lazy(() => import("@/pages/admin/Settings"));

function NotFound() {
  const { t } = useT();
  return (
    <main className="container-page py-16 text-center">
      <p className="text-5xl" aria-hidden>🔍</p>
      <h1 className="text-2xl font-bold">404</h1>
      <Link to="/" className="btn btn-primary mt-4">{t("nav.home")}</Link>
    </main>
  );
}

const lazyEl = (el: React.ReactNode) => <Suspense fallback={<Loading />}>{el}</Suspense>;

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/shop", element: <Shop /> },
      { path: "/product/:slug", element: <ProductPage /> },
      { path: "/cart", element: <Cart /> },
      { path: "/checkout", element: <Checkout /> },
      { path: "/track", element: <Track /> },
      { path: "/login", element: <Login /> },
      { path: "/auth/callback", element: <AuthCallback /> },
      { path: "/account", element: <RequireAuth><Account /></RequireAuth> },
      { path: "/account/wishlist", element: <RequireAuth><Wishlist /></RequireAuth> },
      { path: "/account/addresses", element: <RequireAuth><Addresses /></RequireAuth> },
      { path: "/orders/:id/invoice", element: <RequireAuth><Invoice /></RequireAuth> },
      {
        path: "/admin",
        element: <RequireStaff>{lazyEl(<AdminLayout />)}</RequireStaff>,
        children: [
          { index: true, element: lazyEl(<AdminHome />) },
          { path: "orders", element: lazyEl(<AdminOrders />) },
          { path: "orders/:id", element: lazyEl(<AdminOrder />) },
          { path: "products", element: lazyEl(<AdminProducts />) },
          { path: "products/new", element: lazyEl(<AdminProductEdit />) },
          { path: "products/:id", element: lazyEl(<AdminProductEdit />) },
          { path: "reviews", element: lazyEl(<AdminReviews />) },
          { path: "coupons", element: lazyEl(<AdminCoupons />) },
          { path: "zones", element: lazyEl(<AdminZones />) },
          { path: "reports", element: lazyEl(<AdminReports />) },
          { path: "import", element: lazyEl(<AdminImport />) },
          { path: "staff", element: lazyEl(<AdminStaff />) },
          { path: "audit", element: lazyEl(<AdminAudit />) },
          { path: "settings", element: lazyEl(<AdminSettings />) },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <CartProvider>
          <RouterProvider router={router} />
        </CartProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
