import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert, Archive, Badge, Button, Dialog, EmptyState, Eye, Field, ImagePlus, Input, Megaphone, Pencil, Plus, RefreshCw, Select, Skeleton, Tag, Textarea, Trash2, X, toast,
} from "@/ui";
import { useT, dateLocale } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { useCategories } from "@/lib/queries";
import { ImageError, prepareImage } from "@/lib/image";
import { randomUUID } from "@/lib/uuid";
import { tenantPath } from "@/lib/tenantScope";
import { MsgError, type FeedItem } from "@/messaging/api";
import { staffApi, type Campaign, type CampaignInput } from "@/messaging/staffApi";
import { safeCta } from "@/messaging/format";
import { Banner, FeedCard } from "@/messaging/MessageCards";

type Link = "none" | "product" | "category" | "custom";
type Form = {
  id: string | null; title: string; body: string; title_ne: string; body_ne: string; image: string | null; cta_label: string; cta_label_ne: string;
  link: Link; target: string; audience: Campaign["audience"]; starts: string; ends: string;
};
const blank = (): Form => ({ id: null, title: "", body: "", title_ne: "", body_ne: "", image: null, cta_label: "", cta_label_ne: "", link: "none", target: "", audience: "all", starts: "", ends: "" });

const toInput = (iso: string | null) => { if (!iso) return ""; const d = new Date(iso); const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const toIso = (v: string) => (v ? new Date(v).toISOString() : null);

function fromCampaign(c: Campaign): Form {
  const u = c.cta_url ?? "";
  const link: Link = !u ? "none" : u.startsWith("/product/") ? "product" : u.startsWith("/shop?category=") ? "category" : "custom";
  const target = link === "product" ? u.slice("/product/".length) : link === "category" ? decodeURIComponent(u.slice("/shop?category=".length)) : u;
  return { id: c.id, title: c.title, body: c.body, title_ne: c.title_ne ?? "", body_ne: c.body_ne ?? "", image: c.image_path, cta_label: c.cta_label ?? "", cta_label_ne: c.cta_label_ne ?? "", link, target, audience: c.audience, starts: toInput(c.starts_at), ends: toInput(c.ends_at) };
}
const ctaUrl = (f: Form) => (f.link === "none" || !f.target ? null : f.link === "product" ? `/product/${f.target}` : f.link === "category" ? `/shop?category=${encodeURIComponent(f.target)}` : f.target.trim());

function Editor({ kind, initial, onClose }: { kind: Campaign["kind"]; initial: Form; onClose: () => void }) {
  const { t } = useT();
  const qc = useQueryClient();
  const cats = useCategories().data ?? [];
  const products = useQuery({
    queryKey: ["admin", "msg", "products"], staleTime: 60_000,
    queryFn: async () => { const { data, error } = await supabase.from("products").select("slug,name_en").eq("status", "published").order("name_en").limit(300); if (error) throw new Error(error.message); return data ?? []; },
  });
  const [f, setF] = useState<Form>(initial);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<"" | "save" | "upload">("");
  const [alert, setAlert] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ n: number } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const saved = initial.image;
  const drop = (path: string | null) => { if (path) void supabase.storage.from("store-assets").remove([path]); };

  async function pick(file: File) {
    setAlert(null); setBusy("upload");
    try {
      const p = await prepareImage(file, 1600);
      const path = tenantPath(`messages/${randomUUID()}.${p.ext}`);
      const { error } = await supabase.storage.from("store-assets").upload(path, p.blob, { contentType: p.blob.type });
      if (error) throw error;
      if (f.image && f.image !== saved) drop(f.image); // an upload from this session that was replaced
      set("image", path);
    } catch (e) { setAlert(e instanceof ImageError ? t(`img.${e.code}`) : t("admin.msg.err.upload")); }
    setBusy("");
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!f.title.trim()) e.title = t("admin.msg.v.title");
    if (!f.body.trim()) e.body = t("admin.msg.v.body");
    if (f.starts && f.ends && new Date(f.ends) <= new Date(f.starts)) e.ends = t("admin.msg.v.dates");
    const url = ctaUrl(f);
    if (f.link !== "none" && !f.target) e.target = t("admin.msg.v.target");
    else if (url && !safeCta(url)) e.target = t("admin.msg.v.url");
    if (url && !f.cta_label.trim()) e.cta_label = t("admin.msg.v.cta");
    setErrs(e);
    return Object.keys(e).length === 0;
  }

  async function save(): Promise<string | null> {
    if (!validate()) return null;
    setBusy("save"); setAlert(null);
    const data: CampaignInput = {
      kind, title: f.title, body: f.body, title_ne: f.title_ne || null, body_ne: f.body_ne || null, image_path: f.image, cta_label: ctaUrl(f) ? f.cta_label : null,
      cta_label_ne: ctaUrl(f) ? f.cta_label_ne || null : null, cta_url: ctaUrl(f), audience: f.audience, starts_at: toIso(f.starts), ends_at: toIso(f.ends),
    };
    try {
      const id = await staffApi.saveCampaign(f.id, data);
      if (saved && saved !== f.image) drop(saved);
      setF((x) => ({ ...x, id }));
      void qc.invalidateQueries({ queryKey: ["admin", "msg"] });
      setBusy("");
      return id;
    } catch (e) {
      setAlert(e instanceof MsgError && e.code === "VALIDATION_FAILED" ? e.message.replace(/^VALIDATION_FAILED: /, "") : e instanceof MsgError && e.code === "FORBIDDEN" ? t("admin.msg.err.forbidden") : t("admin.msg.err.save"));
      setBusy("");
      return null;
    }
  }

  async function askPublish() {
    const id = await save();
    if (!id) return;
    try { setConfirm({ n: await staffApi.audience(f.audience) }); } catch { setAlert(t("admin.msg.err.save")); }
  }
  async function publish() {
    if (!f.id || publishing) return;
    setPublishing(true);
    try { await staffApi.setCampaignStatus(f.id, "published"); toast.success(t("admin.msg.published")); void qc.invalidateQueries({ queryKey: ["admin", "msg"] }); setConfirm(null); onClose(); }
    catch (e) { setConfirm(null); setAlert(e instanceof MsgError && e.code === "VALIDATION_FAILED" ? t("admin.msg.err.expired") : t("admin.msg.err.publish")); }
    setPublishing(false);
  }
  function cancel() { if (f.image && f.image !== saved) drop(f.image); onClose(); }

  const url = ctaUrl(f);
  const preview: FeedItem = { ref: "campaign", id: "preview", kind, at: new Date().toISOString(), unread: true, title: f.title || t("admin.msg.preview_title"), body: f.body || t("admin.msg.preview_body"),
    title_ne: f.title_ne || null, body_ne: f.body_ne || null, image_path: f.image, cta_label: f.cta_label, cta_label_ne: f.cta_label_ne, cta_url: url };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
      <form onSubmit={(e) => { e.preventDefault(); void save().then((id) => { if (id) toast.success(t("admin.msg.saved")); }); }} noValidate className="space-y-4 rounded-xl border border-line bg-surface p-4 shadow-[var(--e1)] sm:p-5">
        <h2 className="m-0 text-xl font-bold">{f.id ? t("admin.msg.edit") : kind === "alert" ? t("admin.msg.new_alert") : t("admin.msg.new_promo")}</h2>
        {alert && <Alert tone="danger">{alert}</Alert>}
        <Field label={t("admin.msg.f.title")} error={errs.title} required>{(a) => <Input {...a} value={f.title} maxLength={120} onChange={(e) => set("title", e.target.value)} />}</Field>
        <Field label={t("admin.msg.f.body")} error={errs.body} required>{(a) => <Textarea {...a} value={f.body} maxLength={1000} rows={4} onChange={(e) => set("body", e.target.value)} />}</Field>
        <details className="rounded-md border border-line p-3">
          <summary className="cursor-pointer font-semibold">{t("admin.msg.f.nepali")}</summary>
          <div className="mt-3 space-y-3">
            <Field label={t("admin.msg.f.title")}>{(a) => <Input {...a} lang="ne" value={f.title_ne} maxLength={120} onChange={(e) => set("title_ne", e.target.value)} />}</Field>
            <Field label={t("admin.msg.f.body")}>{(a) => <Textarea {...a} lang="ne" value={f.body_ne} maxLength={1000} rows={3} onChange={(e) => set("body_ne", e.target.value)} />}</Field>
            <Field label={t("admin.msg.f.cta_label")}>{(a) => <Input {...a} lang="ne" value={f.cta_label_ne} maxLength={40} onChange={(e) => set("cta_label_ne", e.target.value)} />}</Field>
          </div>
        </details>

        <div className="space-y-2">
          <p className="m-0 text-sm font-semibold text-ink">{t("admin.msg.f.image")}</p>
          {f.image && <div className="relative"><Banner path={f.image} className="rounded-lg" />
            <button type="button" onClick={() => { if (f.image !== saved) drop(f.image); set("image", null); }} aria-label={t("admin.msg.f.image_remove")} className="absolute right-2 top-2 flex size-10 items-center justify-center rounded-full bg-[var(--surface)] text-ink shadow-[var(--e1)]"><X aria-hidden size={18} /></button></div>}
          <label className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-md border border-line-strong px-4 font-semibold text-ink hover-fine:hover:bg-surface-2">
            <ImagePlus aria-hidden size={18} />{busy === "upload" ? t("common.loading") : f.image ? t("admin.msg.f.image_replace") : t("admin.msg.f.image_add")}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only-text" disabled={busy !== ""} onChange={(e) => { const file = e.target.files?.[0]; if (file) void pick(file); e.target.value = ""; }} />
          </label>
          <p className="m-0 text-sm text-muted">{t("admin.msg.f.image_hint")}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("admin.msg.f.link")}>
            {(a) => <Select {...a} value={f.link} onChange={(e) => setF((x) => ({ ...x, link: e.target.value as Link, target: "" }))}>
              <option value="none">{t("admin.msg.link.none")}</option><option value="product">{t("admin.msg.link.product")}</option><option value="category">{t("admin.msg.link.category")}</option><option value="custom">{t("admin.msg.link.custom")}</option>
            </Select>}
          </Field>
          {f.link === "product" && <Field label={t("admin.msg.link.product")} error={errs.target}>{(a) => <Select {...a} value={f.target} onChange={(e) => set("target", e.target.value)}><option value="">{t("admin.msg.choose")}</option>{(products.data ?? []).map((p) => <option key={p.slug} value={p.slug}>{p.name_en}</option>)}</Select>}</Field>}
          {f.link === "category" && <Field label={t("admin.msg.link.category")} error={errs.target}>{(a) => <Select {...a} value={f.target} onChange={(e) => set("target", e.target.value)}><option value="">{t("admin.msg.choose")}</option>{cats.map((c) => <option key={c.slug} value={c.slug}>{c.name_en}</option>)}</Select>}</Field>}
          {f.link === "custom" && <Field label={t("admin.msg.link.custom")} hint={t("admin.msg.f.url_hint")} error={errs.target}>{(a) => <Input {...a} value={f.target} maxLength={300} placeholder="/shop?sale=1" onChange={(e) => set("target", e.target.value)} />}</Field>}
        </div>
        {f.link !== "none" && <Field label={t("admin.msg.f.cta_label")} error={errs.cta_label}>{(a) => <Input {...a} value={f.cta_label} maxLength={40} onChange={(e) => set("cta_label", e.target.value)} />}</Field>}

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t("admin.msg.f.audience")}>{(a) => <Select {...a} value={f.audience} onChange={(e) => set("audience", e.target.value as Campaign["audience"])}><option value="all">{t("admin.msg.aud.all")}</option><option value="signed_in">{t("admin.msg.aud.signed_in")}</option><option value="guests">{t("admin.msg.aud.guests")}</option></Select>}</Field>
          <Field label={t("admin.msg.f.starts")} hint={t("admin.msg.f.starts_hint")}>{(a) => <Input {...a} type="datetime-local" value={f.starts} onChange={(e) => set("starts", e.target.value)} />}</Field>
          <Field label={t("admin.msg.f.ends")} error={errs.ends}>{(a) => <Input {...a} type="datetime-local" value={f.ends} onChange={(e) => set("ends", e.target.value)} />}</Field>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={cancel}>{t("common.cancel")}</Button>
          <Button type="submit" variant="secondary" loading={busy === "save"} disabled={busy === "upload"}>{t("admin.msg.save_draft")}</Button>
          <Button onClick={() => void askPublish()} disabled={busy !== "" || publishing}>{t("admin.msg.publish")}</Button>
        </div>
      </form>

      <aside aria-label={t("admin.msg.preview")} className="space-y-2 lg:sticky lg:top-24 lg:self-start">
        <p className="m-0 flex items-center gap-2 text-sm font-bold text-muted"><Eye aria-hidden size={16} />{t("admin.msg.preview")}</p>
        <FeedCard item={preview} onOpen={() => {}} onCta={() => {}} />
        <p className="m-0 text-xs text-muted">{t("admin.msg.preview_note")}</p>
      </aside>

      <Dialog open={!!confirm} onOpenChange={(o) => { if (!o && !publishing) setConfirm(null); }} title={t("admin.msg.confirm_title")} closeLabel={t("common.close")}
        description={t("admin.msg.confirm_body", { n: confirm?.n ?? 0, aud: t(`admin.msg.aud.${f.audience}`) })}>
        <p className="mb-0 mt-3 text-sm text-muted">{f.ends ? t("admin.msg.confirm_until", { when: new Date(f.ends).toLocaleString(dateLocale("en"), { dateStyle: "medium", timeStyle: "short" }) }) : t("admin.msg.confirm_open")}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirm(null)} disabled={publishing}>{t("common.cancel")}</Button>
          <Button onClick={() => void publish()} loading={publishing}>{t("admin.msg.publish_now")}</Button>
        </div>
      </Dialog>
    </div>
  );
}

function stateOf(c: Campaign): "draft" | "live" | "scheduled" | "expired" | "archived" {
  if (c.status !== "published") return c.status === "draft" ? "draft" : "archived";
  const now = Date.now();
  if (c.ends_at && new Date(c.ends_at).getTime() <= now) return "expired";
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return "scheduled";
  return "live";
}
const TONE = { draft: "neutral", live: "success", scheduled: "info", expired: "warning", archived: "neutral" } as const;

/** Announcements ("alert") and promotions ("promo") share one editor: they differ only in label and in how the customer app styles them. */
export function CampaignManager({ kind }: { kind: Campaign["kind"] }) {
  const { t, locale } = useT();
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Form | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["admin", "msg", "campaigns"], staleTime: 5000, queryFn: staffApi.campaigns });

  async function act(id: string, run: () => Promise<unknown>, ok: string) {
    if (busyId) return;
    setBusyId(id); setErr(null);
    try { await run(); toast.success(ok); await qc.invalidateQueries({ queryKey: ["admin", "msg"] }); }
    catch (e) { setErr(e instanceof MsgError && e.code === "FORBIDDEN" ? t("admin.msg.err.forbidden") : t("admin.msg.err.save")); }
    setBusyId(null);
  }

  if (edit) return <Editor key={edit.id ?? "new"} kind={kind} initial={edit} onClose={() => setEdit(null)} />;
  const rows = (q.data ?? []).filter((c) => c.kind === kind);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-xl font-bold">{kind === "alert" ? t("admin.msg.tab.alert") : t("admin.msg.tab.promo")}</h2>
        <Button leadingIcon={Plus} onClick={() => setEdit(blank())}>{kind === "alert" ? t("admin.msg.new_alert") : t("admin.msg.new_promo")}</Button>
      </div>
      {err && <Alert tone="danger">{err}</Alert>}
      {q.isLoading ? <Skeleton variant="row" className="h-28" />
        : q.isError ? <EmptyState icon={RefreshCw} title={t("msg.err.load")} action={<Button variant="secondary" onClick={() => void q.refetch()}>{t("msg.retry")}</Button>} />
        : rows.length === 0 ? <EmptyState icon={kind === "alert" ? Megaphone : Tag} title={t(`admin.msg.empty_${kind}`)} description={t("admin.msg.empty_hint")} />
        : (
          <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
            {rows.map((c) => {
              const s = stateOf(c);
              return (
                <li key={c.id} className="overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--e1)]">
                  <Banner path={c.image_path} />
                  <div className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="m-0 min-w-0 break-words text-base font-bold">{c.title}</h3>
                      <Badge tone={TONE[s]}>{t(`admin.msg.state.${s}`)}</Badge>
                    </div>
                    <p className="m-0 line-clamp-2 break-words text-sm text-muted">{c.body}</p>
                    <p className="m-0 text-xs text-muted">{t(`admin.msg.aud.${c.audience}`)}{c.ends_at ? ` · ${t("msg.ends", { when: new Date(c.ends_at).toLocaleDateString(dateLocale(locale)) })}` : ""}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {c.status === "draft" && <Button size="sm" variant="secondary" leadingIcon={Pencil} onClick={() => setEdit(fromCampaign(c))}>{t("admin.msg.edit")}</Button>}
                      {c.status === "published" && <Button size="sm" variant="secondary" leadingIcon={Archive} loading={busyId === c.id} onClick={() => void act(c.id, () => staffApi.setCampaignStatus(c.id, "archived"), t("admin.msg.unpublished"))}>{t("admin.msg.unpublish")}</Button>}
                      {c.status === "archived" && <Button size="sm" variant="secondary" loading={busyId === c.id} onClick={() => void act(c.id, () => staffApi.setCampaignStatus(c.id, "draft"), t("admin.msg.saved"))}>{t("admin.msg.to_draft")}</Button>}
                      {c.status === "draft" && <Button size="sm" variant="ghost" leadingIcon={Trash2} loading={busyId === c.id} onClick={() => void act(c.id, async () => { await staffApi.deleteCampaign(c.id); if (c.image_path) await supabase.storage.from("store-assets").remove([c.image_path]); }, t("admin.msg.deleted"))}>{t("admin.msg.delete")}</Button>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
    </section>
  );
}
