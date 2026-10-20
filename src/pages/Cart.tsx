import { Link } from "react-router-dom";
import { ShoppingCart, ImageOff } from "@/ui";
import { useCart } from "@/lib/cart";
import { useT } from "@/lib/i18n";
import { loadCartProducts } from "@/lib/api";
import { formatNpr } from "@/lib/money";
import { imageUrl } from "@/lib/supabase";
import { useQuery } from "@/lib/useQuery";
import { Loading, useTitle } from "@/components/ui";

export default function Cart() {
  const { items, setQty, remove, clear } = useCart();
  const { t, locale } = useT();
  useTitle(t("cart.title"));
  const key = items.map((i) => i.productId).sort().join(",");
  const { data: lines, loading } = useQuery(() => loadCartProducts(items.map((i) => i.productId)), [key]);

  if (!items.length)
    return (
      <main className="container-page py-16 text-center">
        <ShoppingCart aria-hidden size={56} strokeWidth={1.5} className="mx-auto" />
        <h1 className="mt-2 text-xl font-semibold">{t("cart.empty")}</h1>
        <Link to="/shop" className="btn btn-primary mt-4">{t("cart.continue")}</Link>
      </main>
    );
  if (loading && !lines) return <Loading />;

  const byId = new Map((lines ?? []).map((l) => [l.id, l]));
  const rows = items.map((i) => ({ i, l: byId.get(i.productId) }));
  const blocked = rows.some(({ i, l }) => !l || l.available <= 0 || i.quantity > l.available);
  const subtotal = rows.reduce((n, { i, l }) => (l && l.available > 0 ? n + (l.discount_price_paisa ?? l.price_paisa) * i.quantity : n), 0);

  return (
    <main className="container-page space-y-4">
      <h1 className="text-3xl font-bold">{t("cart.title")} ({items.length})</h1>
      <ul className="m-0 list-none space-y-3 p-0">
        {rows.map(({ i, l }) => (
          <li key={i.productId} className="card flex gap-3">
            {l ? (
              <>
                {l.image ? <img src={imageUrl(l.image)!} alt="" className="h-20 w-20 rounded-lg object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-surface-2 text-muted" aria-hidden><ImageOff size={28} strokeWidth={1.5} /></div>}
                <div className="flex-1">
                  <Link to={`/product/${l.slug}`} className="font-medium no-underline">{locale === "ne" && l.name_ne ? l.name_ne : l.name_en}</Link>
                  <p className="m-0 font-bold">{formatNpr(l.discount_price_paisa ?? l.price_paisa)}</p>
                  {l.available <= 0 && <p className="badge badge-err m-0">{t("product.out")}</p>}
                  {l.available > 0 && i.quantity > l.available && <p className="badge badge-warn m-0">{t("product.low", { n: l.available })}</p>}
                  <div className="mt-2 flex items-center gap-2">
                    <button className="btn btn-secondary !px-3 !py-1" aria-label="-" onClick={() => setQty(i.productId, i.quantity - 1)}>−</button>
                    <span className="w-8 text-center" aria-live="polite">{i.quantity}</span>
                    <button className="btn btn-secondary !px-3 !py-1" aria-label="+" onClick={() => setQty(i.productId, Math.min(l.available, i.quantity + 1))}>+</button>
                    <button className="ml-auto text-sm underline" onClick={() => remove(i.productId)}>{t("cart.remove")}</button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="muted m-0 flex-1">{t("cart.unavailable")}</p>
                <button className="text-sm underline" onClick={() => remove(i.productId)}>{t("cart.remove")}</button>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="card space-y-3">
        <p className="m-0 flex justify-between text-lg font-semibold"><span>{t("cart.subtotal")}</span><span>{formatNpr(subtotal)}</span></p>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={clear}>{t("cart.clear")}</button>
          {blocked ? <button className="btn btn-primary flex-1" disabled>{t("cart.checkout")}</button> : <Link to="/checkout" className="btn btn-primary flex-1">{t("cart.checkout")}</Link>}
        </div>
      </div>
    </main>
  );
}
