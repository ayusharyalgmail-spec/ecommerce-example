import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { importProducts } from "@/lib/api";
import { parseCsv, toCsv } from "@/lib/csv";
import { useTitle } from "@/components/ui";

function download(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export default function ImportExport() {
  const { t } = useT();
  useTitle(t("admin.csv"));
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ processed: number; errors: { row: number; error: string }[] } | null>(null);

  async function exportProducts() {
    const { data } = await supabase.from("products").select("sku,name_en,name_ne,description_en,description_ne,price_paisa,discount_price_paisa,stock_quantity,status,categories(slug)").order("created_at");
    download("products", toCsv([
      ["sku", "name_en", "name_ne", "description_en", "description_ne", "price_paisa", "discount_price_paisa", "stock_quantity", "category_slug", "status"],
      ...(data ?? []).map((p) => [p.sku, p.name_en, p.name_ne, p.description_en, p.description_ne, p.price_paisa, p.discount_price_paisa, p.stock_quantity, (p.categories as unknown as { slug: string } | null)?.slug ?? "", p.status]),
    ]));
  }
  async function exportOrders() {
    const cols = ["order_number", "placed_at", "status", "payment_method", "payment_status", "customer_name", "customer_phone", "delivery_zone_name", "items_list_total_paisa", "item_discount_paisa", "coupon_discount_paisa", "delivery_fee_paisa", "total_paisa"];
    const { data } = await supabase.from("orders").select(cols.join(",")).order("placed_at", { ascending: false });
    download("orders", toCsv([cols, ...((data ?? []) as unknown as Record<string, string | number | null>[]).map((o) => cols.map((c) => o[c]))]));
  }

  return (
    <main className="max-w-2xl space-y-4">
      <h1 className="text-3xl font-bold">{t("admin.csv")}</h1>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-secondary" onClick={exportProducts}>⬇ Products CSV</button>
        <button className="btn btn-secondary" onClick={exportOrders}>⬇ Orders CSV</button>
      </div>
      <p className="muted text-sm">Columns: sku, name_en, name_ne, description_en, description_ne, price_paisa, discount_price_paisa, stock_quantity, category_slug. Rows with a known SKU update that product; others are created as drafts.</p>
      <div className="card space-y-3">
        <input type="file" accept=".csv,text/csv" disabled={busy} aria-label="CSV file" onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          if (f.size > 2 * 1024 * 1024) { setRes({ processed: 0, errors: [{ row: 0, error: "File too large (max 2 MB)" }] }); return; }
          setBusy(true);
          setRes(await importProducts(parseCsv(await f.text()).slice(0, 1000)));
          setBusy(false);
        }} />
        {res && (
          <div role="status" className="space-y-1">
            <p className="badge badge-ok m-0">Processed: {res.processed}</p>
            {res.errors.map((er, i) => <p key={i} className="alert" style={{ background: "var(--color-surface-error)", color: "var(--color-error)" }}>Row {er.row}: {er.error}</p>)}
          </div>
        )}
      </div>
    </main>
  );
}
