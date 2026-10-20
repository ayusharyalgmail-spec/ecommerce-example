import { SegmentedControl } from "@/ui";
import { useT, type Locale } from "@/lib/i18n";
import { useTheme, type ThemeMode } from "@/theme/ThemeProvider";
import type { FxPref } from "@/theme/fx";

/** Theme, effects tier and language. Reachable from the footer on every screen and the desktop account menu. */
export function AppearancePanel() {
  const { t, locale, setLocale } = useT();
  const { mode, setMode, fxPref, setFxPref } = useTheme();
  return (
    <div className="space-y-5">
      <SegmentedControl<ThemeMode> label={t("appearance.theme")} value={mode} onChange={setMode}
        options={[{ value: "system", label: t("appearance.system") }, { value: "light", label: t("appearance.light") }, { value: "dark", label: t("appearance.dark") }]} />
      <SegmentedControl<FxPref> label={t("appearance.effects")} value={fxPref} onChange={setFxPref} hint={t("appearance.effects_hint")}
        options={[{ value: "auto", label: t("appearance.auto") }, { value: "full", label: t("appearance.full") }, { value: "lite", label: t("appearance.lite") }]} />
      <SegmentedControl<Locale> label={t("appearance.language")} value={locale} onChange={(l) => { void setLocale(l); }}
        options={[{ value: "en", label: "English", lang: "en" }, { value: "ne", label: "नेपाली", lang: "ne" }]} />
    </div>
  );
}
