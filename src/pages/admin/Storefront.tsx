import { invalidateShared } from "@/lib/queries";
import { randomUUID } from "@/lib/uuid";
import { tenantPath } from "@/lib/tenantScope";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Card, Field, Input, Trash2, toast } from "@/ui";
import { supabase } from "@/lib/supabase";
import { useT, pick } from "@/lib/i18n";
import { toWebp } from "@/lib/image";
import { useQuery } from "@/lib/useQuery";
import { assetUrl, BANNER_COLUMNS, type Banner } from "@/catalog/data";
import { Loading, useTitle } from "@/components/ui";
import { BrandPanel } from "@/admin/BrandPanel";

type Row = Banner & { sort_order: number; is_active: boolean };

async function upload(folder: "banners" | "categories", file: File) {
  const path = tenantPath(`${folder}/${randomUUID()}.webp`);
  const { error } = await supabase.storage.from("store-assets").upload(path, await toWebp(file, 1600), { contentType: "image/webp" });
  if (error) throw new Error(error.message);
  return path;
}

/** Minimal storefront admin (Phase 3): homepage banners and category artwork. Full admin polish lands in Phase 7. */
export default function Storefront() {
  const { t, locale } = useT();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  useTitle(t("admin.storefront"));
  const banners = useQuery(async () => ((await supabase.from("banners").select(`${BANNER_COLUMNS},sort_order,is_active`).order("sort_order")).data ?? []) as Row[], []);
  const cats = useQuery(async () => (await supabase.from("categories").select("id,slug,name_en,name_ne,image_path").order("sort_order")).data ?? [], []);
  const refresh = () => { banners.reload(); cats.reload(); void invalidateShared(qc, "banners"); void invalidateShared(qc, "categories"); };
  const fail = (e: unknown) => toast.error(e instanceof Error ? e.message : t("common.error"));

  async function addBanner(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = new FormData(form);
    const file = d.get("image") as File;
    if (!file?.size) return;
    const s = (k: string) => String(d.get(k) ?? "").trim() || null;
    setBusy(true);
    try {
      const image_path = await upload("banners", file);
      const { error } = await supabase.from("banners").insert({
        title_en: s("title_en"), title_ne: s("title_ne"), subtitle_en: s("subtitle_en"), subtitle_ne: s("subtitle_ne"),
        cta_label_en: s("cta_label_en"), cta_label_ne: s("cta_label_ne"), link_url: s("link_url"),
        image_alt_en: s("image_alt_en"), image_alt_ne: s("image_alt_ne"), sort_order: Number(d.get("sort_order")) || 0, image_path,
      });
      if (error) { await supabase.storage.from("store-assets").remove([image_path]); throw new Error(error.message); }
      form.reset(); toast.success(t("common.saved")); refresh();
    } catch (err) { fail(err); } finally { setBusy(false); }
  }

  async function removeBanner(b: Row) {
    const { error } = await supabase.from("banners").delete().eq("id", b.id);
    if (error) return fail(new Error(error.message));
    await supabase.storage.from("store-assets").remove([b.image_path]);
    refresh();
  }

  async function setCategoryImage(id: string, old: string | null, file: File) {
    setBusy(true);
    try {
      const path = await upload("categories", file);
      const { error } = await supabase.from("categories").update({ image_path: path }).eq("id", id);
      if (error) throw new Error(error.message);
      if (old) await supabase.storage.from("store-assets").remove([old]);
      toast.success(t("common.saved")); refresh();
    } catch (err) { fail(err); } finally { setBusy(false); }
  }

  if (banners.loading && !banners.data) return <Loading />;
  return (
    <main className="space-y-8">
      <h1 className="m-0 text-3xl font-bold">{t("admin.storefront")}</h1>

      <BrandPanel />

      <section aria-labelledby="sf-banners" className="space-y-3">
        <h2 id="sf-banners" className="m-0 text-2xl font-bold">{t("admin.banners")}</h2>
        <p className="m-0 text-muted">{t("admin.banners.hint")}</p>
        <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
          {banners.data?.map((b) => (
            <li key={b.id}>
              <Card flush className="overflow-hidden">
                <img src={assetUrl(b.image_path)!} alt="" className="aspect-[3/1] w-full object-cover" />
                <div className="flex items-center justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="m-0 line-clamp-1 font-semibold">{pick(locale, b.title_en, b.title_ne)}</p>
                    <Badge tone={b.is_active ? "success" : "neutral"}>{b.is_active ? t("admin.active") : t("admin.hidden")}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={async () => { await supabase.from("banners").update({ is_active: !b.is_active }).eq("id", b.id); refresh(); }}>
                      {b.is_active ? t("admin.hide") : t("admin.show")}
                    </Button>
                    <Button variant="danger" size="sm" leadingIcon={Trash2} onClick={() => void removeBanner(b)}>{t("cart.remove")}</Button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>

        <Card>
          <form onSubmit={addBanner} className="grid gap-3 md:grid-cols-2">
            <h3 className="m-0 text-lg font-bold md:col-span-2">{t("admin.banner.add")}</h3>
            <Field label={t("admin.banner.title_en")} required>{(a) => <Input {...a} name="title_en" maxLength={80} />}</Field>
            <Field label={t("admin.banner.title_ne")}>{(a) => <Input {...a} name="title_ne" lang="ne" maxLength={120} />}</Field>
            <Field label={t("admin.banner.sub_en")}>{(a) => <Input {...a} name="subtitle_en" maxLength={160} />}</Field>
            <Field label={t("admin.banner.sub_ne")}>{(a) => <Input {...a} name="subtitle_ne" lang="ne" maxLength={240} />}</Field>
            <Field label={t("admin.banner.cta_en")}>{(a) => <Input {...a} name="cta_label_en" maxLength={30} />}</Field>
            <Field label={t("admin.banner.cta_ne")}>{(a) => <Input {...a} name="cta_label_ne" lang="ne" maxLength={50} />}</Field>
            <Field label={t("admin.banner.link")} hint={t("admin.banner.link_hint")}>{(a) => <Input {...a} name="link_url" placeholder="/shop?sale=1" pattern="/[^/\\].*" />}</Field>
            <Field label={t("admin.banner.order")}>{(a) => <Input {...a} name="sort_order" type="number" defaultValue={0} />}</Field>
            <Field label={t("admin.banner.alt_en")}>{(a) => <Input {...a} name="image_alt_en" maxLength={160} />}</Field>
            <Field label={t("admin.banner.alt_ne")}>{(a) => <Input {...a} name="image_alt_ne" lang="ne" maxLength={240} />}</Field>
            <Field label={t("admin.banner.image")} hint={t("admin.banner.image_hint")} required className="md:col-span-2">{(a) => <Input {...a} name="image" type="file" accept="image/*" />}</Field>
            <Button type="submit" loading={busy} className="md:col-span-2">{t("admin.save")}</Button>
          </form>
        </Card>
      </section>

      <section aria-labelledby="sf-cats" className="space-y-3">
        <h2 id="sf-cats" className="m-0 text-2xl font-bold">{t("admin.category_images")}</h2>
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {cats.data?.map((c) => (
            <li key={c.id}>
              <Card className="flex items-center gap-3">
                <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-tint">
                  {c.image_path && <img src={assetUrl(c.image_path)!} alt="" className="size-full object-cover" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="m-0 line-clamp-1 font-semibold">{pick(locale, c.name_en, c.name_ne)}</p>
                  <label className="block text-sm font-semibold underline">
                    {t("admin.category_images.change")}
                    <input type="file" accept="image/*" className="sr-only-text" disabled={busy}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) void setCategoryImage(c.id, c.image_path, f); e.target.value = ""; }} />
                  </label>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
