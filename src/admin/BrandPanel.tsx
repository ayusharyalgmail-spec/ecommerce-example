import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, Badge, Button, Card, Field, Input, ShoppingCart, toast } from "@/ui";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { invalidateShared, useStoreSettings } from "@/lib/queries";
import { deriveBrand } from "@/theme/brand";

/** Brand colour with a live preview and the same contrast derivation the storefront applies (ThemeProvider). */
export function BrandPanel() {
  const { t } = useT();
  const qc = useQueryClient();
  const saved = useStoreSettings().data?.brand?.primary ?? "";
  const [edit, setEdit] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const value = edit ?? saved;
  const result = value ? deriveBrand(value) : null;
  const invalid = !!value && !result;

  async function save() {
    setBusy(true);
    const { error } = await supabase.from("store_settings").update({ brand: value ? { primary: result?.brand ?? value } : {} }).eq("id", 1);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("common.saved")); setEdit(null);
    void invalidateShared(qc, "settings");
  }

  return (
    <section aria-labelledby="sf-brand" className="space-y-3">
      <h2 id="sf-brand" className="m-0 text-2xl font-bold">{t("admin.brand")}</h2>
      <Card className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <Field label={t("admin.brand.color")} hint={t("admin.brand.hint")} error={invalid ? t("admin.brand.invalid") : undefined}>
            {(a) => <Input {...a} value={value} onChange={(e) => setEdit(e.target.value)} placeholder="#F5A623" maxLength={7} className="w-40" />}
          </Field>
          <Field label={t("admin.brand.pick")}>{(a) => <input {...a} type="color" value={result?.brand ?? "#f5a623"} onChange={(e) => setEdit(e.target.value.toUpperCase())} className="size-12 cursor-pointer rounded-md border border-line-strong bg-surface p-1" />}</Field>
        </div>
        {result?.warning && <Alert tone="warning">{result.warning}</Alert>}
        {result && !result.warning && <Alert tone="success">{t("admin.brand.ok", { ratio: result.ratio.toFixed(1) })}</Alert>}
        {result && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line p-3" style={{ ["--brand" as string]: result.brand, ["--on-brand" as string]: result.onBrand, ["--brand-strong" as string]: result.strongLight }}>
            <span className="text-sm font-semibold text-muted">{t("admin.preview")}</span>
            <Button leadingIcon={ShoppingCart}>{t("product.add")}</Button>
            <Badge icon={false} className="border-2 border-brand-strong">{t("home.deals")}</Badge>
          </div>
        )}
        <div className="flex gap-2">
          <Button loading={busy} disabled={invalid || edit === null} onClick={() => void save()}>{t("admin.save")}</Button>
          {edit !== null && <Button variant="ghost" onClick={() => setEdit(null)}>{t("common.cancel")}</Button>}
        </div>
      </Card>
    </section>
  );
}
