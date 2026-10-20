import { useEffect } from "react";
import type { Preview } from "@storybook/react-vite";
import "../src/index.css";
import { I18nProvider, useT } from "../src/lib/i18n";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";

// Toolbar: language, theme, effects tier, brand colour, width. Every story is reviewed in all of them (DESIGN.md section 8).
const BRANDS = { default: "", "marigold-light (#FFF200)": "#FFF200", "near-black (#111111)": "#111111", "mid-grey (#7B7B7B)": "#7B7B7B", "teal (#0B7285)": "#0B7285", "crimson (#C2255C)": "#C2255C", "green (#2F9E44)": "#2F9E44" };

function Sync({ locale, theme, fx, brand }: { locale: "en" | "ne"; theme: "system" | "light" | "dark"; fx: "auto" | "full" | "lite"; brand: string }) {
  const { setLocale } = useT();
  const { setMode, setFxPref, setBrandColor } = useTheme();
  useEffect(() => { void setLocale(locale); }, [locale, setLocale]);
  useEffect(() => { setMode(theme); }, [theme, setMode]);
  useEffect(() => { setFxPref(fx); }, [fx, setFxPref]);
  useEffect(() => { setBrandColor(brand || null); }, [brand, setBrandColor]);
  return null;
}

const preview: Preview = {
  globalTypes: {
    locale: { description: "Language", toolbar: { title: "Language", icon: "globe", items: ["en", "ne"], dynamicTitle: true } },
    theme: { description: "Theme", toolbar: { title: "Theme", icon: "circlehollow", items: ["system", "light", "dark"], dynamicTitle: true } },
    fx: { description: "Effects tier", toolbar: { title: "Effects", icon: "lightning", items: ["auto", "full", "lite"], dynamicTitle: true } },
    brand: { description: "Vendor brand colour", toolbar: { title: "Brand", icon: "paintbrush", items: Object.entries(BRANDS).map(([title, value]) => ({ title, value })) } },
  },
  initialGlobals: { locale: "en", theme: "light", fx: "full", brand: "" },
  parameters: {
    layout: "padded",
    controls: { expanded: true },
    a11y: { test: "error" },
    viewport: { options: { compact: { name: "Compact 360", styles: { width: "360px", height: "800px" }, type: "mobile" }, medium: { name: "Medium 700", styles: { width: "700px", height: "900px" }, type: "tablet" }, expanded: { name: "Expanded 1366", styles: { width: "1366px", height: "768px" }, type: "desktop" } } },
  },
  decorators: [
    (Story, ctx) => (
      <ThemeProvider>
        <I18nProvider>
          <Sync locale={ctx.globals.locale} theme={ctx.globals.theme} fx={ctx.globals.fx} brand={ctx.globals.brand} />
          <div style={{ minHeight: 120 }}><Story /></div>
        </I18nProvider>
      </ThemeProvider>
    ),
  ],
};
export default preview;
