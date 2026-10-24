import { useEffect } from "react";
import { useStoreSettings } from "@/lib/queries";
import { useTheme } from "./ThemeProvider";

/** Applies the vendor brand colour from store_settings (public columns only). */
export function BrandLoader() {
  const { data } = useStoreSettings();
  const { setBrandColor } = useTheme();
  const primary = data?.brand?.primary ?? null;
  useEffect(() => { setBrandColor(primary); }, [primary, setBrandColor]);
  useEffect(() => { document.documentElement.setAttribute("data-ui", "v2"); }, []);
  return null;
}
