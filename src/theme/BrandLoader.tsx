import { useEffect } from "react";
import { useStoreSettings } from "@/lib/queries";
import { useUiV2 } from "@/shell/useUiV2";
import { useTheme } from "./ThemeProvider";

/** Applies the vendor brand colour and the ui_v2 flag from store_settings (public columns only). */
export function BrandLoader() {
  const { data } = useStoreSettings();
  const { setBrandColor } = useTheme();
  const primary = data?.brand?.primary ?? null;
  useEffect(() => { setBrandColor(primary); }, [primary, setBrandColor]);
  const v2 = useUiV2();
  useEffect(() => { document.documentElement.setAttribute("data-ui", v2 ? "v2" : "v1"); }, [v2]);
  return null;
}
