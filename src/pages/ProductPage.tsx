import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { recordView } from "@/catalog/data";
import { ImageOff, Rating } from "@/ui";
import { supabase, imageUrl } from "@/lib/supabase";
import { useT, pick } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { formatNpr } from "@/lib/money";
import { useQuery } from "@/lib/useQuery";
import { AddToCart, WishlistButton, CARD_COLUMNS, ProductCard, type CardProduct } from "@/components/Product";
import { Loading, useTitle } from "@/components/ui";

export default function ProductPage() {
  const { slug } = useParams();
  const { t, locale } = useT();
  const { user } = useAuth();

  const { data, loading } = useQuery(async () => {
    const { data: p } = await supabase.from("products")
      .select("*, product_images(id,storage_path,alt_en,alt_ne,is_primary,sort_order)").eq("slug", slug!).eq("status", "published").maybeSingle();
    if (!p) return null;
    const [r, rel, st, w] = await Promise.all([
      supabase.from("reviews").select("id,rating,title,body,created_at,order_item_id,author_name").eq("product_id", p.id).eq("status", "approved").order("created_at", { ascending: false }).limit(10),
      supabase.from("products").select(CARD_COLUMNS).eq("status", "published").eq("category_id", p.category_id ?? "00000000-0000-0000-0000-000000000000").neq("id", p.id).limit(4),
      supabase.from("store_settings").select("whatsapp_number").single(),
      user ? supabase.from("wishlists").select("product_id").eq("user_id", user.id).eq("product_id", p.id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    return { p, reviews: r.data ?? [], related: (rel.data ?? []) as CardProduct[], wa: st.data?.whatsapp_number as string | null, wished: !!w.data };
  }, [slug, user?.id]);

  const viewedId = data?.p?.id;
  useEffect(() => { if (viewedId) recordView(viewedId); }, [viewedId]);
  useTitle(data?.p ? pick(locale, data.p.name_en, data.p.name_ne) : undefined);
  if (loading && data === undefined) return <Loading />;
  if (!data) return <main className="container-page py-16 text-center"><h1 className="text-2xl font-bold">404</h1></main>;

  const { p, reviews, related, wa, wished } = data;
  const name = pick(locale, p.name_en, p.name_ne);
  const desc = pick(locale, p.description_en, p.description_ne);
  const available = p.stock_quantity - p.reserved_quantity;
  type Img = { id: string; storage_path: string; alt_en: string | null; alt_ne: string | null; is_primary: boolean; sort_order: number };
  const images = ([...p.product_images] as Img[]).sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
  const avg = p.review_count ? p.rating_sum / p.review_count : 0;
  const shareText = encodeURIComponent(`${name} - ${formatNpr(p.discount_price_paisa ?? p.price_paisa)} ${window.location.href}`);
  const waNum = wa?.replace(/\D/g, "");

  return (
    <main className="container-page grid gap-6 md:grid-cols-2">
      <div className="space-y-2">
        <div className="aspect-square overflow-hidden rounded-xl bg-bg3">
          {images[0] ? <img src={imageUrl(images[0].storage_path)!} alt={pick(locale, images[0].alt_en, images[0].alt_ne) || name} className="h-full w-full object-cover" />
            : <div className="flex h-full items-center justify-center text-muted" aria-hidden><ImageOff size={56} strokeWidth={1.25} /></div>}
        </div>
        {images.length > 1 && (
          <ul className="m-0 flex list-none gap-2 overflow-x-auto p-0">
            {images.slice(1).map((i) => <li key={i.id}><img src={imageUrl(i.storage_path)!} alt={name} loading="lazy" className="h-20 w-20 rounded-lg object-cover" /></li>)}
          </ul>
        )}
      </div>

      <div className="space-y-3">
        {p.review_count > 0 && <Rating value={avg} count={p.review_count} size={18} label={t("rating.label", { value: avg.toFixed(1), count: p.review_count })} />}
        <h1 className="m-0 text-3xl font-bold">{name}</h1>
        <p className="m-0 text-2xl font-bold">
          {formatNpr(p.discount_price_paisa ?? p.price_paisa)}
          {p.discount_price_paisa && <span className="muted ml-2 text-base font-normal line-through">{formatNpr(p.price_paisa)}</span>}
        </p>
        {p.discount_price_paisa && p.discount_label_en && <span className="badge badge-ok">{pick(locale, p.discount_label_en, p.discount_label_ne)}</span>}
        <p className="m-0 text-sm">
          {available <= 0 ? <span className="badge badge-err">{t("product.out")}</span>
            : available < p.low_stock_threshold ? <span className="badge badge-warn">{t("product.low", { n: available })}</span>
            : <span className="badge badge-ok">{t("product.in_stock", { n: available })}</span>}
          {p.units_sold > 0 && <span className="muted ml-2">{t("product.units_sold", { n: p.units_sold })}</span>}
        </p>
        <AddToCart productId={p.id} available={available} withQty />
        <WishlistButton productId={p.id} initial={wished} />
        {waNum && <a className="btn btn-secondary w-full" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${waNum}?text=${shareText}`}>{t("common.contact")}</a>}
        <a className="btn btn-secondary w-full" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${shareText}`}>{t("product.share")}</a>
        {desc && <p className="whitespace-pre-line pt-2">{desc}</p>}
      </div>

      <section className="md:col-span-2" aria-labelledby="rev">
        <h2 id="rev" className="mb-3 text-2xl font-semibold">{t("product.reviews")}</h2>
        {reviews.length ? (
          <ul className="m-0 list-none space-y-3 p-0">
            {reviews.map((r) => {
              const fn = r.author_name?.trim().split(/\s+/).filter(Boolean) ?? [];
              const author = fn.length ? `${fn[0][0]}. ${fn.length > 1 ? fn[fn.length - 1] : ""}` : "—";
              return (
                <li key={r.id} className="card">
                  <p className="m-0 flex flex-wrap items-center gap-2"><Rating value={r.rating} label={t("rating.stars", { value: r.rating })} /> <span className="font-medium">{r.title}</span></p>
                  <p className="m-0">{r.body}</p>
                  <p className="muted m-0 text-xs">{author} {r.order_item_id && <span className="badge badge-ok ml-2">{t("product.verified")}</span>}</p>
                </li>
              );
            })}
          </ul>
        ) : <p className="muted">{t("product.no_reviews")}</p>}
      </section>

      {!!related.length && (
        <section className="md:col-span-2" aria-labelledby="rel">
          <h2 id="rel" className="mb-3 text-2xl font-semibold">{t("product.related")}</h2>
          <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 lg:grid-cols-4">{related.map((r) => <ProductCard key={r.id} p={r} locale={locale} />)}</ul>
        </section>
      )}
    </main>
  );
}
