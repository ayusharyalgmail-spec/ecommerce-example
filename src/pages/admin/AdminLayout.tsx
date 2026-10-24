import { useAdminMessages } from "@/lib/i18n";
import { PageSkeleton } from "@/shell/PageSkeleton";
import AdminShell from "@/shell/AdminShell";

export default function AdminLayout() {
  const ready = useAdminMessages();
  return ready ? <AdminShell /> : <PageSkeleton />;
}
