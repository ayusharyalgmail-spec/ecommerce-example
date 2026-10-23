// Hook for dashboard child routes to access the managed tenant.
import { useOutletContext } from "react-router-dom";

export type ManagedTenant = { id: string; slug: string; business_name: string; role: string };

export function useManagedTenant(): ManagedTenant {
  return (useOutletContext() as { tenant: ManagedTenant }).tenant;
}
