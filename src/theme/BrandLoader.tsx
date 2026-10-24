import { useEffect } from "react";
import { useStoreSettings } from "@/lib/queries";
import { useTenant } from "@/platform/TenantContext";
import { useTheme } from "./ThemeProvider";

/** Applies the tenant's brand colour (tenants.brand_primary), else the store_settings brand (public columns only). Store mode only. */
export function BrandLoader() {
  const { data } = useStoreSettings();
  const { tenant } = useTenant();
  const { setBrandColor } = useTheme();
  const primary = tenant?.brand_primary ?? data?.brand?.primary ?? null;
  useEffect(() => { setBrandColor(primary); }, [primary, setBrandColor]);
  useEffect(() => { document.documentElement.setAttribute("data-ui", "v2"); }, []);
  return null;
}
