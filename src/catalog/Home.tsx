import { useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { buttonStyles, Banknote, ChevronLeft, ChevronRight, EmptyState, GlassPanel, IconButton, MapPin, PackageOpen, Receipt, Skeleton, SkeletonGroup, Truck, cn } from "@/ui";
import { useT, pick, type Locale } from "@/lib/i18n";
import { useServiceInfo } from "@/lib/queries";
import { useTitle } from "@/components/ui";
import { formatNpr } from "@/lib/money";
import { primaryImage, type CardProduct } from "@/components/Product";
import { assetUrl, demo, useBanners, useCategoryArt, useRail, useRecentlyViewed, type Banner } from "./data";
import { ProductCard } from "./ProductCard";
import { SearchBox } from "./SearchBox";
import { categoryIcon } from "./categoryIcon";
import { PAGE_X } from "./layout";
import { useTenant } from "@/platform/TenantContext";

// Soft tints rotate across category tiles that have no photo, so the grid stays lively without random colours.
const TINTS = ["bg-mint-soft", "bg-peach-soft", "bg-sky-soft", "bg-butter-soft", "bg-rose-soft"];

/** Dev-only art for the demo catalogue (licensed Commons photos); always null in production. */
function useDemoArt() {
  return useQuery({
    queryKey: ["demo-art"], staleTime: Infinity,
    queryFn: async () => { const dm = await demo(); return dm ? { hero: dm.heroPhoto, promo: dm.promoPhoto } : null; },
  }).data ?? null;
}

const withImage = (list?: CardProduct[]) => (list ?? []).filter((p) => !!primaryImage(p));

/** Floating product card over the hero photo: a real product with its real price, linking to it. */
function FeaturedChip({ p, locale }: { p: CardProduct; locale: Locale }) {
  const { t } = useT();
  const price = p.discount_price_paisa ?? p.price_paisa;
  return (
    <Link to={`/product/${p.slug}`} className="flex w-64 max-w-[calc(100%-1.5rem)] items-center gap-3 rounded-lg bg-surface p-2.5 pr-4 text-ink no-underline shadow-[var(--e3)] ring-1 ring-[var(--line)] transition-transform duration-[var(--duration-2)] hover-fine:hover:-translate-y-0.5">
      <img src={primaryImage(p)!} alt="" width={56} height={56} referrerPolicy="no-referrer" className="size-14 shrink-0 rounded-md bg-well object-cover" />
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-accent">{p.discount_price_paisa != null ? t("home.hero.deal") : t("home.hero.new")}</span>
        <span className="block truncate text-sm font-semibold">{pick(locale, p.name_en, p.name_ne)}</span>
        <span className="block text-sm font-bold tabular">{formatNpr(price)}</span>
      </span>
    </Link>
  );
}

function Hero() {
  const { t, locale } = useT();
  const { tenant } = useTenant();
  const art = useDemoArt();
  const deals = useRail("deals"), fresh = useRail("new");
  const service = useServiceInfo().data;
  const pool = [...withImage(deals.data), ...withImage(fresh.data)];
  const featured = pool[0];
  const collage = pool.filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i).slice(0, 3);
  const zone = service?.zones[0];

  const heroPhotoUrl =
    (tenant?.brand_config as Record<string, any>)?.hero_image ||
    (tenant?.brand_config as Record<string, any>)?.hero_image_url ||
    tenant?.cover_path ||
    art?.hero?.src ||
    "https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=2000";

  return (
    <section aria-labelledby="h-hero" className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:gap-10 lg:gap-14">
      <div className="space-y-5 md:py-6">
        <h1 id="h-hero" className="m-0 max-w-[15ch] text-[2.125rem] font-bold leading-[1.05] tracking-tight text-ink sm:text-[2.75rem] lg:text-[3.25rem]">{t("home.hero.title")}</h1>
        <p className="m-0 max-w-[42ch] text-lg text-muted">{t("home.hero.body")}</p>
        <div className="max-w-lg lg:hidden"><SearchBox /></div>
        <div className="flex flex-wrap gap-2.5">
          <Link to="/shop" className={buttonStyles({ variant: "primary", size: "lg" })}>{t("home.shop_now")}</Link>
          <a href="#categories" className={buttonStyles({ variant: "secondary", size: "lg" })}>{t("home.explore")}</a>
        </div>
      </div>

      <div className="relative">
        {heroPhotoUrl ? (
          <img
            src={heroPhotoUrl}
            alt={t("home.hero.photo_alt") || "Supermarket storefront interior"}
            width={1200}
            height={900}
            fetchPriority="high"
            referrerPolicy="no-referrer"
            className="aspect-[4/3] w-full rounded-xl bg-well object-cover shadow-[var(--e2)] md:aspect-[5/4]"
          />
        ) : collage.length >= 2 ? (
          <div aria-hidden className="grid aspect-[4/3] grid-cols-[1.4fr_1fr] grid-rows-2 gap-3 md:aspect-[5/4]">
            {collage.map((p, i) => (
              <img key={p.id} src={primaryImage(p)!} alt="" referrerPolicy="no-referrer" className={cn("size-full rounded-xl bg-well object-cover shadow-[var(--e1)]", i === 0 && "row-span-2", collage.length === 2 && i === 1 && "row-span-2")} />
            ))}
          </div>
        ) : (
          <img
            src="https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=2000"
            alt="Supermarket storefront interior"
            width={1200}
            height={900}
            fetchPriority="high"
            referrerPolicy="no-referrer"
            className="aspect-[4/3] w-full rounded-xl bg-well object-cover shadow-[var(--e2)] md:aspect-[5/4]"
          />
        )}
        {featured && <div className="absolute -bottom-5 left-3 sm:left-6 md:-left-8"><FeaturedChip p={featured} locale={locale} /></div>}
        {zone && (
          <p className="absolute right-3 top-3 m-0 flex items-center gap-2 rounded-md bg-surface px-3 py-2 text-sm font-semibold text-ink shadow-[var(--e2)] sm:right-5 sm:top-5">
            <MapPin aria-hidden size={16} strokeWidth={2} className="text-accent" />{t("home.hero.delivering", { zone: pick(locale, zone.name_en, zone.name_ne) ?? zone.name_en })}
          </p>
        )}
      </div>
    </section>
  );
}

/** What ordering here involves, from live settings only: delivery areas with fees, cash on delivery, tracking. */
function ServiceBand() {
  const { t, locale } = useT();
  const q = useServiceInfo();
  if (q.isLoading) return <Skeleton variant="row" className="h-24 rounded-lg" />;
  const { zones = [], cod = false } = q.data ?? {};
  const fees = zones.map((z) => z.fee_paisa);
  const items = [
    zones.length > 0 && { icon: Truck, title: t("home.band.delivery"), body: zones.length === 1 ? pick(locale, zones[0].name_en, zones[0].name_ne)! : t("home.band.areas", { n: zones.length, from: formatNpr(Math.min(...fees)) }) },
    cod && { icon: Banknote, title: t("trust.cod"), body: t("home.service.cod") },
    { icon: Receipt, title: t("nav.track"), body: t("home.service.track"), to: "/track" },
  ].filter(Boolean) as { icon: typeof Truck; title: string; body: string; to?: string }[];
  return (
    <ul aria-label={t("home.service.title")} className={cn("m-0 grid list-none divide-y divide-[var(--line)] rounded-lg bg-surface p-0 shadow-[var(--e1)] ring-1 ring-[var(--line)] md:divide-x md:divide-y-0", items.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2")}>
      {items.map(({ icon: Icon, title, body, to }) => {
        const inner = (
          <>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-surface-2 text-ink"><Icon aria-hidden size={20} strokeWidth={1.9} /></span>
            <span className="min-w-0"><span className="block font-semibold">{title}</span><span className="block text-sm text-muted">{body}</span></span>
          </>
        );
        return (
          <li key={title}>
            {to ? <Link to={to} className="flex items-center gap-3.5 p-4 text-ink no-underline hover-fine:hover:bg-surface-2 md:rounded-none">{inner}</Link> : <div className="flex items-center gap-3.5 p-4">{inner}</div>}
          </li>
        );
      })}
    </ul>
  );
}

/** Promotions the owner uploaded (Admin, Storefront). Rendered only when there are some. */
function Promotions() {
  const { t, locale } = useT();
  const banners = useBanners();
  const track = useRef<HTMLUListElement>(null);
  const list = banners.data ?? [];
  const slide = (dir: 1 | -1) => { const el = track.current; if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); };
  if (!list.length) return null;
  return (
    <section aria-roledescription="carousel" aria-label={t("home.hero")} className="relative">
      {/* A scroll container must be focusable so keyboard users can scroll it (axe: scrollable-region-focusable). */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <ul ref={track} tabIndex={0} aria-label={t("home.hero")} className="rail m-0 flex list-none snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain p-0">
        {list.map((b, i) => <Slide key={b.id} b={b} locale={locale} first={i === 0} n={i + 1} total={list.length} />)}
      </ul>
      {list.length > 1 && (
        <div className="pointer-events-none absolute inset-x-2 top-1/2 hidden -translate-y-1/2 justify-between md:flex">
          <IconButton variant="glass" icon={ChevronLeft} label={t("common.previous")} className="pointer-events-auto" onClick={() => slide(-1)} />
          <IconButton variant="glass" icon={ChevronRight} label={t("common.next")} className="pointer-events-auto" onClick={() => slide(1)} />
        </div>
      )}
    </section>
  );
}

function Slide({ b, locale, first, n, total }: { b: Banner; locale: Locale; first: boolean; n: number; total: number }) {
  const { t } = useT();
  const title = pick(locale, b.title_en, b.title_ne);
  const sub = pick(locale, b.subtitle_en, b.subtitle_ne);
  const cta = pick(locale, b.cta_label_en, b.cta_label_ne) || t("home.shop_now");
  const alt = pick(locale, b.image_alt_en, b.image_alt_ne) ?? "";
  return (
    <li role="group" aria-roledescription="slide" aria-label={`${n} / ${total}`} className="relative aspect-[16/9] w-full shrink-0 snap-center overflow-hidden rounded-2xl bg-well sm:aspect-[3/1] lg:aspect-[4/1]">
      <img src={assetUrl(b.image_path)!} alt={alt} width={1200} height={400} fetchPriority={first ? "high" : "auto"} loading={first ? "eager" : "lazy"} decoding="async" className="h-full w-full object-cover" />
      <GlassPanel shape="dialog" className="absolute inset-x-3 bottom-3 max-w-md p-4 md:inset-x-auto md:bottom-6 md:left-6">
        <h2 className="m-0 line-clamp-2 text-section font-bold text-ink">{title}</h2>
        {sub && <p className="m-0 mt-1 line-clamp-2 text-ink">{sub}</p>}
        {b.link_url && <Link to={b.link_url} className={`${buttonStyles({ variant: "primary" })} mt-3`}>{cta}</Link>}
      </GlassPanel>
    </li>
  );
}

function Categories() {
  const { t, locale } = useT();
  const cats = useCategoryArt();
  if (cats.isLoading) return <SkeletonGroup label={t("common.loading")}><Skeleton variant="row" className="h-40" /></SkeletonGroup>;
  if (!cats.data?.length) return null;
  return (
    <section aria-labelledby="h-cats" id="categories" className="scroll-mt-24 space-y-4">
      <SectionHead id="h-cats" title={t("home.categories")} moreTo="/shop" moreLabel={t("home.all_products")} />
      <ul className="rail -mx-4 my-0 flex list-none snap-x gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-5 md:gap-4 md:overflow-visible md:px-0">
        {cats.data.map((c, i) => {
          const art = assetUrl(c.image_path);
          const Icon = categoryIcon(c.slug || c.name_en);
          return (
            <li key={c.id} className="w-32 shrink-0 snap-start md:w-auto">
              <Link to={`/shop?category=${c.slug}`} className="group block space-y-2 rounded-lg text-ink no-underline">
                <span className={cn("relative block aspect-square overflow-hidden rounded-lg ring-1 ring-[var(--line)] transition-shadow duration-[var(--duration-2)] group-hover:shadow-[var(--e2)]", art ? "bg-well" : TINTS[i % TINTS.length])}>
                  {art ? <img src={art} alt="" width={240} height={240} loading="lazy" decoding="async" className="product-img size-full object-cover" />
                    : <span className="flex size-full items-center justify-center"><Icon aria-hidden size={40} strokeWidth={1.4} /></span>}
                </span>
                <span className="block px-0.5 text-[0.9375rem] font-semibold leading-snug group-hover:underline">{pick(locale, c.name_en, c.name_ne)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** A promotional panel built from genuine sale items (or the demo market photo in development). */
function OffersPanel() {
  const { t } = useT();
  const deals = useRail("deals");
  const art = useDemoArt();
  const list = deals.data ?? [];
  const pics = withImage(list).slice(0, 3);
  if (list.length < 2) return null;
  return (
    <section aria-labelledby="h-offers" className="grid overflow-hidden rounded-2xl bg-peach-soft md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col items-start justify-center gap-4 p-6 sm:p-8 lg:p-12">
        <h2 id="h-offers" className="m-0 max-w-[14ch] text-[1.875rem] font-bold leading-tight text-ink sm:text-[2.25rem]">{t("home.offers.title")}</h2>
        <p className="m-0 max-w-[38ch] text-ink">{t("home.offers.body", { n: list.length >= 10 ? "10+" : String(list.length) })}</p>
        <Link to="/shop?sale=1" className={buttonStyles({ variant: "primary", size: "lg" })}>{t("home.offers.cta")}</Link>
      </div>
      <div className="relative min-h-56 md:min-h-80">
        {art?.promo ? (
          <img src={art.promo.src} alt={t("home.offers.photo_alt")} className="absolute inset-0 size-full object-cover md:rounded-l-2xl" loading="lazy" />
        ) : pics.length ? (
          <div aria-hidden className="absolute inset-0 flex items-center justify-center gap-3 p-6">
            {pics.map((p, i) => (
              <img key={p.id} src={primaryImage(p)!} alt="" loading="lazy"
                className={cn("aspect-[3/4] w-1/3 rounded-lg bg-surface object-cover shadow-[var(--e2)]", i === 1 && "-translate-y-4 md:-translate-y-6")} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SectionHead({ id, title, moreTo, moreLabel }: { id: string; title: string; moreTo?: string; moreLabel?: string }) {
  const { t } = useT();
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className="m-0 text-section font-bold">{title}</h2>
      {moreTo && (
        <Link to={moreTo} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md px-2 text-sm font-semibold text-ink no-underline hover-fine:hover:bg-surface-2">
          {moreLabel ?? t("home.see_all")}<ChevronRight aria-hidden size={16} />
        </Link>
      )}
    </div>
  );
}

/** One shelf of products: swipe on phones, a one-row grid from 840 px so mice never need to side-scroll. */
function Shelf({ id, title, products, moreTo, loading }: { id: string; title: string; products: CardProduct[]; moreTo?: string; loading?: boolean }) {
  const { t, locale } = useT();
  // 4 columns from 840 px, 5 from 1200 px: hide the 5th card only in the 4-column range, and anything after it everywhere on desktop.
  const item = "w-[46%] shrink-0 snap-start sm:w-[31%] md:w-auto md:[&:nth-child(n+6)]:hidden md:max-lg:[&:nth-child(5)]:hidden";
  if (loading) {
    return (
      <SkeletonGroup label={t("common.loading")} className="space-y-4">
        <Skeleton className="w-40" />
        <div className="flex gap-3 overflow-hidden sm:gap-4 md:grid md:grid-cols-4 lg:grid-cols-5">{[0, 1, 2, 3, 4].map((i) => <div key={i} className={item}><Skeleton variant="card" /></div>)}</div>
      </SkeletonGroup>
    );
  }
  if (products.length < 2) return null;
  return (
    <section aria-labelledby={id} className="space-y-4">
      <SectionHead id={id} title={title} moreTo={moreTo} />
      <ul className="rail -mx-4 my-0 flex list-none snap-x gap-3 overflow-x-auto px-4 pb-3 pt-1 sm:-mx-6 sm:gap-4 sm:px-6 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-5">
        {products.map((p) => <ProductCard key={p.id} p={p} locale={locale} className={item} />)}
      </ul>
    </section>
  );
}

export default function Home() {
  const { t } = useT();
  useTitle(t("nav.home"));
  const deals = useRail("deals"), fresh = useRail("new"), best = useRail("best");
  const recent = useRecentlyViewed();
  const empty = !fresh.isLoading && !fresh.isError && !(fresh.data?.length);
  // Deals, new arrivals and best sellers never repeat a product across shelves (small catalogues stay honest).
  const seen = new Set<string>();
  const take = (list: CardProduct[] | undefined) => (list ?? []).filter((p) => !seen.has(p.id) && seen.add(p.id)).slice(0, 10);
  const d = take(deals.data), n = take(fresh.data), b = take(best.data);

  return (
    <main className={`${PAGE_X} page-in space-y-12 py-5 md:space-y-16 md:py-8`}>
      <Hero />
      <ServiceBand />
      <Promotions />
      {empty ? (
        <EmptyState icon={PackageOpen} title={t("home.empty.title")} description={t("home.empty.body")}
          action={<Link to="/track" className={buttonStyles({ variant: "secondary" })}><Truck aria-hidden size={20} strokeWidth={1.75} />{t("nav.track")}</Link>} />
      ) : (
        <>
          <Categories />
          <Shelf id="h-deals" title={t("home.deals")} products={d} moreTo="/shop?sale=1" loading={deals.isLoading} />
          <OffersPanel />
          <Shelf id="h-new" title={t("home.new")} products={n} moreTo="/shop" loading={fresh.isLoading} />
          <Shelf id="h-best" title={t("home.best")} products={b} moreTo="/shop?sort=best" loading={best.isLoading} />
          <Shelf id="h-rv" title={t("home.recent")} products={recent.data ?? []} />
        </>
      )}
    </main>
  );
}
