import { useEffect } from "react";
import { useStoreSettings } from "@/lib/queries";
import { useTheme } from "./ThemeProvider";

/** Applies the vendor brand colour and the ui_v2 flag from store_settings (public columns only). */
export function BrandLoader() {
  const { data } = useStoreSettings();
  const { setBrandColor } = useTheme();
  const primary = data?.brand?.primary ?? null;
  useEffect(() => { setBrandColor(primary); }, [primary, setBrandColor]);
  const v2 = data?.ui_v2;
  useEffect(() => {
    if (v2 === undefined) return;
    document.documentElement.setAttribute("data-ui", v2 ? "v2" : "v1");
  }, [v2]);
  return null;
}
