import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, buttonStyles, ChevronLeft, ChevronRight, Field, ImageOff, Input, SegmentedControl, Select, Skeleton, Star, Textarea, Trash2, IconButton, Upload, cn, toast } from "@/ui";
import { supabase, imageUrl } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { useFeature } from "@/platform/TenantContext";
import { adjustStock, deleteProductImage, saveProduct, setPrimaryImage, swapImageOrder, uploadProductImage } from "@/lib/api";
import { paisaToRupees } from "@/lib/money";
import { useTitle } from "@/components/ui";
import { ProductCard } from "@/catalog/ProductCard";
import type { CardProduct } from "@/components/Product";

type Img = { id: string; storage_path: string; is_primary: boolean; sort_order: number };
type Form = Record<"name_en" | "name_ne" | "description_en" | "description_ne" | "price" | "discount_price" | "discount_label_en" | "discount_label_ne" | "sku" | "category_id" | "stock" | "status" | "min_purchase_qty", string>;
const EMPTY: Form = { name_en: "", name_ne: "", description_en: "", description_ne: "", price: "", discount_price: "", discount_label_en: "", discount_label_ne: "", sku: "", category_id: "", stock: "0", status: "draft", min_purchase_qty: "1" };
const DRAFT = "admin.product.draft";

/** One titled group of fields (basics, pricing, organisation). */
function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
  <section className="rounded-lg border border-line bg-surface p-4 shadow-[var(--e1)] sm:p-6">
    <h2 className="m-0 text-base font-bold">{title}</h2>
    {hint && <p className="m-0 mt-0.5 text-sm text-muted">{hint}</p>}
    <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
  </section>
  );
}

export default function ProductEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { t, locale } = useT();
  const minOn = useFeature("min_order_qty");
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [delta, setDelta] = useState("");
  useTitle(id ? t("admin.edit") : t("admin.new_product"));

  const q = useQuery({
    queryKey: ["admin", "product", id ?? "new"], staleTime: 0,
    queryFn: async () => {
      const [p, c] = await Promise.all([
        id ? supabase.from("products").select("*, product_images(id,storage_path,is_primary,sort_order)").eq("id", id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from("categories").select("id,name_en").order("sort_order"),
      ]);
      return { p: p.data, cats: c.data ?? [] };
    },
  });
  const p = q.data?.p;
  const initial = useMemo<Form>(() => {
    if (p) return { name_en: p.name_en, name_ne: p.name_ne ?? "", description_en: p.description_en ?? "", description_ne: p.description_ne ?? "", price: paisaToRupees(p.price_paisa), discount_price: p.discount_price_paisa ? paisaToRupees(p.discount_price_paisa) : "", discount_label_en: p.discount_label_en ?? "", discount_label_ne: p.discount_label_ne ?? "", sku: p.sku ?? "", category_id: p.category_id ?? "", stock: "0", status: p.status, min_purchase_qty: String((p as { min_purchase_qty?: number }).min_purchase_qty ?? 1) };
    try { return { ...EMPTY, ...JSON.parse(sessionStorage.getItem(DRAFT) ?? "{}") }; } catch { return EMPTY; }
  }, [p]);
  const [edits, setEdits] = useState<Partial<Form>>({});
  const f: Form = { ...initial, ...edits };
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setEdits((x) => ({ ...x, [k]: e.target.value }));
  // Autosave: a new product's draft survives refresh and an accidental navigation (this tab only).
  useEffect(() => { if (!id) { try { sessionStorage.setItem(DRAFT, JSON.stringify(f)); } catch { /* blocked */ } } });

  if (q.isLoading) return <main className="space-y-3"><Skeleton variant="row" className="h-40" /><Skeleton variant="row" className="h-40" /></main>;
  if (id && !p) return <main className="space-y-3"><h1 className="m-0 text-title font-bold">{t("editor.not_found")}</h1><Link to="/admin/products" className={buttonStyles({ variant: "secondary" })}>{t("editor.back")}</Link></main>;
  const images = ([...(p?.product_images ?? [])] as Img[]).sort((a, b) => a.sort_order - b.sort_order);
  const reload = () => void qc.invalidateQueries({ queryKey: ["admin", "product", id ?? "new"] });

  const validate = () => {
    const e: Partial<Record<keyof Form, string>> = {};
    if (!f.name_en.trim()) e.name_en = t("admin.v.name");
    const price = Number(f.price);
    if (!(price > 0)) e.price = t("admin.v.price");
    if (f.discount_price && !(Number(f.discount_price) < price)) e.discount_price = t("admin.v.discount");
    setErrors(e);
    return !Object.keys(e).length;
  };
  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setBusy(true);
    const r = await saveProduct(f, id);
    setBusy(false);
    if (r.error) { toast.error(r.error); return; }
    try { sessionStorage.removeItem(DRAFT); } catch { /* blocked */ }
    toast.success(t("common.saved"));
    if (!id) nav(`/admin/products/${r.id}`, { replace: true }); else { setEdits({}); reload(); void qc.invalidateQueries({ queryKey: ["admin", "products"] }); }
  };

  async function upload(file0: File) {
    setBusy(true);
    const r = await uploadProductImage(id, file0);
    if (r.ok) { toast.success(t("img.done")); reload(); }
    else { if (r.detail) console.warn("[image upload]", r.code, r.detail); toast.error(t(`img.${r.code}`)); }
    setBusy(false);
  }
  const run = async (op: () => Promise<string | null>) => {
    setBusy(true);
    const err = await op();
    if (err) { console.warn("[image op]", err); toast.error(t("img.op_failed")); }
    setBusy(false); reload();
  };
  const move = (i: number, dir: -1 | 1) => { const a = images[i], b = images[i + dir]; if (a && b) void run(() => swapImageOrder(a, b)); };
  const makePrimary = (img: Img) => run(() => setPrimaryImage(id!, img.id));


  const preview: CardProduct = {
    id: p?.id ?? "preview", slug: p?.slug ?? "preview", name_en: f.name_en || t("admin.preview_name"), name_ne: f.name_ne || null,
    price_paisa: Math.round(Number(f.price || 0) * 100) || 100, discount_price_paisa: f.discount_price ? Math.round(Number(f.discount_price) * 100) : null,
    discount_label_en: f.discount_label_en, discount_label_ne: f.discount_label_ne,
    stock_quantity: p?.stock_quantity ?? Number(f.stock || 0), reserved_quantity: p?.reserved_quantity ?? 0, low_stock_threshold: p?.low_stock_threshold ?? 5,
    rating_sum: p?.rating_sum ?? 0, review_count: p?.review_count ?? 0, product_images: images,
  };

  const primary = images.find((i) => i.is_primary) ?? images[0];

  return (
    <main className="space-y-5 pb-28">
      <header className="space-y-2">
        <Link to="/admin/products" className="inline-flex min-h-10 items-center gap-1 rounded-sm text-sm font-semibold text-muted no-underline hover-fine:hover:text-ink"><ChevronLeft aria-hidden size={16} />{t("admin.products")}</Link>
        <h1 className="m-0 text-title font-bold">{p ? p.name_en : t("admin.new_product")}</h1>
      </header>
      {!id && Object.keys(edits).length > 0 && <Alert tone="info">{t("admin.draft_kept")}</Alert>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <form id="product-form" onSubmit={(e) => void save(e)} noValidate className="space-y-5">
          <Section title={t("editor.basics")} hint={t("editor.basics_hint")}>
            <Field label={t("admin.name_en")} required error={errors.name_en}>{(a) => <Input {...a} value={f.name_en} onChange={set("name_en")} maxLength={200} />}</Field>
            <Field label={t("admin.name_ne")}>{(a) => <Input {...a} lang="ne" value={f.name_ne} onChange={set("name_ne")} />}</Field>
            <Field label={t("admin.desc_en")}>{(a) => <Textarea {...a} rows={4} value={f.description_en} onChange={set("description_en")} />}</Field>
            <Field label={t("admin.desc_ne")}>{(a) => <Textarea {...a} lang="ne" rows={4} value={f.description_ne} onChange={set("description_ne")} />}</Field>
          </Section>

          <Section title={t("editor.pricing")} hint={t("editor.pricing_hint")}>
            <Field label={t("admin.price")} required error={errors.price}>{(a) => <Input {...a} type="number" inputMode="decimal" min="1" step="0.01" value={f.price} onChange={set("price")} />}</Field>
            <Field label={t("admin.discount_price")} hint={t("editor.sale_hint")} error={errors.discount_price}>{(a) => <Input {...a} type="number" inputMode="decimal" min="0" step="0.01" value={f.discount_price} onChange={set("discount_price")} />}</Field>
            <Field label={t("admin.discount_label_en")}>{(a) => <Input {...a} value={f.discount_label_en} onChange={set("discount_label_en")} />}</Field>
            <Field label={t("admin.discount_label_ne")}>{(a) => <Input {...a} lang="ne" value={f.discount_label_ne} onChange={set("discount_label_ne")} />}</Field>
          </Section>

          <Section title={t("editor.organise")}>
            <Field label={t("admin.category")}>{(a) => <Select {...a} value={f.category_id} onChange={set("category_id")}><option value="">{t("dash.uncategorised")}</option>{q.data?.cats.map((c) => <option key={c.id} value={c.id}>{c.name_en}</option>)}</Select>}</Field>
            <Field label={t("admin.sku")}>{(a) => <Input {...a} value={f.sku} onChange={set("sku")} />}</Field>
            {!p && <Field label={t("editor.opening_stock")}>{(a) => <Input {...a} type="number" inputMode="numeric" min="0" value={f.stock} onChange={set("stock")} />}</Field>}
            {minOn && <Field label={t("admin.min_purchase_qty")} hint={t("admin.min_purchase_qty_hint")}>{(a) => <Input {...a} type="number" min="1" step="1" value={f.min_purchase_qty} onChange={set("min_purchase_qty")} />}</Field>}
            <div className="sm:col-span-2">
              <SegmentedControl<string> label={t("editor.visibility")} value={f.status} hint={t("editor.visibility_hint")}
                onChange={(v) => setEdits((x) => ({ ...x, status: v }))}
                options={[{ value: "published", label: t("products.view.published") }, { value: "draft", label: t("products.view.draft") }, { value: "archived", label: t("products.view.archived") }]} />
            </div>
          </Section>

          {p && (
            <section className="rounded-lg border border-line bg-surface p-4 shadow-[var(--e1)] sm:p-6">
              <h2 className="m-0 text-base font-bold">{t("admin.stock")}</h2>
              <p className="m-0 mt-1 text-sm text-muted">{t("editor.stock_now", { n: p.stock_quantity - p.reserved_quantity, reserved: p.reserved_quantity })}</p>
              <div className="mt-4 flex flex-wrap items-end gap-2">
                <Field label={t("admin.adjust")} hint={t("products.adjust_hint")} className="min-w-[12rem] flex-1">{(a) => <Input {...a} type="number" inputMode="numeric" value={delta} onChange={(e) => setDelta(e.target.value)} />}</Field>
                <Button variant="secondary" loading={busy} disabled={!Number(delta)} onClick={async () => {
                  setBusy(true); const e = await adjustStock(p.id, Number(delta), ""); setBusy(false);
                  if (e) toast.error(t(`err.${e}`)); else { setDelta(""); toast.success(t("products.stock_saved", { name: p.name_en })); reload(); }
                }}>{t("editor.apply_stock")}</Button>
              </div>
            </section>
          )}
        </form>

        <aside className="space-y-5 lg:sticky lg:top-20">
          <section aria-labelledby="ph" className="rounded-lg border border-line bg-surface p-4 shadow-[var(--e1)]">
            <h2 id="ph" className="m-0 text-base font-bold">{t("admin.image")}</h2>
            {!p ? (
              <p className="m-0 mt-3 rounded-md bg-surface-2 p-4 text-sm text-muted">{t("editor.photos_after_save")}</p>
            ) : (
              <>
                <div className="mt-3 aspect-square overflow-hidden rounded-md bg-well">
                  {primary ? <img src={imageUrl(primary.storage_path)!} alt="" width={480} height={480} className="size-full object-cover" />
                    : <span className="flex size-full flex-col items-center justify-center gap-2 text-muted"><ImageOff aria-hidden size={32} strokeWidth={1.4} /><span className="text-sm">{t("editor.no_photos")}</span></span>}
                </div>
                {images.length > 0 && (
                  <ul className="m-0 mt-3 grid list-none grid-cols-3 gap-2 p-0">
                    {images.map((i, n) => (
                      <li key={i.id} className="space-y-1">
                        <div className={cn("relative overflow-hidden rounded-sm border-2", i.is_primary ? "border-ink" : "border-transparent")}>
                          <img src={imageUrl(i.storage_path)!} alt="" width={120} height={120} className="aspect-square w-full object-cover" />
                          {i.is_primary && <span className="absolute left-1 top-1 rounded-pill bg-ink p-1 text-[var(--surface)]"><Star aria-label={t("admin.primary_image")} size={12} fill="currentColor" /></span>}
                        </div>
                        <div className="flex justify-between">
                          <IconButton icon={ChevronLeft} label={t("admin.move_left")} className="size-9" disabled={busy || n === 0} onClick={() => void move(n, -1)} />
                          <IconButton icon={Trash2} label={t("cart.remove")} className="size-9" disabled={busy} onClick={() => void run(() => deleteProductImage(i.id, i.storage_path, id))} />
                          <IconButton icon={ChevronRight} label={t("admin.move_right")} className="size-9" disabled={busy || n === images.length - 1} onClick={() => void move(n, 1)} />
                        </div>
                        {!i.is_primary && <button type="button" disabled={busy} onClick={() => void makePrimary(i)} className="w-full rounded-xs py-1 text-xs font-semibold text-ink underline decoration-line-strong underline-offset-2 disabled:opacity-50">{t("admin.make_primary")}</button>}
                      </li>
                    ))}
                  </ul>
                )}
                <label className={cn("mt-3 flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-line-strong px-3 py-4 text-center transition-colors hover-fine:hover:bg-surface-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]", busy && "pointer-events-none opacity-60")}>
                  <Upload aria-hidden size={20} strokeWidth={1.8} />
                  <span className="text-sm font-semibold">{t("admin.add_photo")}</span>
                  <span className="text-xs text-muted">{t("editor.photo_rules")}</span>
                  <input ref={file} type="file" accept="image/*" disabled={busy} className="sr-only-text" onChange={(e) => { const x = e.target.files?.[0]; if (x) void upload(x); if (file.current) file.current.value = ""; }} />
                </label>
                {busy && <p role="status" className="m-0 mt-2 text-sm text-muted">{t("img.uploading")}</p>}
              </>
            )}
          </section>
          <section aria-label={t("admin.preview")}>
            <p className="m-0 mb-2 text-sm font-semibold text-muted">{t("editor.preview")}</p>
            <ul className="m-0 max-w-64 list-none p-0 [&_a]:pointer-events-none [&_button]:pointer-events-none"><ProductCard p={preview} locale={locale} /></ul>
          </section>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(64px+var(--safe-bottom))] z-30 border-t border-line bg-surface px-4 py-3 shadow-[var(--e3)] md:inset-x-auto md:bottom-6 md:right-6 md:rounded-lg md:border">
        <div className="flex items-center justify-end gap-2">
          <Link to="/admin/products" className={buttonStyles({ variant: "ghost" })}>{t("common.cancel")}</Link>
          <Button type="submit" form="product-form" size="lg" loading={busy}>{id ? t("editor.save") : t("editor.create")}</Button>
        </div>
      </div>
    </main>
  );
}
