// Dashboard Layout — admin shell for business owners/editors.
// Left sidebar on desktop, bottom nav on mobile.
import { lazy, Suspense, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useT, pick } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { PageSkeleton } from "@/shell/PageSkeleton";
import {
  BarChart3, Building2, Clock, Globe, Image, LayoutDashboard,
  LogOut, Mail, Menu, Settings, ShoppingBag, X,
} from "lucide-react";

type ManagedTenant = { id: string; slug: string; business_name: string; role: string };

export default function DashboardLayout() {
  const { user, signOut } = useAuth();
  const { locale } = useT();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<ManagedTenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load the tenant this user manages
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Check tenant_staff first, then owner_id fallback
      const { data: staffRow } = await supabase
        .from("tenant_staff")
        .select("tenant_id,role,tenants(id,slug,business_name)")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (staffRow?.tenants) {
        const t = staffRow.tenants as unknown as { id: string; slug: string; business_name: string };
        setTenant({ ...t, role: staffRow.role });
        setLoading(false);
        return;
      }

      // Check if they own a tenant directly
      const { data: ownedTenant } = await supabase
        .from("tenants")
        .select("id,slug,business_name")
        .eq("owner_id", user.id)
        .limit(1)
        .maybeSingle();

      if (ownedTenant) {
        setTenant({ ...ownedTenant, role: "owner" });
      }
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return <PageSkeleton />;

  if (!tenant) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg)] p-8 text-center">
        <Building2 size={48} className="mb-4 text-[var(--text-muted)] opacity-40" />
        <h1 className="text-2xl font-bold">{pick(locale, "No Business Found", "कुनै व्यवसाय भेटिएन")}</h1>
        <p className="mt-2 max-w-md text-[var(--text-muted)]">
          {pick(locale,
            "You don't have a business assigned to your account yet. Contact the platform administrator to get started.",
            "तपाईंको खातामा अझै कुनै व्यवसाय तोकिएको छैन।"
          )}
        </p>
        <div className="mt-6 flex gap-3">
          <Link to="/network" className="rounded-xl border border-[var(--line)] px-5 py-2.5 font-semibold transition-colors hover:border-[var(--brand)]">
            {pick(locale, "Back to Home", "गृहपृष्ठ")}
          </Link>
          <button onClick={() => { signOut(); navigate("/network"); }} className="rounded-xl bg-[var(--danger)] px-5 py-2.5 font-semibold text-white">
            {pick(locale, "Sign Out", "साइन आउट")}
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: pick(locale, "Dashboard", "ड्यासबोर्ड"), end: true },
    { to: "/dashboard/profile", icon: Building2, label: pick(locale, "Profile", "प्रोफाइल") },
    { to: "/dashboard/services", icon: ShoppingBag, label: pick(locale, "Services", "सेवाहरू") },
    { to: "/dashboard/gallery", icon: Image, label: pick(locale, "Gallery", "ग्यालरी") },
    { to: "/dashboard/hours", icon: Clock, label: pick(locale, "Hours", "समय") },
    { to: "/dashboard/inquiries", icon: Mail, label: pick(locale, "Inquiries", "सोधपुछ") },
    { to: "/dashboard/settings", icon: Settings, label: pick(locale, "Settings", "सेटिङ") },
  ];

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:border-[var(--line)] md:bg-[var(--surface)]">
        <div className="flex h-14 items-center gap-2 border-b border-[var(--line)] px-4">
          <Building2 size={20} className="text-[var(--brand)]" />
          <span className="truncate font-bold">{tenant.business_name}</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--brand-tint)] text-[var(--brand-strong)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-[var(--line)] p-3 space-y-2">
          <Link to={`/b/${tenant.slug}`} target="_blank" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--ink)]">
            <Globe size={16} /> {pick(locale, "View Site", "साइट हेर्नुहोस्")}
          </Link>
          <button onClick={() => { signOut(); navigate("/network"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--danger)] hover:bg-[var(--danger-tint)]">
            <LogOut size={16} /> {pick(locale, "Sign Out", "साइन आउट")}
          </button>
        </div>
      </aside>

      {/* ── Mobile Header + Sheet ── */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-4 md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-[var(--surface-2)]" aria-label="Open menu">
            <Menu size={20} />
          </button>
          <span className="truncate font-bold">{tenant.business_name}</span>
          <Link to={`/b/${tenant.slug}`} target="_blank" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-[var(--surface-2)]" aria-label="View site">
            <Globe size={18} />
          </Link>
        </header>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
            <div className="relative z-10 flex w-64 flex-col bg-[var(--surface)] shadow-xl">
              <div className="flex h-14 items-center justify-between border-b border-[var(--line)] px-4">
                <span className="font-bold">{tenant.business_name}</span>
                <button onClick={() => setSidebarOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--surface-2)]" aria-label="Close">
                  <X size={18} />
                </button>
              </div>
              <nav className="flex-1 space-y-1 p-3">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive ? "bg-[var(--brand-tint)] text-[var(--brand-strong)]" : "text-[var(--text-muted)]"
                      }`
                    }
                  >
                    <item.icon size={18} /> {item.label}
                  </NavLink>
                ))}
              </nav>
              <div className="border-t border-[var(--line)] p-3">
                <button onClick={() => { signOut(); navigate("/network"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-[var(--danger)]">
                  <LogOut size={16} /> {pick(locale, "Sign Out", "साइन आउट")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet context={{ tenant }} />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

/** Hook for child routes to access the managed tenant. */
// Re-exported as a named function to avoid circular imports.
export { useManagedTenant } from "./useManagedTenant";
