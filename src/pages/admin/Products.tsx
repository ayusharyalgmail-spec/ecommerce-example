import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { formatNpr } from "@/lib/money";
import { useQuery } from "@/lib/useQuery";
import { Loading, useTitle } from "@/components/ui";

export default function AdminProducts() {
  const { t } = useT();
  useTitle(t("admin.products"));
  const { data, loading } = useQuery(async () => (await supabase.from("products").select("id,name_en,status,price_paisa,stock_quantity,reserved_quantity").order("created_at", { ascending: false })).data ?? [], []);
  const tone = (s: string) => (s === "published" ? "badge-ok" : s === "archived" ? "badge-err" : "badge-warn");
  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="m-0 text-3xl font-bold">{t("admin.products")}</h1>
        <Link to="/admin/products/new" className="btn btn-primary no-underline">+ {t("admin.new_product")}</Link>
      </div>
      {loading && !data ? <Loading /> : (
        <ul className="m-0 list-none space-y-2 p-0">
          {data?.map((p) => (
            <li key={p.id}>
              <Link to={`/admin/products/${p.id}`} className="card flex flex-wrap items-center justify-between gap-2 no-underline">
                <div><p className="m-0 font-semibold">{p.name_en}</p><p className="muted m-0 text-sm">{formatNpr(p.price_paisa)} · {t("admin.stock")}: {p.stock_quantity} ({p.reserved_quantity})</p></div>
                <span className={`badge ${tone(p.status)}`}>{p.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
