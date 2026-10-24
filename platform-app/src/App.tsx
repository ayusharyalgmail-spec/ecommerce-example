import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider, useT } from "@/lib/i18n";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { AuthProvider } from "@/lib/auth";
import { RouteError } from "@/shell/RouteError";
import { NotFound } from "./NotFound";
import { PageSkeleton } from "@/shell/PageSkeleton";
import { ToastHost } from "@/ui";
import NetworkLayout from "@/network/NetworkLayout";
import NetworkHome from "@/network/NetworkHome";
import AboutPlatform from "@/network/AboutPlatform";
import BusinessLayout from "@/business/BusinessLayout";
import BusinessHome from "@/business/BusinessHome";
import { RequireAuth } from "./RequireAuth";

// Owner dashboard is code-split so directory visitors never download it.
const Login = lazy(() => import("./Login"));
const DashboardLayout = lazy(() => import("@/dashboard/DashboardLayout"));
const DashboardHome = lazy(() => import("@/dashboard/DashboardHome"));
const ProfileEditor = lazy(() => import("@/dashboard/ProfileEditor"));
const ServicesEditor = lazy(() => import("@/dashboard/ServicesEditor"));
const GalleryEditor = lazy(() => import("@/dashboard/GalleryEditor"));
const HoursEditor = lazy(() => import("@/dashboard/HoursEditor"));
const InquiriesView = lazy(() => import("@/dashboard/InquiriesView"));
const SettingsEditor = lazy(() => import("@/dashboard/SettingsEditor"));

const queryClient = new QueryClient();
const lazyEl = (el: React.ReactNode) => <Suspense fallback={<PageSkeleton />}>{el}</Suspense>;

const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/network" replace /> },
  {
    path: "/network", element: <NetworkLayout />, errorElement: <RouteError />,
    children: [{ index: true, element: <NetworkHome /> }, { path: "about", element: <AboutPlatform /> }],
  },
  { path: "/b/:slug", element: <BusinessLayout />, errorElement: <RouteError />, children: [{ index: true, element: <BusinessHome /> }] },
  { path: "/login", element: lazyEl(<Login />), errorElement: <RouteError /> },
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
]);

function Toasts() {
  const { t } = useT();
  return <ToastHost closeLabel={t("common.close")} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <RouterProvider router={router} />
            <Toasts />
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
