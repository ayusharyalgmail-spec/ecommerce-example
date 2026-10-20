import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter, RouterProvider, createMemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CartProvider } from "@/lib/cart";
import { MockAuthProvider } from "@/lib/auth";
import { AppearancePanel } from "./AppearancePanel";
import { BottomNav } from "./BottomNav";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { NotFound } from "./NotFound";
import { RouteError } from "./RouteError";
import { BasketIllustration } from "./Illustration";
import AdminShell from "./AdminShell";

// Header, Footer and the categories menu read public settings from Supabase (read-only, anon): the stories use the real
// dev project, so the store name and contacts appear as in the app. Auth is mocked.
const qc = new QueryClient();

const meta = {
  title: "Shell",
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <QueryClientProvider client={qc}>
        <MockAuthProvider perms={["orders.view", "products.view", "reports.view", "settings.manage", "staff.manage"]}>
          <CartProvider><MemoryRouter><Story /></MemoryRouter></CartProvider>
        </MockAuthProvider>
      </QueryClientProvider>
    ),
  ],
} satisfies Meta;
export default meta;
type S = StoryObj;

export const TopBar: S = { render: () => <><Header /><div style={{ height: 800 }} /></> };
export const FloatingBottomNav: S = { parameters: { viewport: { defaultViewport: "compact" } }, render: () => <><div style={{ height: 600 }} /><BottomNav /></> };
export const FooterStory: S = { name: "Footer", render: () => <Footer /> };
export const Appearance: S = { render: () => <div className="max-w-md p-4"><AppearancePanel /></div> };
export const NotFoundPage: S = { name: "404", render: () => <NotFound /> };
export const Illustration: S = { render: () => <div className="flex gap-4 p-4"><BasketIllustration /><BasketIllustration broken /></div> };

export const ErrorScreen: S = {
  name: "Error screen",
  decorators: [() => {
    const router = createMemoryRouter([{ path: "/", element: <Boom />, errorElement: <RouteError /> }]);
    return <RouterProvider router={router} />;
  }],
  render: () => <></>,
};
function Boom(): never { throw new Error("Story: preview of the global error screen"); }

export const AdminDashboardShell: S = {
  name: "Admin shell",
  render: () => <AdminShell />,
  parameters: { docs: { description: { story: "Sidebar at 840 px and wider; floating bottom nav with a More sheet below that." } } },
};
