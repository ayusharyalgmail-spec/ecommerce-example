// The tenant the browser is currently acting for. Set by TenantProvider once the tenant is read from the database; null while
// unknown, in hub mode, and for the flagship fallback. When null, requests and storage paths are exactly what they were before
// multi-tenancy, so a database without the tenant-isolation migration keeps working.
let active: string | null = null;

export const setActiveTenant = (id: string | null) => { active = id; };
export const activeTenantId = () => active;

/** Storage paths are written under "<tenant_id>/" (storage RLS requires it once the migration is applied). */
export const tenantPath = (path: string) => (active ? `${active}/${path}` : path);
