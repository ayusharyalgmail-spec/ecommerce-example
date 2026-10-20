import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, buttonStyles, Checkbox, EmptyState, Field, Input, Package, Plus, Popover, Select, Skeleton, toast } from "@/ui";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { formatNpr } from "@/lib/money";
import { adjustStock } from "@/lib/api";
import { useTitle } from "@/components/ui";

type Row = { id: string; name_en: string; sku: string | null; status: string; price_paisa: number; stock_quantity: number; reserved_quantity: number; low_stock_threshold: number };
const COLS = ["sku", "price", "stock", "status"] as const;
type Col = (typeof COLS)[number];
const readCols = (): Record<Col, boolean> => { try { return { sku: true, price: true, stock: true, status: true, ...JSON.parse(localStorage.getItem("admin.cols") ?? "{}") }; } catch { return { sku: true, price: true, stock: true, status: true }; } };
const tone = (s: string) => (s === "published" ? "success" : s === "archived" ? "danger" : "warning") as "success" | "danger" | "warning";

function StockCell({ p, onDone }: { p: Row; onDone: () => void }) {
  const { t } = useT();
  const [d, setD] = useState("");
  const [busy, setBusy] = useState(false);
  const avail = p.stock_quantity - p.reserved_quantity;
  return (
    <div className="flex items-center gap-2">
      <span className={avail < p.low_stock_threshold ? "font-bold text-warning" : ""}>{p.stock_quantity}<span className="text-muted"> ({p.reserved_quantity})</span></span>
      <Input aria-label={`${t("admin.adjust")}: ${p.name_en}`} type="number" className="w-20" placeholder="±" value={d} onChange={(e) => setD(e.target.value)} />
      <Button size="sm" variant="secondary" loading={busy} disabled={!Number(d)} onClick={async () => {
        setBusy(true); const e = await adjustStock(p.id, Number(d), ""); setBusy(false);
        if (e) toast.error(t(`err.${e}`)); else { setD(""); toast.success(t("common.saved")); onDone(); }
      }}>{t("admin.save")}</Button>
    </div>
  );
}

export default function ProductsV2() {
  const { t } = useT();
  const qc = useQueryClient();
  useTitle(t("admin.products"));
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("");
  const [cols, setCols] = useState(readCols);
  const setCol = (c: Col, v: boolean) => setCols((x) => { const n = { ...x, [c]: v }; try { localStorage.setItem("admin.cols", JSON.stringify(n)); } catch { /* blocked */ } return n; });
  const q = useQuery({
    queryKey: ["admin", "products"], staleTime: 15_000,
    queryFn: async () => ((await supabase.from("products").select("id,name_en,sku,status,price_paisa,stock_quantity,reserved_quantity,low_stock_threshold").order("created_at", { ascending: false })).data ?? []) as Row[],
  });
  const rows = useMemo(() => (q.data ?? []).filter((p) => (!status || p.status === status) && (!term.trim() || `${p.name_en} ${p.sku ?? ""}`.toLowerCase().includes(term.trim().toLowerCase()))), [q.data, term, status]);
  const reload = () => void qc.invalidateQueries({ queryKey: ["admin", "products"] });
  const colLabel: Record<Col, string> = { sku: t("admin.sku"), price: t("admin.price"), stock: t("admin.stock"), status: t("admin.status") };

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="m-0 text-3xl font-bold">{t("admin.products")}</h1>
        <Link to="/admin/products/new" className={buttonStyles({ variant: "primary" })}><Plus aria-hidden size={20} strokeWidth={2} />{t("admin.new_product")}</Link>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <Field label={t("admin.products.search")} className="min-w-[12rem] flex-1">{(a) => <Input {...a} type="search" value={term} onChange={(e) => setTerm(e.target.value)} />}</Field>
        <Field label={t("admin.status")}>{(a) => <Select {...a} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">{t("admin.tab.all")}</option><option value="published">published</option><option value="draft">draft</option><option value="archived">archived</option></Select>}</Field>
        <span className="hidden md:block">
          <Popover trigger={<Button variant="secondary">{t("admin.columns")}</Button>}>
            <fieldset className="m-0 border-0 p-0"><legend className="sr-only-text">{t("admin.columns")}</legend>
              {COLS.map((c) => <Checkbox key={c} label={colLabel[c]} checked={cols[c]} onChange={(e) => setCol(c, e.target.checked)} />)}
            </fieldset>
          </Popover>
        </span>
      </div>

      {q.isLoading ? <Skeleton variant="row" className="h-40" /> : !rows.length ? (
        <EmptyState icon={Package} title={t("admin.products.empty")} action={<Link to="/admin/products/new" className={buttonStyles({ variant: "primary" })}>{t("admin.new_product")}</Link>} />
      ) : (
        <>
          <div className="hidden max-h-[70dvh] overflow-auto rounded-lg border border-line bg-surface md:block">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only-text">{t("admin.products")}</caption>
              <thead className="sticky top-0 z-10 bg-surface-2">
                <tr><th scope="col" className="p-3">{t("admin.name_en")}</th>{cols.sku && <th scope="col" className="p-3">{colLabel.sku}</th>}{cols.price && <th scope="col" className="p-3">{colLabel.price}</th>}{cols.stock && <th scope="col" className="p-3">{colLabel.stock}</th>}{cols.status && <th scope="col" className="p-3">{colLabel.status}</th>}</tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-t border-line">
                    <th scope="row" className="p-3 font-semibold"><Link to={`/admin/products/${p.id}`} className="text-ink underline">{p.name_en}</Link></th>
                    {cols.sku && <td className="p-3 text-muted">{p.sku ?? "—"}</td>}
                    {cols.price && <td className="p-3">{formatNpr(p.price_paisa)}</td>}
                    {cols.stock && <td className="p-3"><StockCell p={p} onDone={reload} /></td>}
                    {cols.status && <td className="p-3"><Badge tone={tone(p.status)}>{p.status}</Badge></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="m-0 list-none space-y-2 p-0 md:hidden">
            {rows.map((p) => (
              <li key={p.id} className="space-y-2 rounded-lg border border-line bg-surface p-3">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/admin/products/${p.id}`} className="font-semibold text-ink underline">{p.name_en}</Link><Badge tone={tone(p.status)}>{p.status}</Badge>
                </div>
                <p className="m-0 text-sm text-muted">{formatNpr(p.price_paisa)}</p>
                <StockCell p={p} onDone={reload} />
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
