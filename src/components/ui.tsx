import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { PageSkeleton } from "@/shell/PageSkeleton";

export function useTitle(title: string | undefined) {
  useEffect(() => { if (title) document.title = title; }, [title]);
}

export const Loading = () => <PageSkeleton />;

export const ErrorBox = ({ children }: { children: React.ReactNode }) => (
  <p role="alert" className="alert" style={{ background: "var(--color-surface-error)", color: "var(--color-error)" }}>{children}</p>
);
export const OkBox = ({ children }: { children: React.ReactNode }) => (
  <p role="status" className="alert" style={{ background: "var(--color-surface-success)", color: "var(--color-success)" }}>{children}</p>
);

/** Redirects to /login (remembering where you were) when signed out. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return <>{children}</>;
}

/** Staff area gate. A signed-in non-staff user sees an explanation instead of the dashboard. */
export function RequireStaff({ children }: { children: React.ReactNode }) {
  const { user, loading, isStaff } = useAuth();
  const { t } = useT();
  const loc = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  if (!isStaff)
    return (
      <main className="container-page py-16 text-center">
        <h1 className="text-2xl font-bold">{t("admin.unauthorized_store")}</h1>
        <p className="muted mt-2">{t("admin.denied")} {t("admin.no_access_hint")}</p>
      </main>
    );
  return <>{children}</>;
}

export function Can({ perm, children }: { perm: string; children: React.ReactNode }) {
  const { perms } = useAuth();
  return perms.has(perm) ? <>{children}</> : null;
}
