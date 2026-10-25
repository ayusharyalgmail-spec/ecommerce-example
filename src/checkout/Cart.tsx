import { Link } from "react-router-dom";
import { useQuery as useTan } from "@tanstack/react-query";
import { Alert, Badge, Button, buttonStyles, EmptyState, GlassPanel, IconButton, QtyStepper, ShoppingCart, Skeleton, SkeletonGroup, Trash2, toast } from "@/ui";
import { useCart } from "@/lib/cart";
import { useT, pick } from "@/lib/i18n";
import { loadCartProducts } from "@/lib/api";
import { fixQty, lineIssue } from "@/lib/minQty";
import { useFeature } from "@/platform/TenantContext";
import { formatNpr } from "@/lib/money";
import { imageUrl, supabase } from "@/lib/supabase";
import { useServiceInfo } from "@/lib/queries";
import { useTitle } from "@/components/ui";
import { PAGE_X } from "@/catalog/layout";
import { ProductFallback } from "@/catalog/ProductCard";

export default function Cart() {
  const { items, setQty, remove, clear, add } = useCart();
  const minOn = useFeature("min_order_qty");
  const { t, locale } = useT();
  useTitle(t("cart.title"));
  const ids = items.map((i) => i.productId).sort();
  const lines = useTan({ queryKey: ["cart-lines", ids], enabled: ids.length > 0, staleTime: 0, queryFn: () => loadCartProducts(ids) });
  const zones = useServiceInfo().data?.zones ?? [];
  const minFee = zones.length ? Math.min(...zones.map((z) => z.fee_paisa)) : null;
  const threshold = useTan({
    queryKey: ["free-delivery"], staleTime: 10 * 60_000,
    queryFn: async () => ((await supabase.from("store_settings").select("free_delivery_threshold_paisa").single()).data?.free_delivery_threshold_paisa ?? null) as number | null,
  }).data;

  if (!items.length) {
    return (
      <main className={`${PAGE_X} page-in py-8`}>
        <EmptyState icon={ShoppingCart} title={t("cart.empty")} description={t("cart.empty.body")} action={<Link to="/shop" className={buttonStyles({ variant: "primary", size: "lg" })}>{t("cart.continue")}</Link>} />
      </main>
    );
  }
  if (lines.isLoading) return <main className={`${PAGE_X} py-6`}><SkeletonGroup label={t("common.loading")} className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} variant="row" className="h-28" />)}</SkeletonGroup></main>;
  if (lines.isError) {
    return (
      <main className={`${PAGE_X} py-6`}>
        <Alert tone="danger"><p className="m-0 font-semibold">{t("cart.load_error")}</p><Button size="sm" variant="secondary" className="mt-2" onClick={() => void lines.refetch()}>{t("common.retry")}</Button></Alert>
      </main>
    );
  }

  const byId = new Map((lines.data ?? []).map((l) => [l.id, minOn ? l : { ...l, min_qty: 1 }]));
  const rows = items.map((i) => ({ i, l: byId.get(i.productId) }));
  const problems = rows.filter(({ i, l }) => !l || lineIssue(i.quantity, l.available, l.min_qty) !== null);
  const blocked = problems.length > 0;
  const unit = (l: { discount_price_paisa: number | null; price_paisa: number }) => l.discount_price_paisa ?? l.price_paisa;
  const subtotal = rows.reduce((n, { i, l }) => (l && l.available > 0 ? n + unit(l) * Math.min(i.quantity, l.available) : n), 0);
  const savings = rows.reduce((n, { i, l }) => (l && l.available > 0 && l.discount_price_paisa != null ? n + (l.price_paisa - l.discount_price_paisa) * Math.min(i.quantity, l.available) : n), 0);
  const count = rows.reduce((n, { i, l }) => (l && l.available > 0 ? n + Math.min(i.quantity, l.available) : n), 0);
  const undo = (id: string, qty: number) => { remove(id); toast.info(t("cart.removed"), { action: { label: t("common.undo"), onClick: () => add(id, qty) } }); };
  const fixAll = () => problems.forEach(({ i, l }) => {
    const n = l ? fixQty(i.quantity, l.available, l.min_qty) : 0;
    if (n === 0) remove(i.productId); else setQty(i.productId, n);
  });
  const left = threshold != null ? Math.max(0, threshold - subtotal) : null;
  const checkout = blocked
    ? <Button block size="lg" disabled>{t("cart.checkout")}</Button>
    : <Link to="/checkout" className={buttonStyles({ variant: "primary", size: "lg", block: true })}>{t("cart.checkout")}</Link>;

  return (
    <main className={`${PAGE_X} page-in space-y-5 py-4 pb-44 md:py-6 md:pb-8`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="m-0 text-title font-bold">{t("cart.title")}</h1>
        <Link to="/shop" className="inline-flex min-h-12 items-center text-sm font-semibold text-brand-strong no-underline hover-fine:hover:underline">{t("cart.continue")}</Link>
      </div>
      {blocked && (
        <Alert tone="warning">
          <p className="m-0 font-semibold">{t("cart.problem", { n: problems.length })}</p>
          <Button size="sm" variant="secondary" className="mt-2" onClick={fixAll}>{t("cart.fix_all")}</Button>
        </Alert>
      )}
      <div className="md:grid md:grid-cols-[minmax(0,1fr)_22rem] md:items-start md:gap-8">
        <ul className="m-0 list-none divide-y divide-[var(--line)] rounded-lg border border-line bg-surface p-0">
          {rows.map(({ i, l }) => {
            const issue = l ? lineIssue(i.quantity, l.available, l.min_qty) : "out";
            const out = issue === "out";
            const over = issue === "over";
            const name = l ? pick(locale, l.name_en, l.name_ne) : t("cart.unavailable");
            return (
              <li key={i.productId} className="flex gap-3 p-3 sm:gap-4 sm:p-4">
                <span className="size-20 shrink-0 overflow-hidden rounded-md bg-surface-2 sm:size-24">
                  {l?.image ? <img src={imageUrl(l.image)!} alt="" width={96} height={96} loading="lazy" referrerPolicy="no-referrer" className={`size-full object-cover ${out ? "grayscale" : ""}`} /> : <ProductFallback categoryId={l?.category_id} size={28} />}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-3">
                    {l ? <Link to={`/product/${l.slug}`} className="line-clamp-2 font-semibold text-ink no-underline hover-fine:hover:underline">{name}</Link> : <p className="m-0 text-muted">{name}</p>}
                    {l && !out && <p className="m-0 shrink-0 font-bold tabular">{formatNpr(unit(l) * Math.min(i.quantity, l.available))}</p>}
                  </div>
                  {l && <p className="m-0 text-sm text-muted tabular">{t("cart.each", { price: formatNpr(unit(l)) })}{l.discount_price_paisa != null && <s className="ml-2">{formatNpr(l.price_paisa)}</s>}</p>}
                  {out && l && <Badge tone="danger" className="w-fit">{t("product.out")}</Badge>}
                  {over && l && <Badge tone="warning" className="w-fit">{t("cart.only_n", { n: l.available })}</Badge>}
                  {issue === "below_min" && l && <Badge tone="warning" className="w-fit">{t("product.min_qty", { n: l.min_qty })}</Badge>}
                  <div className="mt-auto flex items-center gap-2 pt-1">
                    {l && !out && <QtyStepper value={Math.min(i.quantity, l.available)} floor={Math.min(l.min_qty, i.quantity)} max={Math.min(99, l.available)} onChange={(n) => setQty(i.productId, n)}
                      labels={{ group: t("card.qty_in_cart", { name }), less: t("pdp.less"), more: t("pdp.more") }} />}
                    <IconButton className="ml-auto" variant="ghost" icon={Trash2} label={t("cart.remove_named", { name })} onClick={() => undo(i.productId, i.quantity)} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside aria-label={t("cart.summary")} className="mt-4 hidden space-y-4 rounded-lg border border-line bg-surface p-5 md:sticky md:top-20 md:mt-0 md:block">
          <h2 className="m-0 text-section font-bold">{t("cart.summary")}</h2>
          <dl className="m-0 space-y-2 text-[0.9375rem]">
            <div className="flex justify-between gap-3"><dt>{t("cart.items_n", { n: count })}</dt><dd className="m-0 tabular">{formatNpr(subtotal + savings)}</dd></div>
            {savings > 0 && <div className="flex justify-between gap-3 text-success"><dt>{t("cart.savings")}</dt><dd className="m-0 tabular">−{formatNpr(savings)}</dd></div>}
            <div className="flex justify-between gap-3 text-muted"><dt>{t("cart.delivery")}</dt><dd className="m-0 text-right">{minFee != null ? t("cart.delivery_from", { fee: formatNpr(minFee) }) : t("cart.delivery_later")}</dd></div>
            <div className="flex justify-between gap-3 border-t border-line pt-3 text-lg font-bold"><dt>{t("cart.subtotal")}</dt><dd className="m-0 tabular">{formatNpr(subtotal)}</dd></div>
          </dl>
          {threshold != null && (
            <div>
              <p className="m-0 text-sm font-semibold text-ink">{left === 0 ? t("cart.free_reached") : t("cart.free_progress", { amount: formatNpr(left ?? 0) })}</p>
              <div role="progressbar" aria-valuemin={0} aria-valuemax={threshold} aria-valuenow={Math.min(subtotal, threshold)} aria-label={t("cart.free_label")} className="mt-1.5 h-2 overflow-hidden rounded-pill bg-surface-2">
                <div className="h-full bg-brand-strong transition-[width] duration-[var(--duration-3)]" style={{ width: `${Math.min(100, (subtotal / threshold) * 100)}%` }} />
              </div>
            </div>
          )}
          <p className="m-0 text-sm text-muted">{t("cart.delivery_note")}</p>
          {checkout}
          <Button block variant="ghost" onClick={clear}>{t("cart.clear")}</Button>
        </aside>
      </div>

      {/* Compact: summary bar above the bottom nav. */}
      <GlassPanel shape="dialog" className="fixed inset-x-2 z-30 space-y-2 p-3 md:hidden" style={{ bottom: "calc(72px + var(--safe-bottom))" }}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-ink"><p className="m-0 text-sm">{t("cart.items_n", { n: count })}</p><p className="m-0 text-lg font-bold tabular">{formatNpr(subtotal)}</p></div>
          <div className="shrink-0">{blocked ? <Button disabled>{t("cart.checkout")}</Button> : <Link to="/checkout" className={buttonStyles({ variant: "primary", size: "lg" })}>{t("cart.checkout")}</Link>}</div>
        </div>
        {threshold != null && left! > 0 && <p className="m-0 text-xs text-ink">{t("cart.free_progress", { amount: formatNpr(left!) })}</p>}
      </GlassPanel>
    </main>
  );
}
