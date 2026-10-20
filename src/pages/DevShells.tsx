// Development-only previews that cannot be reached without a staff login or a real failure (route /_ui/shells/*):
//   /_ui/shells/admin   the v2 admin shell with every permission
//   /_ui/shells/throw   a component that throws, to see the global error screen
import { Routes, Route } from "react-router-dom";
import AdminShell from "@/shell/AdminShell";
import { MockAuthProvider } from "@/lib/auth";

const ALL = ["products.view", "products.manage", "orders.view", "orders.manage", "orders.verify_payment", "customers.view", "coupons.manage", "delivery.manage", "reviews.moderate", "reports.view", "csv.manage", "staff.manage", "settings.manage", "audit.view"];

function Boom(): never { throw new Error("Preview of the global error screen"); }

export default function DevShells() {
  return (
    <Routes>
      <Route path="throw" element={<Boom />} />
      <Route path="admin" element={<MockAuthProvider perms={ALL}><AdminShell /></MockAuthProvider>}>
        <Route index element={<main><h1 className="text-3xl font-bold">Dashboard</h1><p>Admin content goes here. The sidebar shows at 840 px and wider; below that you get the floating bottom nav and the More sheet.</p></main>} />
      </Route>
    </Routes>
  );
}
