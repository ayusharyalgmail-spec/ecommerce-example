import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase, imageUrl } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { paisaToRupees } from "@/lib/money";
import { useQuery } from "@/lib/useQuery";
import { addProductImage, adjustStock, deleteProductImage, saveProduct } from "@/lib/api";
import { ErrorBox, Loading, OkBox, useTitle } from "@/components/ui";

type Img = { id: string; storage_path: string; is_primary: boolean; sort_order: number };

/** Downscale to max 1600px and re-encode as WebP before upload (ARCHITECTURE.md §10). */
async function toWebp(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/webp", 0.85));
}

export default function ProductEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useT();
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [delta, setDelta] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  useTitle(id ? t("admin.edit") : t("admin.new_product"));

  const { data, loading, reload } = useQuery(async () => {
    const [p, c] = await Promise.all([
      id ? supabase.from("products").select("*, product_images(id,storage_path,is_primary,sort_order)").eq("id", id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from("categories").select("id,name_en").order("sort_order"),
    ]);
    return { p: p.data, cats: c.data ?? [] };
  }, [id]);
  if (loading && !data) return <Loading />;
  const p = data?.p;
  if (id && !p) return <main><h1 className="text-2xl font-bold">404</h1></main>;
  const images = ([...(p?.product_images ?? [])] as Img[]).sort((a, b) => a.sort_order - b.sort_order);

  async function upload(f: File) {
    setMsg(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type) || f.size > 10 * 1024 * 1024) { setMsg({ ok: false, text: "JPEG/PNG/WebP only, max 10 MB" }); return; }
    setBusy(true);
    try {
      const path = `products/${id}/${crypto.randomUUID()}.webp`;
      const up = await supabase.storage.from("product-images").upload(path, await toWebp(f), { contentType: "image/webp" });
      if (up.error) throw up.error;
      const err = await addProductImage(id!, path);
      if (err) setMsg({ ok: false, text: err }); else reload();
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : t("err.UNKNOWN") }); }
    setBusy(false);
  }

  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-bold">{p ? p.name_en : t("admin.new_product")}</h1>
      {msg && (msg.ok ? <OkBox>{msg.text}</OkBox> : <ErrorBox>{msg.text}</ErrorBox>)}
      <form className="card space-y-3" onSubmit={async (e) => {
        e.preventDefault();
        const f = Object.fromEntries([...new FormData(e.currentTarget).entries()].map(([k, v]) => [k, String(v)]));
        setBusy(true);
        const r = await saveProduct(f, id);
        setBusy(false);
        if (r.error) setMsg({ ok: false, text: r.error });
        else if (!id) nav(`/admin/products/${r.id}`, { replace: true });
        else { setMsg({ ok: true, text: `✓ ${t("admin.save")}` }); reload(); }
      }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="field"><span>{t("admin.name_en")}</span><input name="name_en" required maxLength={200} defaultValue={p?.name_en} /></label>
          <label className="field"><span>{t("admin.name_ne")}</span><input name="name_ne" lang="ne" defaultValue={p?.name_ne ?? ""} /></label>
          <label className="field"><span>{t("admin.desc_en")}</span><textarea name="description_en" rows={3} defaultValue={p?.description_en ?? ""} /></label>
          <label className="field"><span>{t("admin.desc_ne")}</span><textarea name="description_ne" lang="ne" rows={3} defaultValue={p?.description_ne ?? ""} /></label>
          <label className="field"><span>{t("admin.price")}</span><input name="price" type="number" min="1" step="0.01" required defaultValue={p ? paisaToRupees(p.price_paisa) : ""} /></label>
          <label className="field"><span>{t("admin.discount_price")}</span><input name="discount_price" type="number" min="0" step="0.01" defaultValue={p?.discount_price_paisa ? paisaToRupees(p.discount_price_paisa) : ""} /></label>
          <label className="field"><span>Discount label (EN)</span><input name="discount_label_en" defaultValue={p?.discount_label_en ?? ""} /></label>
          <label className="field"><span>Discount label (NE)</span><input name="discount_label_ne" lang="ne" defaultValue={p?.discount_label_ne ?? ""} /></label>
          <label className="field"><span>{t("admin.sku")}</span><input name="sku" defaultValue={p?.sku ?? ""} /></label>
          <label className="field"><span>{t("admin.category")}</span>
            <select name="category_id" defaultValue={p?.category_id ?? ""}><option value="">—</option>{data?.cats.map((c) => <option key={c.id} value={c.id}>{c.name_en}</option>)}</select>
          </label>
          {!p && <label className="field"><span>{t("admin.stock")}</span><input name="stock" type="number" min="0" defaultValue={0} /></label>}
          <label className="field"><span>{t("admin.status")}</span>
            <select name="status" defaultValue={p?.status ?? "draft"}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select>
          </label>
        </div>
        <button className="btn btn-primary" disabled={busy}>{t("admin.save")}</button>
      </form>

      {p && (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="card space-y-3">
            <h2 className="m-0 font-semibold">{t("admin.image")}</h2>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {images.map((i) => (
                <li key={i.id} className="relative">
                  <img src={imageUrl(i.storage_path)!} alt="" className="h-24 w-24 rounded-lg object-cover" />
                  {i.is_primary && <span className="badge badge-ok absolute left-1 top-1">★</span>}
                  <button className="badge badge-err absolute right-1 top-1" aria-label="Delete" onClick={async () => { await deleteProductImage(i.id, i.storage_path); reload(); }}>✕</button>
                </li>
              ))}
            </ul>
            <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); if (file.current) file.current.value = ""; }} />
          </section>
          <section className="card space-y-3">
            <h2 className="m-0 font-semibold">{t("admin.stock")}: {p.stock_quantity} <span className="muted text-sm">(reserved {p.reserved_quantity})</span></h2>
            <input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder={t("admin.adjust")} aria-label={t("admin.adjust")} />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("admin.note")} aria-label={t("admin.note")} />
            <button className="btn btn-primary" disabled={busy || !Number(delta)} onClick={async () => {
              setBusy(true); const e = await adjustStock(p.id, Number(delta), note); setBusy(false);
              if (e) setMsg({ ok: false, text: t(`err.${e}`) }); else { setDelta(""); setNote(""); reload(); }
            }}>{t("admin.save")}</button>
          </section>
        </div>
      )}
    </main>
  );
}
