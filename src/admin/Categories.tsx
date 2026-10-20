import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Card, ChevronDown, EmptyState, Field, IconButton, Input, Package, Plus, Skeleton, Switch, Trash2, toast } from "@/ui";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { useTitle } from "@/components/ui";
import { ConfirmDialog } from "./ConfirmDialog";

type Cat = { id: string; slug: string; name_en: string; name_ne: string | null; sort_order: number; is_active: boolean; products: { count: number }[] };
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "category";

/** Add, rename, reorder, hide and delete categories. Deleting is blocked by the database while products use the category. */
export default function Categories() {
  const { t } = useT();
  const qc = useQueryClient();
  useTitle(t("admin.categories"));
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<Cat | null>(null);
  const q = useQuery({
    queryKey: ["admin", "categories"], staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id,slug,name_en,name_ne,sort_order,is_active,products(count)").order("sort_order");
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Cat[];
    },
  });
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["admin", "categories"] }); void qc.invalidateQueries({ queryKey: ["categories"] }); };
  const fail = (m: string) => toast.error(m);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget; const d = new FormData(form);
    const name_en = String(d.get("name_en") ?? "").trim(); if (!name_en) return;
    setBusy(true);
    const base = slugify(name_en);
    const { error } = await supabase.from("categories").insert({ name_en, name_ne: String(d.get("name_ne") ?? "").trim() || null, slug: base, sort_order: (q.data?.length ?? 0) + 1 });
    if (error?.code === "23505") { // slug taken: retry once with a suffix
      const r = await supabase.from("categories").insert({ name_en, name_ne: String(d.get("name_ne") ?? "").trim() || null, slug: `${base}-${Math.random().toString(36).slice(2, 5)}`, sort_order: (q.data?.length ?? 0) + 1 });
      if (r.error) { setBusy(false); return fail(r.error.message); }
    } else if (error) { setBusy(false); return fail(error.message); }
    setBusy(false); form.reset(); toast.success(t("common.saved")); refresh();
  }
  async function rename(c: Cat, name_en: string, name_ne: string) {
    if (!name_en.trim() || (name_en === c.name_en && name_ne === (c.name_ne ?? ""))) return;
    const { error } = await supabase.from("categories").update({ name_en: name_en.trim(), name_ne: name_ne.trim() || null }).eq("id", c.id);
    if (error) fail(error.message); else { toast.success(t("common.saved")); refresh(); }
  }
  async function toggle(c: Cat, on: boolean) {
    const { error } = await supabase.from("categories").update({ is_active: on }).eq("id", c.id);
    if (error) fail(error.message); else refresh();
  }
  async function move(i: number, dir: -1 | 1) {
    const list = q.data!; const a = list[i], b = list[i + dir]; if (!a || !b) return;
    setBusy(true);
    await Promise.all([supabase.from("categories").update({ sort_order: b.sort_order }).eq("id", a.id), supabase.from("categories").update({ sort_order: a.sort_order }).eq("id", b.id)]);
    setBusy(false); refresh();
  }
  async function remove(c: Cat) {
    setBusy(true);
    if (c.products?.[0]?.count) await supabase.from("products").update({ category_id: null }).eq("category_id", c.id);
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    setBusy(false); setDel(null);
    if (error) fail(error.code === "23503" ? t("admin.cat.in_use") : error.message); else { toast.success(t("admin.cat.deleted")); refresh(); }
  }

  return (
    <main className="space-y-4">
      <h1 className="m-0 text-3xl font-bold">{t("admin.categories")}</h1>
      <Card>
        <form onSubmit={(e) => void add(e)} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label={t("admin.name_en")} required>{(a) => <Input {...a} name="name_en" maxLength={80} />}</Field>
          <Field label={t("admin.name_ne")}>{(a) => <Input {...a} name="name_ne" lang="ne" maxLength={120} />}</Field>
          <Button type="submit" leadingIcon={Plus} loading={busy}>{t("admin.cat.add")}</Button>
        </form>
      </Card>

      {q.isLoading ? <Skeleton variant="row" className="h-32" /> : !q.data?.length ? (
        <EmptyState icon={Package} title={t("admin.cat.empty")} description={t("admin.cat.empty_hint")} />
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {q.data.map((c, i) => {
            const n = c.products?.[0]?.count ?? 0;
            return (
              <li key={c.id}>
                <Card className="space-y-3">
                  <form className="grid gap-2 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); void rename(c, String(d.get("name_en")), String(d.get("name_ne"))); }}>
                    <Field label={t("admin.name_en")}>{(a) => <Input {...a} name="name_en" defaultValue={c.name_en} />}</Field>
                    <Field label={t("admin.name_ne")}>{(a) => <Input {...a} name="name_ne" lang="ne" defaultValue={c.name_ne ?? ""} />}</Field>
                    <Button type="submit" variant="secondary" size="sm" className="sm:col-span-2 sm:w-fit">{t("admin.save")}</Button>
                  </form>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge>{t("admin.cat.products", { n })}</Badge>
                    <Switch checked={c.is_active} onCheckedChange={(v) => void toggle(c, v)} label={c.is_active ? t("admin.active") : t("admin.hidden")} />
                    <span className="ml-auto flex gap-1">
                      <IconButton icon={ChevronDown} className="rotate-180" label={t("admin.move_left")} variant="ghost" disabled={busy || i === 0} onClick={() => void move(i, -1)} />
                      <IconButton icon={ChevronDown} label={t("admin.move_right")} variant="ghost" disabled={busy || i === q.data!.length - 1} onClick={() => void move(i, 1)} />
                      <IconButton icon={Trash2} label={t("cart.remove")} variant="ghost" onClick={() => setDel(c)} />
                    </span>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDialog open={!!del} onOpenChange={(v) => { if (!v) setDel(null); }} title={t("admin.cat.delete")} danger busy={busy}
        body={del && (del.products?.[0]?.count ? t("admin.cat.delete_used", { name: del.name_en, n: del.products[0].count }) : t("admin.cat.delete_body", { name: del.name_en }))}
        confirmLabel={t("cart.remove")} onConfirm={() => del && void remove(del)} />
    </main>
  );
}
