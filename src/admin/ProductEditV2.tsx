import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, ChevronLeft, ChevronRight, Field, Input, Select, Skeleton, Star, Textarea, Trash2, IconButton, toast } from "@/ui";
import { supabase, imageUrl } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { adjustStock, addProductImage, deleteProductImage, saveProduct } from "@/lib/api";
import { paisaToRupees } from "@/lib/money";
import { imageMeta, toWebp } from "@/lib/image";
import { useTitle } from "@/components/ui";
import { ProductCardV2 } from "@/catalog/ProductCardV2";
import type { CardProduct } from "@/components/Product";

type Img = { id: string; storage_path: string; is_primary: boolean; sort_order: number };
type Form = Record<"name_en" | "name_ne" | "description_en" | "description_ne" | "price" | "discount_price" | "discount_label_en" | "discount_label_ne" | "sku" | "category_id" | "stock" | "status", string>;
const EMPTY: Form = { name_en: "", name_ne: "", description_en: "", description_ne: "", price: "", discount_price: "", discount_label_en: "", discount_label_ne: "", sku: "", category_id: "", stock: "0", status: "draft" };
const DRAFT = "admin.product.draft";

export default function ProductEditV2() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { t, locale } = useT();
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
    if (p) return { name_en: p.name_en, name_ne: p.name_ne ?? "", description_en: p.description_en ?? "", description_ne: p.description_ne ?? "", price: paisaToRupees(p.price_paisa), discount_price: p.discount_price_paisa ? paisaToRupees(p.discount_price_paisa) : "", discount_label_en: p.discount_label_en ?? "", discount_label_ne: p.discount_label_ne ?? "", sku: p.sku ?? "", category_id: p.category_id ?? "", stock: "0", status: p.status };
    try { return { ...EMPTY, ...JSON.parse(sessionStorage.getItem(DRAFT) ?? "{}") }; } catch { return EMPTY; }
  }, [p]);
  const [edits, setEdits] = useState<Partial<Form>>({});
  const f: Form = { ...initial, ...edits };
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setEdits((x) => ({ ...x, [k]: e.target.value }));
  // Autosave: a new product's draft survives refresh and an accidental navigation (this tab only).
  useEffect(() => { if (!id) { try { sessionStorage.setItem(DRAFT, JSON.stringify(f)); } catch { /* blocked */ } } });

  if (q.isLoading) return <main className="space-y-3"><Skeleton variant="row" className="h-40" /><Skeleton variant="row" className="h-40" /></main>;
  if (id && !p) return <main><h1 className="m-0 text-2xl font-bold">404</h1></main>;
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
    if (!["image/jpeg", "image/png", "image/webp"].includes(file0.type) || file0.size > 10 * 1024 * 1024) { toast.error(t("pay.file_bad")); return; }
    setBusy(true);
    try {
      const path = `products/${id}/${crypto.randomUUID()}.webp`;
      const blob = await toWebp(file0);
      const up = await supabase.storage.from("product-images").upload(path, blob, { contentType: "image/webp" });
      if (up.error) throw up.error;
      const err = await addProductImage(id!, path, await imageMeta(blob));
      if (err) toast.error(err); else reload();
    } catch (e) { toast.error(e instanceof Error ? e.message : t("err.UNKNOWN")); }
    setBusy(false);
  }
  const move = async (i: number, dir: -1 | 1) => {
    const a = images[i], b = images[i + dir]; if (!a || !b) return;
    setBusy(true);
    await Promise.all([supabase.from("product_images").update({ sort_order: b.sort_order }).eq("id", a.id), supabase.from("product_images").update({ sort_order: a.sort_order }).eq("id", b.id)]);
    setBusy(false); reload();
  };
  const makePrimary = async (img: Img) => {
    setBusy(true);
    await supabase.from("product_images").update({ is_primary: false }).eq("product_id", id!);
    await supabase.from("product_images").update({ is_primary: true }).eq("id", img.id);
    setBusy(false); reload();
  };

  const preview: CardProduct = {
    id: p?.id ?? "preview", slug: p?.slug ?? "preview", name_en: f.name_en || t("admin.preview_name"), name_ne: f.name_ne || null,
    price_paisa: Math.round(Number(f.price || 0) * 100) || 100, discount_price_paisa: f.discount_price ? Math.round(Number(f.discount_price) * 100) : null,
    discount_label_en: f.discount_label_en, discount_label_ne: f.discount_label_ne,
    stock_quantity: p?.stock_quantity ?? Number(f.stock || 0), reserved_quantity: p?.reserved_quantity ?? 0, low_stock_threshold: p?.low_stock_threshold ?? 5,
    rating_sum: p?.rating_sum ?? 0, review_count: p?.review_count ?? 0, product_images: images,
  };

  return (
    <main className="space-y-4">
      <h1 className="m-0 text-3xl font-bold">{p ? p.name_en : t("admin.new_product")}</h1>
      {!id && Object.keys(edits).length > 0 && <Alert tone="info">{t("admin.draft_kept")}</Alert>}
      <div className="md:grid md:grid-cols-[1fr_16rem] md:items-start md:gap-6">
        <form onSubmit={(e) => void save(e)} noValidate className="space-y-4">
          <Card className="grid gap-3 sm:grid-cols-2">
            <Field label={t("admin.name_en")} required error={errors.name_en}>{(a) => <Input {...a} value={f.name_en} onChange={set("name_en")} maxLength={200} />}</Field>
            <Field label={t("admin.name_ne")}>{(a) => <Input {...a} lang="ne" value={f.name_ne} onChange={set("name_ne")} />}</Field>
            <Field label={t("admin.desc_en")}>{(a) => <Textarea {...a} rows={3} value={f.description_en} onChange={set("description_en")} />}</Field>
            <Field label={t("admin.desc_ne")}>{(a) => <Textarea {...a} lang="ne" rows={3} value={f.description_ne} onChange={set("description_ne")} />}</Field>
            <Field label={t("admin.price")} required error={errors.price}>{(a) => <Input {...a} type="number" min="1" step="0.01" value={f.price} onChange={set("price")} />}</Field>
            <Field label={t("admin.discount_price")} error={errors.discount_price}>{(a) => <Input {...a} type="number" min="0" step="0.01" value={f.discount_price} onChange={set("discount_price")} />}</Field>
            <Field label={t("admin.discount_label_en")}>{(a) => <Input {...a} value={f.discount_label_en} onChange={set("discount_label_en")} />}</Field>
            <Field label={t("admin.discount_label_ne")}>{(a) => <Input {...a} lang="ne" value={f.discount_label_ne} onChange={set("discount_label_ne")} />}</Field>
            <Field label={t("admin.sku")}>{(a) => <Input {...a} value={f.sku} onChange={set("sku")} />}</Field>
            <Field label={t("admin.category")}>{(a) => <Select {...a} value={f.category_id} onChange={set("category_id")}><option value="">—</option>{q.data?.cats.map((c) => <option key={c.id} value={c.id}>{c.name_en}</option>)}</Select>}</Field>
            {!p && <Field label={t("admin.stock")}>{(a) => <Input {...a} type="number" min="0" value={f.stock} onChange={set("stock")} />}</Field>}
            <Field label={t("admin.status")}>{(a) => <Select {...a} value={f.status} onChange={set("status")}><option value="draft">draft</option><option value="published">published</option><option value="archived">archived</option></Select>}</Field>
          </Card>
          <Button type="submit" size="lg" loading={busy}>{t("admin.save")}</Button>
        </form>
        <aside aria-label={t("admin.preview")} className="mt-4 md:sticky md:top-20 md:mt-0">
          <p className="m-0 mb-2 text-sm font-semibold text-muted">{t("admin.preview")}</p>
          <ul className="m-0 list-none p-0 [&_button]:pointer-events-none [&_a]:pointer-events-none"><ProductCardV2 p={preview} locale={locale} /></ul>
        </aside>
      </div>

      {p && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="space-y-3">
            <h2 className="m-0 text-lg font-bold">{t("admin.image")}</h2>
            <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3">
              {images.map((i, n) => (
                <li key={i.id} className="space-y-1">
                  <div className="relative"><img src={imageUrl(i.storage_path)!} alt="" width={160} height={160} className="aspect-square w-full rounded-md object-cover" />
                    {i.is_primary && <span className="absolute left-1 top-1 rounded-pill bg-brand p-1 text-on-brand"><Star aria-label={t("admin.primary_image")} size={14} fill="currentColor" /></span>}</div>
                  <div className="flex items-center justify-between">
                    <IconButton icon={ChevronLeft} label={t("admin.move_left")} variant="ghost" disabled={busy || n === 0} onClick={() => void move(n, -1)} />
                    <IconButton icon={ChevronRight} label={t("admin.move_right")} variant="ghost" disabled={busy || n === images.length - 1} onClick={() => void move(n, 1)} />
                    <IconButton icon={Trash2} label={t("cart.remove")} variant="ghost" disabled={busy} onClick={async () => { await deleteProductImage(i.id, i.storage_path); reload(); }} />
                  </div>
                  {!i.is_primary && <Button size="sm" variant="secondary" block disabled={busy} onClick={() => void makePrimary(i)}>{t("admin.make_primary")}</Button>}
                </li>
              ))}
            </ul>
            <Field label={t("admin.add_photo")}>{(a) => <Input {...a} ref={file} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(e) => { const x = e.target.files?.[0]; if (x) void upload(x); if (file.current) file.current.value = ""; }} />}</Field>
          </Card>
          <Card className="space-y-3">
            <h2 className="m-0 text-lg font-bold">{t("admin.stock")}: {p.stock_quantity} <span className="text-sm font-normal text-muted">({t("admin.reserved")} {p.reserved_quantity})</span></h2>
            <Field label={t("admin.adjust")}>{(a) => <Input {...a} type="number" value={delta} onChange={(e) => setDelta(e.target.value)} />}</Field>
            <Button loading={busy} disabled={!Number(delta)} onClick={async () => {
              setBusy(true); const e = await adjustStock(p.id, Number(delta), ""); setBusy(false);
              if (e) toast.error(t(`err.${e}`)); else { setDelta(""); toast.success(t("common.saved")); reload(); }
            }}>{t("admin.save")}</Button>
          </Card>
        </div>
      )}
    </main>
  );
}
