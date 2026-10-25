// Development-only previews that cannot be reached without a staff login or a real failure (route /_ui/shells/*):
//   /_ui/shells/admin   the v2 admin shell with every permission, plus its dashboard, products and orders screens
//                       (data still goes through RLS as the real visitor, so without a staff login they show empty states)
//   /_ui/shells/throw   a component that throws, to see the global error screen
//   /_ui/shells/credits author and licence of every demo-catalogue photo (Creative Commons attribution)
import { Routes, Route } from "react-router-dom";
import AdminShell from "@/shell/AdminShell";
import Dashboard from "@/admin/Dashboard";
import Products from "@/admin/Products";
import Orders from "@/admin/Orders";
import { MockAuthProvider } from "@/lib/auth";
import { useAdminMessages } from "@/lib/i18n";

function AdminPreview() {
  return useAdminMessages() ? <AdminShell /> : null;
}
import { DEMO_IMAGES } from "@/catalog/demo/images";

function Credits() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="m-0 text-title font-bold">Demo photo credits</h1>
      <p className="m-0 text-muted">Photos used by the development demo catalogue, from Wikimedia Commons. They are not part of the production build.</p>
      <ul className="m-0 list-none space-y-2 p-0">
        {Object.entries(DEMO_IMAGES).map(([k, i]) => (
          <li key={k} className="flex items-center gap-3 rounded-md bg-surface p-2 ring-1 ring-[var(--line)]">
            <img src={i.src} alt="" width={56} height={56} loading="lazy" className="size-14 rounded-sm object-cover" />
            <span className="min-w-0 text-sm"><span className="block font-semibold">{k}</span>{i.author}, {i.license}. <a href={i.page} target="_blank" rel="noopener noreferrer" className="underline">Source</a></span>
          </li>
        ))}
      </ul>
    </main>
  );
}

const ALL = ["products.view", "products.manage", "orders.view", "orders.manage", "orders.verify_payment", "customers.view", "coupons.manage", "delivery.manage", "reviews.moderate", "reports.view", "csv.manage", "staff.manage", "settings.manage", "audit.view"];

function Boom(): never { throw new Error("Preview of the global error screen"); }

export default function DevShells() {
  return (
    <Routes>
      <Route path="throw" element={<Boom />} />
      <Route path="credits" element={<Credits />} />
      <Route path="admin" element={<MockAuthProvider perms={ALL}><AdminPreview /></MockAuthProvider>}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="orders" element={<Orders />} />
      </Route>
    </Routes>
  );
}
