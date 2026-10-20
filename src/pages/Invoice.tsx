import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useT, pick, dateLocale } from "@/lib/i18n";
import { formatNpr } from "@/lib/money";
import { useQuery } from "@/lib/useQuery";
import { Loading, useTitle } from "@/components/ui";

type Item = { id: string; name_en: string; name_ne: string | null; quantity: number; unit_price_paisa: number; line_total_paisa: number };

export default function Invoice() {
  const { id } = useParams();
  const { t, locale } = useT();
  useTitle(t("invoice.title"));
  const { data, loading } = useQuery(async () => {
    // RLS limits this to the customer's own order or staff with orders.view.
    const [o, s] = await Promise.all([
      supabase.from("orders").select("*, order_items(*)").eq("id", id!).maybeSingle(),
      supabase.from("store_settings").select("store_name,contact_phone,contact_email,business_info,policies").single(),
    ]);
    return { o: o.data, s: s.data };
  }, [id]);
  if (loading && !data) return <Loading />;
  const o = data?.o;
  if (!o) return <main className="container-page py-16 text-center"><h1 className="text-2xl font-bold">404</h1></main>;

  const s = data!.s;
  const biz = (s?.business_info ?? {}) as { legal_name?: string; address?: string; pan?: string; vat?: string };
  const pol = (s?.policies ?? {}) as { returns_en?: string; returns_ne?: string };
  const returns = locale === "ne" ? pol.returns_ne || pol.returns_en : pol.returns_en;
  const date = new Date(o.placed_at).toLocaleDateString(dateLocale(locale), { dateStyle: "long" });

  return (
    <main className="container-page max-w-2xl space-y-4" style={{ background: "#fff", color: "#111" }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="m-0 text-2xl font-bold">{biz.legal_name || s?.store_name}</h1>
          {biz.address && <p className="m-0">{biz.address}</p>}
          {s?.contact_phone && <p className="m-0">{s.contact_phone}</p>}
          {biz.pan && <p className="m-0">PAN: {biz.pan}</p>}
          {biz.vat && <p className="m-0">VAT: {biz.vat}</p>}
        </div>
        <div className="text-right">
          <h2 className="m-0 text-xl font-semibold">{t("invoice.title")}</h2>
          <p className="m-0">{o.order_number}</p>
          <p className="m-0">{date}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><p className="m-0 font-semibold">{t("invoice.bill_to")}</p><p className="m-0">{o.customer_name}</p><p className="m-0">{o.customer_phone}</p></div>
        <div><p className="m-0 font-semibold">{t("invoice.ship_to")}</p><p className="m-0">{o.ship_recipient}</p><p className="m-0">{o.ship_address_line}{o.ship_landmark ? `, ${o.ship_landmark}` : ""}</p><p className="m-0">{[o.ship_municipality, o.ship_district].filter(Boolean).join(", ")}</p></div>
      </div>
      <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
        <thead><tr className="text-left" style={{ borderBottom: "1px solid #111" }}><th className="py-1">{t("invoice.item")}</th><th>{t("invoice.qty")}</th><th className="text-right">{t("invoice.price")}</th><th className="text-right">{t("invoice.total")}</th></tr></thead>
        <tbody>
          {(o.order_items as Item[]).map((i) => (
            <tr key={i.id} style={{ borderBottom: "1px solid #ddd" }}><td className="py-1">{pick(locale, i.name_en, i.name_ne)}</td><td>{i.quantity}</td><td className="text-right">{formatNpr(i.unit_price_paisa)}</td><td className="text-right">{formatNpr(i.line_total_paisa)}</td></tr>
          ))}
        </tbody>
      </table>
      <dl className="m-0 ml-auto w-64 space-y-1 text-sm">
        <div className="flex justify-between"><dt>{t("checkout.items")}</dt><dd className="m-0">{formatNpr(o.items_list_total_paisa)}</dd></div>
        {o.item_discount_paisa > 0 && <div className="flex justify-between"><dt>{t("checkout.discount")}</dt><dd className="m-0">− {formatNpr(o.item_discount_paisa)}</dd></div>}
        {o.coupon_discount_paisa > 0 && <div className="flex justify-between"><dt>{t("checkout.coupon_discount")}</dt><dd className="m-0">− {formatNpr(o.coupon_discount_paisa)}</dd></div>}
        <div className="flex justify-between"><dt>{t("checkout.delivery")}</dt><dd className="m-0">{formatNpr(o.delivery_fee_paisa)}</dd></div>
        <div className="flex justify-between pt-1 text-lg font-bold" style={{ borderTop: "1px solid #111" }}><dt>{t("checkout.total")}</dt><dd className="m-0">{formatNpr(o.total_paisa)}</dd></div>
        <div className="flex justify-between"><dt>{t("checkout.payment")}</dt><dd className="m-0">{o.payment_method.toUpperCase()} · {t(`pay.${o.payment_status}`)}</dd></div>
      </dl>
      {returns && <p className="whitespace-pre-line pt-4 text-xs">{returns}</p>}
      <button className="btn btn-primary no-print" onClick={() => window.print()}>🖨 {t("invoice.print")}</button>
    </main>
  );
}
