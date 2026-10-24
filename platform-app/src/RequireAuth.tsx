import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { PageSkeleton } from "@/shell/PageSkeleton";

/** UI convenience only: signed-out visitors go to /login and come back. Data access is enforced by RLS. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <PageSkeleton />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return <>{children}</>;
}
