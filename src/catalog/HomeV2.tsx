import { useRef } from "react";
import { Link } from "react-router-dom";
import { buttonStyles, ChevronLeft, ChevronRight, EmptyState, GlassPanel, IconButton, PackageOpen, RotateCcw, ShieldCheck, Skeleton, SkeletonGroup, Store, Truck, MessageCircle } from "@/ui";
import { useT, pick, type Locale } from "@/lib/i18n";
import { useStoreSettings } from "@/lib/queries";
import { useTitle } from "@/components/ui";
import type { CardProduct } from "@/components/Product";
import { assetUrl, useBanners, useCategoryArt, useRail, useRecentlyViewed, type Banner, type Rail } from "./data";
import { CardGrid, ProductCardV2 } from "./ProductCardV2";
import { SearchBox } from "./SearchBox";
import { PAGE_X } from "./layout";

function Hero() {
  const { t, locale } = useT();
  const banners = useBanners();
  const settings = useStoreSettings().data;
  const track = useRef<HTMLUListElement>(null);
  const list = banners.data ?? [];
  const slide = (dir: 1 | -1) => { const el = track.current; if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); };

  if (banners.isLoading) return <Skeleton variant="row" className="aspect-[16/9] h-auto md:aspect-[3/1]" />;
  if (!list.length) {
    // No banners yet: a calm brand-tinted hero so a first-run store never shows a hole.
    return (
      <section aria-label={t("home.hero")} className="flex aspect-[16/9] flex-col items-start justify-end gap-3 rounded-xl bg-brand-tint p-5 md:aspect-[3/1] md:p-8">
        <h1 className="m-0 text-3xl font-bold text-ink md:text-4xl">{settings?.store_name ?? t("nav.home")}</h1>
        <p className="m-0 text-ink">{t("home.hero.fallback")}</p>
        <Link to="/shop" className={buttonStyles({ variant: "primary", size: "lg" })}>{t("home.shop_now")}</Link>
      </section>
    );
  }
  return (
    <section aria-roledescription="carousel" aria-label={t("home.hero")} className="relative">
      {/* A scroll container must be focusable so keyboard users can scroll it (axe: scrollable-region-focusable). */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <ul ref={track} tabIndex={0} aria-label={t("home.hero")}
        className="m-0 flex list-none snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {list.map((b, i) => <Slide key={b.id} b={b} locale={locale} first={i === 0} n={i + 1} total={list.length} />)}
      </ul>
      {list.length > 1 && (
        <div className="pointer-events-none absolute inset-x-1 top-1/2 hidden -translate-y-1/2 justify-between md:flex">
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
    <li role="group" aria-roledescription="slide" aria-label={`${n} / ${total}`} className="relative aspect-[16/9] w-full shrink-0 snap-center overflow-hidden rounded-xl bg-surface-2 md:aspect-[3/1]">
      <img src={assetUrl(b.image_path)!} alt={alt} width={1200} height={400} fetchPriority={first ? "high" : "auto"} loading={first ? "eager" : "lazy"} decoding="async" className="h-full w-full object-cover" />
      <GlassPanel shape="dialog" className="absolute inset-x-3 bottom-3 max-w-md p-4 md:inset-x-auto md:bottom-6 md:left-6">
        <h2 className="m-0 line-clamp-2 text-xl font-bold text-ink md:text-2xl">{title}</h2>
        {sub && <p className="m-0 mt-1 line-clamp-2 text-ink">{sub}</p>}
        {b.link_url && <Link to={b.link_url} className={`${buttonStyles({ variant: "primary" })} mt-3`}>{cta}</Link>}
      </GlassPanel>
    </li>
  );
}

function CategoryRail() {
  const { t, locale } = useT();
  const cats = useCategoryArt();
  if (!cats.data?.length) return null;
  return (
    <section aria-labelledby="h-cats" className="space-y-3">
      <h2 id="h-cats" className="m-0 text-2xl font-bold">{t("home.categories")}</h2>
      <ul className="-mx-4 m-0 flex list-none snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
        {cats.data.map((c) => {
          const art = assetUrl(c.image_path);
          return (
            <li key={c.id} className="shrink-0 snap-start">
              <Link to={`/shop?category=${c.slug}`} className="flex min-h-12 w-24 flex-col items-center gap-2 text-center text-sm font-semibold text-ink no-underline">
                <span className="flex size-20 items-center justify-center overflow-hidden rounded-xl bg-brand-tint">
                  {art ? <img src={art} alt="" width={80} height={80} loading="lazy" decoding="async" className="size-full object-cover" /> : <Store aria-hidden size={32} strokeWidth={1.5} />}
                </span>
                <span className="line-clamp-2">{pick(locale, c.name_en, c.name_ne)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ProductSection({ id, title, products, moreTo, locale }: { id: string; title: string; products: CardProduct[]; moreTo?: string; locale: Locale }) {
  const { t } = useT();
  if (!products.length) return null;
  return (
    <section aria-labelledby={id} className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="m-0 text-2xl font-bold">{title}</h2>
        {moreTo && <Link to={moreTo} className="inline-flex min-h-12 items-center font-semibold text-ink underline">{t("home.see_all")}</Link>}
      </div>
      <CardGrid>{products.slice(0, 8).map((p) => <ProductCardV2 key={p.id} p={p} locale={locale} />)}</CardGrid>
    </section>
  );
}

function RailSection({ rail, id, titleKey, moreTo }: { rail: Rail; id: string; titleKey: string; moreTo?: string }) {
  const { t, locale } = useT();
  const q = useRail(rail);
  if (q.isLoading) return <SkeletonGroup label={t("common.loading")} className="space-y-3"><Skeleton className="w-40" /><CardGrid>{[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="card" />)}</CardGrid></SkeletonGroup>;
  return <ProductSection id={id} title={t(titleKey)} products={q.data ?? []} moreTo={moreTo} locale={locale} />;
}

function TrustStrip() {
  const { t } = useT();
  const items = [
    { icon: Truck, text: t("trust.delivery") }, { icon: ShieldCheck, text: t("trust.cod") },
    { icon: RotateCcw, text: t("trust.returns") }, { icon: MessageCircle, text: t("trust.support") },
  ];
  return (
    <ul aria-label={t("trust.label")} className="m-0 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-4">
      {items.map(({ icon: Icon, text }) => (
        <li key={text} className="flex min-h-12 items-center gap-3 rounded-lg bg-surface-2 p-3 text-sm font-semibold text-ink">
          <Icon aria-hidden size={24} strokeWidth={1.75} className="shrink-0" />{text}
        </li>
      ))}
    </ul>
  );
}

function Recent() {
  const { t, locale } = useT();
  const q = useRecentlyViewed();
  return <ProductSection id="h-rv" title={t("home.recent")} products={q.data ?? []} locale={locale} />;
}

export default function HomeV2() {
  const { t } = useT();
  useTitle(t("nav.home"));
  const newQ = useRail("new");
  const empty = !newQ.isLoading && !(newQ.data?.length);
  return (
    <main className={`${PAGE_X} space-y-8 py-4 md:space-y-10`}>
      <div className="md:hidden"><SearchBox /></div>
      <Hero />
      <TrustStrip />
      {empty ? (
        <EmptyState icon={PackageOpen} title={t("home.empty.title")} description={t("home.empty.body")}
          action={<Link to="/track" className={buttonStyles({ variant: "secondary" })}>{t("nav.track")}</Link>} />
      ) : (
        <>
          <CategoryRail />
          <RailSection rail="deals" id="h-deals" titleKey="home.deals" moreTo="/shop?sale=1" />
          <RailSection rail="new" id="h-new" titleKey="home.new" moreTo="/shop" />
          <RailSection rail="best" id="h-best" titleKey="home.best" moreTo="/shop?sort=best" />
          <Recent />
        </>
      )}
    </main>
  );
}
