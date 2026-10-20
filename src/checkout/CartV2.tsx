import { Link } from "react-router-dom";
import { useQuery as useTan } from "@tanstack/react-query";
import { Alert, Badge, Button, buttonStyles, EmptyState, GlassPanel, IconButton, ImageOff, Minus, Plus, ShoppingCart, Skeleton, Trash2, toast } from "@/ui";
import { useCart } from "@/lib/cart";
import { useT, pick } from "@/lib/i18n";
import { loadCartProducts } from "@/lib/api";
import { formatNpr } from "@/lib/money";
import { imageUrl, supabase } from "@/lib/supabase";
import { useTitle } from "@/components/ui";
import { PAGE_X } from "@/catalog/layout";

export default function CartV2() {
  const { items, setQty, remove, clear, add } = useCart();
  const { t, locale } = useT();
  useTitle(t("cart.title"));
  const ids = items.map((i) => i.productId).sort();
  const lines = useTan({ queryKey: ["cart-lines", ids], enabled: ids.length > 0, staleTime: 0, queryFn: () => loadCartProducts(ids) });
  const threshold = useTan({
    queryKey: ["free-delivery"], staleTime: 10 * 60_000,
    queryFn: async () => ((await supabase.from("store_settings").select("free_delivery_threshold_paisa").single()).data?.free_delivery_threshold_paisa ?? null) as number | null,
  }).data;

  if (!items.length) {
    return (
      <main className={`${PAGE_X} py-8`}>
        <EmptyState icon={ShoppingCart} title={t("cart.empty")} description={t("cart.empty.body")} action={<Link to="/shop" className={buttonStyles({ variant: "primary", size: "lg" })}>{t("cart.continue")}</Link>} />
      </main>
    );
  }
  if (lines.isLoading) return <main className={`${PAGE_X} space-y-3 py-4`}>{[0, 1, 2].map((i) => <Skeleton key={i} variant="row" className="h-28" />)}</main>;

  const byId = new Map((lines.data ?? []).map((l) => [l.id, l]));
  const rows = items.map((i) => ({ i, l: byId.get(i.productId) }));
  const problems = rows.filter(({ i, l }) => !l || l.available <= 0 || i.quantity > l.available);
  const blocked = problems.length > 0;
  const subtotal = rows.reduce((n, { i, l }) => (l && l.available > 0 ? n + (l.discount_price_paisa ?? l.price_paisa) * Math.min(i.quantity, l.available) : n), 0);
  const undo = (id: string, qty: number) => { remove(id); toast.info(t("cart.removed"), { action: { label: t("common.undo"), onClick: () => add(id, qty) } }); };
  const fixAll = () => problems.forEach(({ i, l }) => { if (!l || l.available <= 0) remove(i.productId); else setQty(i.productId, l.available); });
  const left = threshold != null ? Math.max(0, threshold - subtotal) : null;

  const summary = (
    <div className="space-y-3">
      {threshold != null && (
        <div>
          <p className="m-0 text-sm font-semibold text-ink">{left === 0 ? t("cart.free_reached") : t("cart.free_progress", { amount: formatNpr(left ?? 0) })}</p>
          <div role="progressbar" aria-valuemin={0} aria-valuemax={threshold} aria-valuenow={Math.min(subtotal, threshold)} aria-label={t("cart.free_label")} className="mt-1 h-2 overflow-hidden rounded-pill bg-surface-2">
            <div className="h-full bg-brand-strong" style={{ width: `${Math.min(100, (subtotal / threshold) * 100)}%` }} />
          </div>
        </div>
      )}
      <p className="m-0 flex justify-between text-lg font-bold"><span>{t("cart.subtotal")}</span><span>{formatNpr(subtotal)}</span></p>
      <p className="m-0 text-sm text-muted">{t("cart.delivery_note")}</p>
    </div>
  );

  return (
    <main className={`${PAGE_X} space-y-4 py-4 pb-44 md:pb-8`}>
      <h1 className="m-0 text-3xl font-bold">{t("cart.title")} ({items.length})</h1>
      {blocked && (
        <Alert tone="warning">
          <p className="m-0 font-semibold">{t("cart.problem", { n: problems.length })}</p>
          <Button size="sm" variant="secondary" className="mt-2" onClick={fixAll}>{t("cart.fix_all")}</Button>
        </Alert>
      )}
      <div className="md:grid md:grid-cols-[1fr_20rem] md:items-start md:gap-8">
        <ul className="m-0 list-none space-y-3 p-0">
          {rows.map(({ i, l }) => {
            const out = !l || l.available <= 0;
            const over = !!l && l.available > 0 && i.quantity > l.available;
            return (
              <li key={i.productId} className="flex gap-3 rounded-lg border border-line bg-surface p-3">
                {l?.image ? <img src={imageUrl(l.image)!} alt="" width={96} height={96} loading="lazy" className={`size-24 shrink-0 rounded-md object-cover ${out ? "grayscale" : ""}`} />
                  : <span aria-hidden className="flex size-24 shrink-0 items-center justify-center rounded-md bg-surface-2 text-muted"><ImageOff size={28} strokeWidth={1.5} /></span>}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {l ? <Link to={`/product/${l.slug}`} className="line-clamp-2 font-semibold text-ink no-underline">{pick(locale, l.name_en, l.name_ne)}</Link> : <p className="m-0 text-muted">{t("cart.unavailable")}</p>}
                  {l && <p className="m-0 font-bold">{formatNpr(l.discount_price_paisa ?? l.price_paisa)}</p>}
                  {out && l && <Badge tone="danger">{t("product.out")}</Badge>}
                  {over && l && <Badge tone="warning">{t("cart.only_n", { n: l.available })}</Badge>}
                  <div className="mt-auto flex items-center gap-1">
                    {l && !out && (
                      <div role="group" aria-label={t("product.qty")} className="flex items-center">
                        <IconButton variant="secondary" icon={Minus} label={t("pdp.less")} onClick={() => setQty(i.productId, i.quantity - 1)} />
                        <span aria-live="polite" className="w-10 text-center font-semibold">{i.quantity}</span>
                        <IconButton variant="secondary" icon={Plus} label={t("pdp.more")} disabled={i.quantity >= l.available} onClick={() => setQty(i.productId, Math.min(l.available, i.quantity + 1))} />
                      </div>
                    )}
                    <IconButton className="ml-auto" variant="ghost" icon={Trash2} label={t("cart.remove")} onClick={() => undo(i.productId, i.quantity)} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside aria-label={t("cart.summary")} className="mt-4 hidden space-y-4 rounded-lg border border-line bg-surface p-4 md:sticky md:top-20 md:mt-0 md:block">
          {summary}
          {blocked ? <Button block size="lg" disabled>{t("cart.checkout")}</Button> : <Link to="/checkout" className={`${buttonStyles({ variant: "primary", size: "lg", block: true })}`}>{t("cart.checkout")}</Link>}
          <Button block variant="ghost" onClick={clear}>{t("cart.clear")}</Button>
        </aside>
      </div>

      {/* Compact: glass summary bar floating above the bottom nav. */}
      <GlassPanel shape="dialog" className="fixed inset-x-3 z-30 space-y-2 p-3 md:hidden" style={{ bottom: "calc(84px + var(--safe-bottom))" }}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-ink"><p className="m-0 text-sm">{t("cart.subtotal")}</p><p className="m-0 text-lg font-bold">{formatNpr(subtotal)}</p></div>
          {blocked ? <Button disabled>{t("cart.checkout")}</Button> : <Link to="/checkout" className={buttonStyles({ variant: "primary", size: "lg" })}>{t("cart.checkout")}</Link>}
        </div>
        {threshold != null && left! > 0 && <p className="m-0 text-xs text-ink">{t("cart.free_progress", { amount: formatNpr(left!) })}</p>}
      </GlassPanel>
    </main>
  );
}
