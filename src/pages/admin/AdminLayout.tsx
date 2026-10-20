import { NavLink, Outlet } from "react-router-dom";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useUiV2 } from "@/shell/useUiV2";
import AdminShell from "@/shell/AdminShell";

export default function AdminLayout() {
  const { t } = useT();
  const { perms } = useAuth();
  const v2 = useUiV2();
  if (v2) return <AdminShell />;
  // Hiding links is cosmetic only; the database re-checks every permission.
  const links: [string, string, string, boolean?][] = [
    ["/admin", t("admin.dashboard"), "orders.view", true], ["/admin/orders", t("admin.orders"), "orders.view"],
    ["/admin/products", t("admin.products"), "products.view"], ["/admin/reviews", t("admin.reviews"), "reviews.moderate"],
    ["/admin/coupons", t("admin.coupons"), "coupons.manage"], ["/admin/zones", t("admin.zones"), "delivery.manage"],
    ["/admin/reports", t("admin.reports"), "reports.view"], ["/admin/import", t("admin.csv"), "csv.manage"],
    ["/admin/staff", t("admin.staff"), "staff.manage"], ["/admin/audit", t("admin.audit"), "audit.view"],
    ["/admin/settings", t("admin.settings"), "settings.manage"],
  ];
  return (
    <div className="container-page">
      <nav aria-label="Admin" className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {links.filter(([, , p]) => perms.has(p)).map(([to, label, , end]) => (
          <NavLink key={to} to={to} end={end} className="btn btn-secondary whitespace-nowrap !py-1 text-sm no-underline"
            style={({ isActive }) => (isActive ? { borderColor: "var(--color-accent)", color: "var(--color-accent)" } : undefined)}>{label}</NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
