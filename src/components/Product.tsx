import { useState } from "react";
import { Check, Heart, ImageOff, Rating, toast } from "@/ui";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "@/lib/cart";
import { useT, pick, type Locale } from "@/lib/i18n";
import { formatNpr } from "@/lib/money";
import { imageUrl } from "@/lib/supabase";
import { toggleWishlist } from "@/lib/api";

export function AddToCart({ productId, available, withQty = false }: { productId: string; available: number; withQty?: boolean }) {
  const { add } = useCart();
  const { t } = useT();
  const nav = useNavigate();
  const [qty, setQty] = useState(1);
  const [done, setDone] = useState(false);
  const out = available <= 0;
  return (
    <div className="flex items-center gap-2">
      {withQty && !out && (
        <input type="number" min={1} max={Math.min(99, available)} value={qty} aria-label={t("product.qty")}
          onChange={(e) => setQty(Math.max(1, Math.min(available, Number(e.target.value) || 1)))} className="!w-20" />
      )}
      <button className="btn btn-primary flex-1" disabled={out}
        onClick={() => {
          add(productId, qty); setDone(true); setTimeout(() => setDone(false), 1500);
          toast.success(t("product.added_toast"), { action: { label: t("cart.view"), onClick: () => nav("/cart") } });
        }}>
        {out ? t("product.out") : done ? <><Check aria-hidden size={20} strokeWidth={2} /> {t("product.added")}</> : t("product.add")}
      </button>
    </div>
  );
}

export function WishlistButton({ productId, initial }: { productId: string; initial: boolean }) {
  const { t } = useT();
  const nav = useNavigate();
  const loc = useLocation();
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <button className="btn btn-secondary w-full" disabled={busy} aria-pressed={saved}
      onClick={async () => {
        setBusy(true);
        const r = await toggleWishlist(productId);
        setBusy(false);
        if (r === "login") nav(`/login?next=${encodeURIComponent(loc.pathname)}`); else setSaved(r);
      }}>
      <Heart aria-hidden size={20} strokeWidth={1.75} fill={saved ? "currentColor" : "none"} /> {saved ? t("wish.saved") : t("wish.add")}
    </button>
  );
}

export type CardProduct = {
  id: string; slug: string; name_en: string; name_ne: string | null;
  price_paisa: number; discount_price_paisa: number | null;
  stock_quantity: number; reserved_quantity: number; low_stock_threshold: number;
  rating_sum: number; review_count: number; discount_label_en?: string | null; discount_label_ne?: string | null;
  product_images?: { storage_path: string; is_primary: boolean; sort_order: number }[];
};

export const CARD_COLUMNS =
  "id,slug,name_en,name_ne,price_paisa,discount_price_paisa,discount_label_en,discount_label_ne,stock_quantity,reserved_quantity,low_stock_threshold,rating_sum,review_count,product_images(storage_path,is_primary,sort_order)";

export function primaryImage(p: Pick<CardProduct, "product_images">) {
  const imgs = [...(p.product_images ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
  return imageUrl(imgs[0]?.storage_path);
}

export function ProductCard({ p, locale }: { p: CardProduct; locale: Locale }) {
  const { t } = useT();
  const available = p.stock_quantity - p.reserved_quantity;
  const img = primaryImage(p);
  const name = pick(locale, p.name_en, p.name_ne);
  const avg = p.review_count ? p.rating_sum / p.review_count : 0;
  return (
    <li className="card m-0 flex list-none flex-col !p-0 overflow-hidden" style={{ borderRadius: "1rem" }}>
      <Link to={`/product/${p.slug}`} className="block">
        <div className="aspect-square bg-bg3">
          {img ? <img src={img} alt={name} loading="lazy" className="h-full w-full object-cover" />
            : <div className="flex h-full items-center justify-center text-muted" aria-hidden><ImageOff size={40} strokeWidth={1.25} /></div>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-4">
        {p.review_count > 0 && <Rating value={avg} count={p.review_count} size={14} label={t("rating.label", { value: avg.toFixed(1), count: p.review_count })} />}
        <Link to={`/product/${p.slug}`} className="line-clamp-2 font-medium no-underline">{name}</Link>
        <p className="m-0 font-bold">
          {formatNpr(p.discount_price_paisa ?? p.price_paisa)}
          {p.discount_price_paisa && <span className="muted ml-2 text-sm font-normal line-through">{formatNpr(p.price_paisa)}</span>}
        </p>
        {p.discount_price_paisa && p.discount_label_en && <span className="badge badge-ok w-fit">{pick(locale, p.discount_label_en, p.discount_label_ne)}</span>}
        {available <= 0 ? <span className="badge badge-err w-fit">{t("product.out")}</span>
          : available < p.low_stock_threshold ? <span className="badge badge-warn w-fit">{t("product.low", { n: available })}</span> : null}
        <div className="mt-auto pt-2"><AddToCart productId={p.id} available={available} /></div>
      </div>
    </li>
  );
}
