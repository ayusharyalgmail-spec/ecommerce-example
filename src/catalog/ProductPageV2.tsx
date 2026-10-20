import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge, Button, buttonStyles, ChevronLeft, ChevronRight, Dialog, EmptyState, GlassPanel, Heart, IconButton, ImageOff, MessageCircle, Minus, Plus, Rating, Share2, ShoppingCart, Skeleton, Truck, toast } from "@/ui";
import { useQuery } from "@tanstack/react-query";
import { supabase, imageUrl } from "@/lib/supabase";
import { useT, pick } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useCategories } from "@/lib/queries";
import { formatNpr } from "@/lib/money";
import { toggleWishlist } from "@/lib/api";
import { useTitle } from "@/components/ui";
import { CARD_COLUMNS, type CardProduct } from "@/components/Product";
import { recordView } from "./data";
import { CardGrid, ProductCardV2 } from "./ProductCardV2";
import { PAGE_X } from "./layout";

type Img = { id: string; storage_path: string; alt_en: string | null; alt_ne: string | null; is_primary: boolean; sort_order: number; width: number | null; height: number | null; blur_color: string | null };

function Gallery({ images, name, locale }: { images: Img[]; name: string; locale: "en" | "ne" }) {
  const { t } = useT();
  const track = useRef<HTMLUListElement>(null);
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const go = (n: number, smooth = true) => {
    const el = track.current; if (!el) return;
    const k = (n + images.length) % images.length;
    el.scrollTo({ left: k * el.clientWidth, behavior: smooth && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "auto" });
    setI(k);
  };
  useEffect(() => {
    if (!zoom) return;
    const key = (e: KeyboardEvent) => { if (e.key === "ArrowLeft") go(i - 1, false); else if (e.key === "ArrowRight") go(i + 1, false); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  const alt = (m: Img) => pick(locale, m.alt_en, m.alt_ne) || name;
  if (!images.length) return <div className="flex aspect-square items-center justify-center rounded-xl bg-surface-2 text-muted"><ImageOff aria-hidden size={56} strokeWidth={1.25} /></div>;
  return (
    <div className="space-y-3">
      <div className="relative">
        {/* A scroll container must be focusable so keyboard users can scroll it. */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
        <ul ref={track} tabIndex={0} aria-label={t("pdp.gallery")} onScroll={(e) => { const el = e.currentTarget; setI(Math.round(el.scrollLeft / el.clientWidth)); }}
          className="m-0 flex list-none snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-xl p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((m, n) => (
            <li key={m.id} className="aspect-square w-full shrink-0 snap-center" style={{ background: m.blur_color ?? "var(--surface-2)" }}>
              <button type="button" className="block size-full" aria-label={t("pdp.zoom")} onClick={() => setZoom(true)}>
                <img src={imageUrl(m.storage_path)!} alt={alt(m)} width={m.width ?? 1200} height={m.height ?? 1200}
                  fetchPriority={n === 0 ? "high" : "auto"} loading={n === 0 ? "eager" : "lazy"} decoding="async" onLoad={() => setLoaded((s) => ({ ...s, [m.id]: true }))}
                  className={`size-full object-contain transition-opacity duration-300 ${loaded[m.id] ? "opacity-100" : "opacity-0"}`} />
              </button>
            </li>
          ))}
        </ul>
        {images.length > 1 && (
          <div className="absolute inset-x-1 top-1/2 hidden -translate-y-1/2 justify-between md:flex">
            <IconButton variant="glass" icon={ChevronLeft} label={t("common.previous")} onClick={() => go(i - 1)} />
            <IconButton variant="glass" icon={ChevronRight} label={t("common.next")} onClick={() => go(i + 1)} />
          </div>
        )}
      </div>
      {images.length > 1 && (
        <>
          <p role="status" className="sr-only-text">{i + 1} / {images.length}</p>
          <ul className="m-0 flex list-none gap-2 overflow-x-auto p-0">
            {images.map((m, n) => (
              <li key={m.id}>
                <button type="button" aria-label={t("pdp.show_image", { n: n + 1 })} aria-current={n === i} onClick={() => go(n)}
                  className={`relative block size-16 overflow-hidden rounded-md border-2 before:absolute before:-inset-1 before:content-[''] ${n === i ? "border-brand-strong" : "border-line"}`}
                  style={{ background: m.blur_color ?? "var(--surface-2)" }}>
                  <img src={imageUrl(m.storage_path)!} alt="" width={64} height={64} loading="lazy" className="size-full object-cover" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <Dialog open={zoom} onOpenChange={setZoom} title={name} closeLabel={t("common.close")} className="max-w-3xl">
        <div className="max-h-[70dvh] overflow-auto [touch-action:pinch-zoom_pan-x_pan-y]">
          <img src={imageUrl(images[i].storage_path)!} alt={alt(images[i])} className="mx-auto max-h-[70dvh] w-auto max-w-none" style={{ maxWidth: "100%" }} />
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex justify-between">
            <Button variant="secondary" leadingIcon={ChevronLeft} onClick={() => go(i - 1, false)}>{t("common.previous")}</Button>
            <Button variant="secondary" trailingIcon={ChevronRight} onClick={() => go(i + 1, false)}>{t("common.next")}</Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}

function RatingSummary({ avg, count, dist }: { avg: number; count: number; dist: number[] }) {
  const { t } = useT();
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div>
        <p className="m-0 text-4xl font-bold">{avg.toFixed(1)}</p>
        <Rating value={avg} count={count} size={18} label={t("rating.label", { value: avg.toFixed(1), count })} />
      </div>
      <ul className="m-0 min-w-[12rem] flex-1 list-none space-y-1 p-0" aria-label={t("pdp.distribution")}>
        {[5, 4, 3, 2, 1].map((s) => {
          const n = dist[s - 1] ?? 0;
          return (
            <li key={s} className="flex items-center gap-2 text-sm">
              <span className="w-12 shrink-0">{t("pdp.stars_n", { n: s })}</span>
              <span aria-hidden className="h-2 flex-1 overflow-hidden rounded-pill bg-surface-2"><span className="block h-full bg-brand-strong" style={{ width: `${count ? (n / count) * 100 : 0}%` }} /></span>
              <span className="w-8 text-right text-muted">{n}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function ProductPageV2() {
  const { slug } = useParams();
  const { t, locale } = useT();
  const { user, perms } = useAuth();
  const canManage = perms.has("products.manage");
  const { add } = useCart();
  const cats = useCategories().data;
  const [qty, setQty] = useState(1);
  const [wish, setWish] = useState<boolean | null>(null);

  const q = useQuery({
    queryKey: ["pdp", slug, user?.id ?? null], staleTime: 60_000,
    queryFn: async () => {
      const { data: p } = await supabase.from("products")
        .select("*, product_images(id,storage_path,alt_en,alt_ne,is_primary,sort_order,width,height,blur_color)").eq("slug", slug!).eq("status", "published").maybeSingle();
      if (!p) return null;
      const [r, ratings, rel, st, w] = await Promise.all([
        supabase.from("reviews").select("id,rating,title,body,created_at,order_item_id,author_name").eq("product_id", p.id).eq("status", "approved").order("created_at", { ascending: false }).limit(10),
        supabase.from("reviews").select("rating").eq("product_id", p.id).eq("status", "approved").limit(1000),
        supabase.from("products").select(CARD_COLUMNS).eq("status", "published").eq("category_id", p.category_id ?? "00000000-0000-0000-0000-000000000000").neq("id", p.id).limit(4),
        supabase.from("store_settings").select("whatsapp_number").single(),
        user ? supabase.from("wishlists").select("product_id").eq("user_id", user.id).eq("product_id", p.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      const dist = [0, 0, 0, 0, 0];
      (ratings.data ?? []).forEach((x) => { if (x.rating >= 1 && x.rating <= 5) dist[x.rating - 1]++; });
      return { p, reviews: r.data ?? [], dist, related: (rel.data ?? []) as unknown as CardProduct[], wa: st.data?.whatsapp_number as string | null, wished: !!w.data };
    },
  });
  const d = q.data;
  const viewed = d?.p.id;
  useEffect(() => { if (viewed) recordView(viewed); }, [viewed]);
  useTitle(d ? pick(locale, d.p.name_en, d.p.name_ne) : undefined);

  if (q.isLoading) return <main className={`${PAGE_X} grid gap-6 py-4 md:grid-cols-2`}><Skeleton variant="image" /><Skeleton lines={4} /></main>;
  if (!d) return <main className={`${PAGE_X} py-8`}><EmptyState icon={ImageOff} title={t("notfound.title")} action={<Link to="/shop" className="font-semibold underline">{t("nav.shop")}</Link>} /></main>;

  const { p, reviews, dist, related, wa } = d;
  const name = pick(locale, p.name_en, p.name_ne) ?? p.name_en;
  const desc = pick(locale, p.description_en, p.description_ne);
  const available = p.stock_quantity - p.reserved_quantity;
  const out = available <= 0;
  const images = ([...p.product_images] as Img[]).sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
  const avg = p.review_count ? p.rating_sum / p.review_count : 0;
  const price = p.discount_price_paisa ?? p.price_paisa;
  const sale = p.discount_price_paisa != null && p.discount_price_paisa < p.price_paisa;
  const cat = cats?.find((c) => c.id === p.category_id);
  const href = window.location.href;
  const shareText = encodeURIComponent(`${name} - ${formatNpr(price)} ${href}`);
  const waNum = wa?.replace(/\D/g, "");
  const wished = wish ?? d.wished;
  const addToCart = () => { add(p.id, qty); toast.success(t("product.added_toast")); };
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: name, text: `${name} - ${formatNpr(price)}`, url: href }); } catch { /* cancelled */ } }
    else window.open(`https://wa.me/?text=${shareText}`, "_blank", "noopener,noreferrer");
  };

  return (
    <main className={`${PAGE_X} space-y-8 py-4 pb-32 md:pb-8`}>
      <nav aria-label={t("pdp.breadcrumb")}>
        <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0 text-sm text-muted">
          <li><Link to="/" className="inline-flex min-h-12 items-center text-ink underline">{t("nav.home")}</Link></li>
          {cat && <li className="flex items-center gap-1"><ChevronRight aria-hidden size={14} /><Link to={`/shop?category=${cat.slug}`} className="inline-flex min-h-12 items-center text-ink underline">{pick(locale, cat.name_en, cat.name_ne)}</Link></li>}
          <li aria-current="page" className="flex items-center gap-1"><ChevronRight aria-hidden size={14} /><span className="line-clamp-1">{name}</span></li>
        </ol>
      </nav>

      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        <Gallery images={images} name={name} locale={locale} />
        <div className="space-y-4">
          {p.review_count > 0 && <Rating value={avg} count={p.review_count} size={18} label={t("rating.label", { value: avg.toFixed(1), count: p.review_count })} />}
          <h1 className="m-0 text-3xl font-bold">{name}</h1>
          <p className="m-0 flex flex-wrap items-baseline gap-x-3">
            <span className="text-3xl font-bold">{formatNpr(price)}</span>
            {sale && <s className="text-lg text-muted"><span className="sr-only-text">{t("card.was")} </span>{formatNpr(p.price_paisa)}</s>}
            {sale && <Badge tone="danger" icon={false}>{pick(locale, p.discount_label_en, p.discount_label_ne) || t("card.off", { n: Math.round((1 - price / p.price_paisa) * 100) })}</Badge>}
          </p>
          <p className="m-0 flex flex-wrap items-center gap-2">
            {out ? <Badge tone="danger">{t("product.out")}</Badge>
              : available < p.low_stock_threshold ? <Badge tone="warning">{t("product.low", { n: available })}</Badge>
              : <Badge tone="success">{t("product.in_stock", { n: available })}</Badge>}
            {p.units_sold > 0 && <span className="text-sm text-muted">{t("product.units_sold", { n: p.units_sold })}</span>}
          </p>
          <p className="m-0 flex items-center gap-2 text-sm"><Truck aria-hidden size={18} strokeWidth={1.75} />{t("trust.delivery")} · {t("trust.cod")}</p>

          {canManage && (
            <div className="space-y-2 rounded-lg border border-line bg-surface-2 p-3">
              <p className="m-0 text-sm font-semibold">{t("admin.staff_view")}</p>
              <div className="flex flex-wrap gap-2">
                <Link to={`/admin/products/${p.id}`} className={buttonStyles({ variant: "primary" })}>{t("admin.edit_product")}</Link>
                <Link to="/admin/orders" className={buttonStyles({ variant: "secondary" })}>{t("admin.orders")}</Link>
              </div>
            </div>
          )}
          <div className={`hidden space-y-3 ${canManage ? "" : "md:block"}`}>
            {!out && (
              <div className="flex items-center gap-2" role="group" aria-label={t("product.qty")}>
                <IconButton variant="secondary" icon={Minus} label={t("pdp.less")} disabled={qty <= 1} onClick={() => setQty((n) => Math.max(1, n - 1))} />
                <span aria-live="polite" className="min-w-10 text-center text-lg font-semibold">{qty}</span>
                <IconButton variant="secondary" icon={Plus} label={t("pdp.more")} disabled={qty >= Math.min(99, available)} onClick={() => setQty((n) => Math.min(Math.min(99, available), n + 1))} />
              </div>
            )}
            <div className="flex gap-2">
              <Button size="lg" className="flex-1" disabled={out} leadingIcon={ShoppingCart} onClick={addToCart}>{out ? t("product.out") : t("product.add")}</Button>
              <Button size="lg" variant="secondary" aria-pressed={wished} leadingIcon={Heart} onClick={async () => { const r = await toggleWishlist(p.id); if (r === "login") window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`); else setWish(r); }}>
                {wished ? t("wish.saved") : t("wish.add")}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" leadingIcon={Share2} onClick={() => void share()}>{t("pdp.share")}</Button>
            {waNum && <a className="inline-flex min-h-12 items-center gap-2 rounded-md border border-line-strong px-4 font-semibold text-ink no-underline" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${waNum}?text=${encodeURIComponent(`${name} ${href}`)}`}><MessageCircle aria-hidden size={20} strokeWidth={1.75} />{t("pdp.ask")}</a>}
          </div>
          {desc && <p className="m-0 whitespace-pre-line pt-2">{desc}</p>}
        </div>
      </div>

      <section aria-labelledby="rev" className="space-y-4">
        <h2 id="rev" className="m-0 text-2xl font-bold">{t("product.reviews")}</h2>
        {p.review_count > 0 && <RatingSummary avg={avg} count={p.review_count} dist={dist} />}
        {reviews.length ? (
          <ul className="m-0 list-none space-y-3 p-0">
            {reviews.map((r) => {
              const fn = r.author_name?.trim().split(/\s+/).filter(Boolean) ?? [];
              const author = fn.length ? `${fn[0][0]}. ${fn.length > 1 ? fn[fn.length - 1] : ""}` : "—";
              return (
                <li key={r.id} className="rounded-lg border border-line bg-surface p-4">
                  <p className="m-0 flex flex-wrap items-center gap-2"><Rating value={r.rating} label={t("rating.stars", { value: r.rating })} /><span className="font-semibold">{r.title}</span></p>
                  <p className="m-0 mt-1">{r.body}</p>
                  <p className="m-0 mt-2 flex items-center gap-2 text-sm text-muted">{author} {r.order_item_id && <Badge tone="success">{t("product.verified")}</Badge>}</p>
                </li>
              );
            })}
          </ul>
        ) : <p className="m-0 text-muted">{t("product.no_reviews")}</p>}
      </section>

      {!!related.length && (
        <section aria-labelledby="rel" className="space-y-3">
          <h2 id="rel" className="m-0 text-2xl font-bold">{t("product.related")}</h2>
          <CardGrid>{related.map((r) => <ProductCardV2 key={r.id} p={r} locale={locale} />)}</CardGrid>
        </section>
      )}

      {/* Sticky buy bar: compact only, floats above the bottom nav. Glass allowed (floats), ink text only. */}
      {!canManage && <GlassPanel shape="dialog" className="fixed inset-x-3 z-30 flex items-center gap-3 p-2 pl-4 md:hidden" style={{ bottom: "calc(84px + var(--safe-bottom))" }}>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-lg font-bold text-ink">{formatNpr(price)}</p>
          {sale && <s className="text-sm text-ink">{formatNpr(p.price_paisa)}</s>}
        </div>
        <Button disabled={out} leadingIcon={ShoppingCart} onClick={addToCart}>{out ? t("product.out") : t("product.add")}</Button>
      </GlassPanel>}
    </main>
  );
}
