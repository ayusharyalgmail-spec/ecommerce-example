import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Badge, Button, buttonStyles, Settings, Heart, IconButton, ImageOff, Rating, ShoppingCart, Truck, toast } from "@/ui";
import { useCart } from "@/lib/cart";
import { useT, pick, type Locale } from "@/lib/i18n";
import { formatNpr } from "@/lib/money";
import { toggleWishlist } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useWishIds } from "./data";
import { primaryImage, type CardProduct } from "@/components/Product";

/** Flat product card (never glass). One primary action, a wishlist heart, sale and stock chips, blur-up image tile. */
export function ProductCardV2({ p, locale, priority = false }: { p: CardProduct; locale: Locale; priority?: boolean }) {
  const { t } = useT();
  const { add } = useCart();
  const { perms } = useAuth();
  const canManage = perms.has("products.manage");
  const nav = useNavigate();
  const loc = useLocation();
  const ids = useWishIds().data;
  const [local, setLocal] = useState<boolean | null>(null);
  const wish = local ?? ids?.has(p.id) ?? false;
  const [loaded, setLoaded] = useState(false);
  const available = p.stock_quantity - p.reserved_quantity;
  const out = available <= 0;
  const img = primaryImage(p);
  const name = pick(locale, p.name_en, p.name_ne);
  const avg = p.review_count ? p.rating_sum / p.review_count : 0;
  const sale = p.discount_price_paisa != null && p.discount_price_paisa < p.price_paisa;
  const pct = sale ? Math.round((1 - (p.discount_price_paisa as number) / p.price_paisa) * 100) : 0;

  return (
    <li className="m-0 flex list-none flex-col overflow-hidden rounded-lg border border-line bg-surface hover-fine:transition-shadow hover-fine:hover:shadow-[var(--e2)]">
      <div className="relative">
        <Link to={`/product/${p.slug}`} className="block aspect-square bg-surface-2" tabIndex={-1} aria-hidden>
          {img ? (
            <img src={img} alt="" width={400} height={400} loading={priority ? "eager" : "lazy"} decoding="async"
              onLoad={() => setLoaded(true)}
              className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${out ? "grayscale" : ""}`} />
          ) : <span className="flex h-full items-center justify-center text-muted"><ImageOff aria-hidden size={40} strokeWidth={1.25} /></span>}
        </Link>
        {sale && <Badge tone="danger" icon={false} className="absolute left-2 top-2">{t("card.off", { n: pct })}</Badge>}
        {!canManage && <span className="absolute right-1 top-1"><IconButton variant="glass" icon={Heart} pressed={wish}
          label={wish ? t("card.unsave", { name }) : t("card.save", { name })}
          onClick={async () => {
            const r = await toggleWishlist(p.id);
            if (r === "login") nav(`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`); else setLocal(r);
          }} /></span>}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {p.review_count > 0 && <Rating value={avg} count={p.review_count} size={14} label={t("rating.label", { value: avg.toFixed(1), count: p.review_count })} />}
        <Link to={`/product/${p.slug}`} className="line-clamp-2 min-h-[2.8em] font-semibold text-ink no-underline">{name}</Link>
        <p className="m-0 flex flex-wrap items-baseline gap-x-2">
          <span className="text-lg font-bold text-ink">{formatNpr(p.discount_price_paisa ?? p.price_paisa)}</span>
          {sale && <s className="text-sm text-muted"><span className="sr-only-text">{t("card.was")} </span>{formatNpr(p.price_paisa)}</s>}
        </p>
        {out ? <Badge tone="danger">{t("product.out")}</Badge>
          : available < p.low_stock_threshold ? <Badge tone="warning">{t("product.low", { n: available })}</Badge>
          : <Badge icon={Truck}>{t("card.ready")}</Badge>}
        {canManage ? (
          <Link to={`/admin/products/${p.id}`} className={`${buttonStyles({ variant: "secondary" })} mt-auto w-full`}><Settings aria-hidden size={20} strokeWidth={1.75} />{t("admin.edit")}</Link>
        ) : (
          <Button className="mt-auto" size="md" block variant={out ? "secondary" : "primary"} disabled={out} leadingIcon={ShoppingCart}
            onClick={() => { add(p.id, 1); toast.success(t("product.added_toast"), { action: { label: t("cart.view"), onClick: () => nav("/cart") } }); }}>
            {out ? t("product.out") : t("product.add")}
          </Button>
        )}
      </div>
    </li>
  );
}

export function CardGrid({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <ul className={`m-0 grid list-none grid-cols-2 gap-3 p-0 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 ${className}`}>{children}</ul>;
}
