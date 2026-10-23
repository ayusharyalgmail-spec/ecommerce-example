import { createElement, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Badge, Settings, Heart, Plus, QtyStepper, Rating, cn, toast } from "@/ui";
import { useCart } from "@/lib/cart";
import { useT, pick, type Locale } from "@/lib/i18n";
import { formatNpr } from "@/lib/money";
import { toggleWishlist } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCategoryArt, useWishIds } from "./data";
import { demoOn } from "./demoMode";
import { categoryIcon } from "./categoryIcon";
import { primaryImage, type CardProduct } from "@/components/Product";

/** Neutral image well for products without a photo: the category's line icon, never a broken-image glyph. */
export function ProductFallback({ categoryId, size = 40, className }: { categoryId?: string | null; size?: number; className?: string }) {
  const cats = useCategoryArt().data;
  const icon = categoryIcon(cats?.find((c) => c.id === categoryId)?.slug);
  return (
    <span aria-hidden className={cn("flex size-full items-center justify-center text-[color-mix(in_oklab,var(--text-muted)_70%,var(--surface-2))]", className)}>
      {createElement(icon, { size, strokeWidth: 1.25 })}
    </span>
  );
}

/** Stock line: text plus an icon, so colour is never the only signal. */
export function StockNote({ available, low }: { available: number; low: number }) {
  const { t } = useT();
  if (available <= 0) return <Badge tone="danger" className="w-fit">{t("product.out")}</Badge>;
  if (available < low) return <Badge tone="warning" className="w-fit">{t("product.low", { n: available })}</Badge>;
  return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success"><span aria-hidden className="size-1.5 rounded-full bg-success" />{t("card.in_stock")}</span>;
}

/** Flat product card. Image, optional sale tag, name, price, stock, then Add, which becomes a quantity stepper once in the cart. */
export function ProductCardV2({ p, locale, priority = false, className }: { p: CardProduct; locale: Locale; priority?: boolean; className?: string }) {
  const { t } = useT();
  const { items, add, setQty } = useCart();
  const { perms } = useAuth();
  const canManage = perms.has("products.manage");
  const nav = useNavigate();
  const loc = useLocation();
  const ids = useWishIds().data;
  const [local, setLocal] = useState<boolean | null>(null);
  const wish = local ?? ids?.has(p.id) ?? false;
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const available = p.stock_quantity - p.reserved_quantity;
  const out = available <= 0;
  const img = failed ? null : primaryImage(p);
  const name = pick(locale, p.name_en, p.name_ne);
  const avg = p.review_count ? p.rating_sum / p.review_count : 0;
  const sale = p.discount_price_paisa != null && p.discount_price_paisa < p.price_paisa;
  const pct = sale ? Math.round((1 - (p.discount_price_paisa as number) / p.price_paisa) * 100) : 0;
  const inCart = items.find((i) => i.productId === p.id)?.quantity ?? 0;
  const max = Math.min(99, available);
  const showWish = !canManage && !demoOn();

  const addOne = () => {
    add(p.id, 1);
    toast.success(t("product.added_named", { name }), { action: { label: t("cart.view"), onClick: () => nav("/cart") } });
  };

  return (
    <li className={cn("product-card relative m-0 flex list-none flex-col rounded-lg bg-surface p-2 shadow-[var(--e1)] ring-1 ring-[var(--line)] transition-[box-shadow,transform] duration-[var(--duration-2)] ease-[var(--ease-out)] hover-fine:hover:-translate-y-0.5 hover-fine:hover:shadow-[var(--e2)]", className)}>
      <div className="relative">
        <Link to={`/product/${p.slug}`} className="block aspect-square overflow-hidden rounded-md bg-well" tabIndex={-1} aria-hidden>
          {img ? (
            <img src={img} alt="" width={400} height={400} loading={priority ? "eager" : "lazy"} decoding="async"
              onLoad={() => setLoaded(true)} onError={() => setFailed(true)}
              className={cn("product-img h-full w-full object-cover", loaded ? "opacity-100" : "opacity-0", out && "opacity-60 grayscale")} />
          ) : <ProductFallback categoryId={p.category_id} />}
        </Link>
        {sale && <span className="absolute left-2 top-2 rounded-xs bg-accent px-2 py-0.5 text-xs font-bold text-on-accent shadow-[var(--e1)]">{t("card.off", { n: pct })}</span>}
        {showWish && (
          <button type="button" aria-pressed={wish} aria-label={wish ? t("card.unsave", { name }) : t("card.save", { name })}
            onClick={async () => {
              const r = await toggleWishlist(p.id);
              if (r === "login") nav(`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`); else setLocal(r);
            }}
            className="absolute right-0.5 top-0.5 inline-flex size-11 items-center justify-center rounded-full">
            <span className={cn("inline-flex size-8 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--surface)_92%,transparent)] shadow-[var(--e1)] transition-[color,transform] active:scale-90", wish ? "text-accent" : "text-ink")}>
              <Heart aria-hidden size={16} strokeWidth={2.2} fill={wish ? "currentColor" : "none"} />
            </span>
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 px-1 pb-1 pt-2.5 min-[360px]:px-1.5">
        <Link to={`/product/${p.slug}`} className="line-clamp-2 min-h-[2.6em] text-[0.9375rem] font-semibold leading-[1.3] text-ink no-underline hover-fine:hover:underline">{name}</Link>
        {p.review_count > 0 && <Rating value={avg} count={p.review_count} size={13} label={t("rating.label", { value: avg.toFixed(1), count: p.review_count })} />}
        <StockNote available={available} low={p.low_stock_threshold} />
        <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
          <p className="m-0 min-w-0 leading-tight">
            <span className="block text-price font-bold text-ink tabular">{formatNpr(p.discount_price_paisa ?? p.price_paisa)}</span>
            {sale && <s className="relative block text-xs text-muted tabular"><span className="sr-only-text">{t("card.was")} </span>{formatNpr(p.price_paisa)}</s>}
          </p>
          {canManage ? (
            <Link to={`/admin/products/${p.id}`} aria-label={`${t("admin.edit")}: ${name}`} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink"><Settings aria-hidden size={18} strokeWidth={1.8} /></Link>
          ) : !out && inCart === 0 ? (
            <button type="button" onClick={addOne} aria-label={t("card.add_named", { name })}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-on-brand shadow-[var(--e1)] transition-[transform,background-color] duration-[var(--duration-1)] active:scale-90 hover-fine:hover:bg-[var(--brand-hover)]">
              <Plus aria-hidden size={20} strokeWidth={2.4} />
            </button>
          ) : null}
        </div>
        {!canManage && !out && inCart > 0 && (
          <QtyStepper className="pop-in mt-1.5 w-full" size="sm" min={0} value={inCart} max={max} onChange={(n) => setQty(p.id, n)}
            labels={{ group: t("card.qty_in_cart", { name }), less: t("pdp.less"), more: t("pdp.more"), remove: t("cart.remove") }} />
        )}
      </div>
    </li>
  );
}

/** Responsive product grid: 2 columns on phones, up to 5 on wide desktops ("narrow" leaves room for a sidebar). */
export function CardGrid({ children, className = "", narrow = false }: { children: React.ReactNode; className?: string; narrow?: boolean }) {
  return <ul className={cn("m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 sm:gap-4", narrow ? "lg:grid-cols-4" : "lg:grid-cols-4 xl:grid-cols-5", className)}>{children}</ul>;
}
