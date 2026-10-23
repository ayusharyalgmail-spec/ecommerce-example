// Dashboard Home — overview with analytics, quick actions, and recent inquiries.
import { Link } from "react-router-dom";
import { useT, pick } from "@/lib/i18n";
import { useManagedTenant } from "./useManagedTenant";
import { useTenantAnalytics, useTenantInquiries } from "@/platform/queries";
import { ArrowRight, BarChart3, Eye, Globe, Mail, TrendingUp } from "lucide-react";

export default function DashboardHome() {
  const tenant = useManagedTenant();
  const { locale } = useT();
  const { data: analytics } = useTenantAnalytics(tenant.id);
  const { data: inquiries } = useTenantInquiries(tenant.id);

  const unread = inquiries?.filter((i) => !i.is_read).length ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{pick(locale, "Dashboard", "ड्यासबोर्ड")}</h1>
          <p className="text-sm text-[var(--text-muted)]">{tenant.business_name}</p>
        </div>
        <Link to={`/b/${tenant.slug}`} target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-medium transition-colors hover:border-[var(--brand)]">
          <Globe size={16} /> {pick(locale, "View Site", "साइट हेर्नुहोस्")}
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: pick(locale, "Today", "आज"), value: analytics?.today ?? "–", icon: Eye, color: "var(--brand)" },
          { label: pick(locale, "This Week", "यो हप्ता"), value: analytics?.week ?? "–", icon: TrendingUp, color: "var(--glacier)" },
          { label: pick(locale, "This Month", "यो महिना"), value: analytics?.month ?? "–", icon: BarChart3, color: "var(--accent)" },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: `color-mix(in oklab, ${stat.color} 12%, var(--surface))` }}>
              <stat.icon size={22} style={{ color: stat.color }} />
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)]">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent inquiries */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)]">
        <div className="flex items-center justify-between border-b border-[var(--line)] p-4">
          <h2 className="flex items-center gap-2 font-bold">
            <Mail size={18} className="text-[var(--brand)]" />
            {pick(locale, "Recent Inquiries", "हालका सोधपुछहरू")}
            {unread > 0 && (
              <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand)] px-1.5 text-xs font-bold text-[var(--on-brand)]">
                {unread}
              </span>
            )}
          </h2>
          <Link to="/dashboard/inquiries" className="flex items-center gap-1 text-sm font-medium text-[var(--brand-strong)]">
            {pick(locale, "View All", "सबै हेर्नुहोस्")} <ArrowRight size={14} />
          </Link>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {inquiries && inquiries.length > 0 ? (
            inquiries.slice(0, 5).map((inq) => (
              <div key={inq.id} className={`flex items-start gap-3 p-4 ${!inq.is_read ? "bg-[var(--brand-tint)]" : ""}`}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] font-bold text-sm">
                  {inq.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold">{inq.name}</span>
                    <span className="text-xs text-[var(--text-muted)]">{new Date(inq.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-[var(--text-muted)]">{inq.message}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="p-6 text-center text-sm text-[var(--text-muted)]">{pick(locale, "No inquiries yet", "अझै कुनै सोधपुछ छैन")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
