// Platform admin (hub only, route /platform-admin): list stores, open a storefront, activate/suspend, create a vendor store.
// UI convenience only: every action is a platform_* RPC that re-checks platform_admins in Postgres.
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pick, useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { errorCode, supabase } from "@/lib/supabase";
import { Alert, Badge, Button, Field, Input, Skeleton, Switch, toast } from "@/ui";
import { FEATURE_KEYS, FLAGSHIP_SLUG, normalizeFeatures, type FeatureKey, type TenantFeatures } from "./features";
import { SLUG_RE } from "./resolve";

type Row = { id: string; slug: string; business_name: string; status: "draft" | "active" | "suspended"; custom_domain: string | null; features: unknown; created_at: string };

const FEATURE_LABEL: Record<FeatureKey, [string, string]> = {
  coupons: ["Coupons", "कुपन"], campaigns: ["Campaigns", "अभियान"], ledger: ["Shop ledger (udhaar)", "खाता / उधारो"], messaging: ["Customer messaging", "ग्राहक सन्देश"],
  min_order_qty: ["Minimum order quantity", "न्यूनतम अर्डर मात्रा"], reviews: ["Reviews", "समीक्षा"], pos_export: ["POS import / export", "POS आयात / निर्यात"],
};
const NEXT_STATUS = { draft: "active", active: "suspended", suspended: "active" } as const;
const STATUS_TONE = { draft: "neutral", active: "success", suspended: "danger" } as const;

/** Maps Postgres/RPC failures to a short safe message (no SQL or stack traces reach the screen). */
function friendly(message: string | undefined, locale: "en" | "ne"): string {
  const code = errorCode(message);
  if (code === "FORBIDDEN") return pick(locale, "Only platform admins can do this.", "यो काम प्लेटफर्म एडमिनले मात्र गर्न सक्छन्।");
  if (code === "VALIDATION_FAILED") return pick(locale, "Check the colour (#RRGGBB) and that the logo is an https link.", "रङ (#RRGGBB) र लोगो https लिङ्क हो कि जाँच गर्नुहोस्।");
  if (/duplicate key|23505|already exists/i.test(message ?? "")) return pick(locale, "That store address or domain is already taken.", "यो पसलको ठेगाना वा डोमेन पहिल्यै प्रयोगमा छ।");
  return pick(locale, "Something went wrong. Try again.", "केही गडबड भयो। फेरि प्रयास गर्नुहोस्।");
}

function FeatureSwitches({ value, onChange, disabled }: { value: TenantFeatures; onChange: (k: FeatureKey, v: boolean) => void; disabled?: boolean }) {
  const { locale } = useT();
  return (
    <div className="grid gap-x-6 sm:grid-cols-2">
      {FEATURE_KEYS.map((k) => (
        <Switch key={k} label={pick(locale, FEATURE_LABEL[k][0], FEATURE_LABEL[k][1])} checked={value[k]} disabled={disabled} onCheckedChange={(v) => onChange(k, v)} />
      ))}
    </div>
  );
}

function TenantCard({ row, onChanged }: { row: Row; onChanged: () => void }) {
  const { locale } = useT();
  const flagship = row.slug === FLAGSHIP_SLUG;
  const [open, setOpen] = useState(false);
  const [feat, setFeat] = useState<TenantFeatures>(() => normalizeFeatures(row.features));
  const status = useMutation({
    mutationFn: async () => { const { error } = await supabase.rpc("platform_set_tenant_status", { p_tenant: row.id, p_status: NEXT_STATUS[row.status] }); if (error) throw new Error(error.message); },
    onSuccess: () => { toast.success(pick(locale, "Status updated", "स्थिति अद्यावधिक भयो")); onChanged(); },
    onError: (e: Error) => toast.error(friendly(e.message, locale)),
  });
  const save = useMutation({
    mutationFn: async () => { const { error } = await supabase.rpc("platform_set_tenant_features", { p_tenant: row.id, p_features: feat }); if (error) throw new Error(error.message); },
    onSuccess: () => { toast.success(pick(locale, "Features saved", "सुविधाहरू सुरक्षित भए")); onChanged(); },
    onError: (e: Error) => toast.error(friendly(e.message, locale)),
  });
  const actionLabel = row.status === "active" ? pick(locale, "Suspend", "निलम्बन") : pick(locale, "Activate", "सक्रिय गर्नुहोस्");
  return (
    <li className="rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate font-semibold text-ink">{row.business_name}</p>
          <p className="m-0 truncate text-sm text-muted">{row.slug}{row.custom_domain ? ` · ${row.custom_domain}` : ""}</p>
        </div>
        <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>
        <a href={`/s/${row.slug}/`} target="_blank" rel="noreferrer" className="text-sm font-semibold underline">{pick(locale, "Open storefront", "पसल खोल्नुहोस्")}</a>
        <Button size="sm" variant="secondary" disabled={flagship && row.status === "active"} loading={status.isPending} onClick={() => status.mutate()}>{actionLabel}</Button>
        <Button size="sm" variant="ghost" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{pick(locale, "Features", "सुविधा")}</Button>
      </div>
      {open && (
        <div className="mt-3 border-t border-line pt-3">
          {flagship && <p className="m-0 mb-2 text-sm text-muted">{pick(locale, "The flagship store always has every feature.", "मुख्य पसलमा सबै सुविधा सधैं सक्रिय हुन्छन्।")}</p>}
          <FeatureSwitches value={flagship ? normalizeFeatures(Object.fromEntries(FEATURE_KEYS.map((k) => [k, true]))) : feat} onChange={(k, v) => setFeat((f) => ({ ...f, [k]: v }))} disabled={flagship} />
          {!flagship && <Button size="sm" className="mt-2" loading={save.isPending} onClick={() => save.mutate()}>{pick(locale, "Save features", "सुविधा सुरक्षित गर्नुहोस्")}</Button>}
        </div>
      )}
    </li>
  );
}

function CreateStore({ onCreated }: { onCreated: () => void }) {
  const { locale } = useT();
  const [f, setF] = useState({ name: "", slug: "", domain: "", owner: "", color: "#E8A317", logo: "" });
  const [feat, setFeat] = useState<TenantFeatures>(() => normalizeFeatures({ reviews: true, min_order_qty: true }));
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const slugOk = SLUG_RE.test(f.slug);
  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("platform_create_store", {
        p_slug: f.slug, p_name: f.name.trim(), p_owner_email: f.owner.trim() || null, p_custom_domain: f.domain.trim() || null,
        p_brand: f.color, p_logo_path: f.logo.trim() || null, p_features: feat,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success(pick(locale, "Store created as a draft. Activate it when it is ready.", "पसल ड्राफ्टमा बन्यो। तयार भएपछि सक्रिय गर्नुहोस्।")); setF({ name: "", slug: "", domain: "", owner: "", color: "#E8A317", logo: "" }); setErr(null); onCreated(); },
    onError: (e: Error) => setErr(friendly(e.message, locale)),
  });
  return (
    <form className="space-y-3 rounded-lg border border-line bg-surface p-4" onSubmit={(e) => { e.preventDefault(); if (slugOk && f.name.trim()) create.mutate(); }}>
      <h2 className="m-0 text-lg font-bold">{pick(locale, "Create vendor store", "नयाँ भेन्डर पसल बनाउनुहोस्")}</h2>
      {err && <Alert tone="danger">{err}</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={pick(locale, "Store name", "पसलको नाम")} required>{(a) => <Input {...a} value={f.name} onChange={set("name")} maxLength={80} />}</Field>
        <Field label={pick(locale, "Address (slug)", "ठेगाना (स्लग)")} required hint="family-mart" error={f.slug && !slugOk ? pick(locale, "Lowercase letters, digits and dashes, 3-50 characters.", "सानो अक्षर, अङ्क र ड्यास, ३-५० अक्षर।") : undefined}>
          {(a) => <Input {...a} value={f.slug} onChange={(e) => setF((x) => ({ ...x, slug: e.target.value.toLowerCase() }))} autoCapitalize="none" />}
        </Field>
        <Field label={pick(locale, "Owner email (optional)", "मालिकको इमेल (ऐच्छिक)")}>{(a) => <Input {...a} type="email" value={f.owner} onChange={set("owner")} />}</Field>
        <Field label={pick(locale, "Custom domain (optional)", "आफ्नै डोमेन (ऐच्छिक)")} hint="shop.example.com">{(a) => <Input {...a} value={f.domain} onChange={set("domain")} autoCapitalize="none" />}</Field>
        <Field label={pick(locale, "Brand colour", "ब्रान्ड रङ")}>{(a) => <Input {...a} type="color" value={f.color} onChange={set("color")} className="h-12 p-1" />}</Field>
        <Field label={pick(locale, "Logo URL (https, optional)", "लोगो URL (https, ऐच्छिक)")}>{(a) => <Input {...a} type="url" value={f.logo} onChange={set("logo")} />}</Field>
      </div>
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-1 font-semibold">{pick(locale, "Features", "सुविधाहरू")}</legend>
        <FeatureSwitches value={feat} onChange={(k, v) => setFeat((x) => ({ ...x, [k]: v }))} />
      </fieldset>
      <Button type="submit" loading={create.isPending} disabled={!slugOk || !f.name.trim()}>{pick(locale, "Create store", "पसल बनाउनुहोस्")}</Button>
    </form>
  );
}

export default function PlatformAdmin() {
  const { locale } = useT();
  const { user } = useAuth();
  const qc = useQueryClient();
  const admin = useQuery({
    queryKey: ["platform-admin", "is-admin", user?.id], enabled: !!user, staleTime: 60_000, retry: false,
    queryFn: async () => { const { data, error } = await supabase.rpc("is_platform_admin"); if (error) throw new Error(error.message); return data === true; },
  });
  const tenants = useQuery({
    queryKey: ["platform-admin", "tenants"], enabled: admin.data === true, staleTime: 10_000,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase.from("tenants").select("id,slug,business_name,status,custom_domain,features,created_at").order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
  });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["platform-admin", "tenants"] });

  if (admin.isLoading) return <main className="mx-auto max-w-3xl space-y-3 p-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-24" /></main>;
  if (admin.data !== true) {
    return (
      <main className="mx-auto max-w-md space-y-3 p-8 text-center">
        <h1 className="m-0 text-2xl font-bold">{pick(locale, "Unauthorized", "अनधिकृत")}</h1>
        <p className="m-0 text-muted">{pick(locale, "Only platform admins can open this page.", "यो पृष्ठ प्लेटफर्म एडमिनले मात्र खोल्न सक्छन्।")}</p>
        <Link to="/network" className="font-semibold underline">{pick(locale, "Back to the directory", "निर्देशिकामा फर्कनुहोस्")}</Link>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="m-0 text-2xl font-bold">{pick(locale, "Platform admin", "प्लेटफर्म एडमिन")}</h1>
        <Link to="/network" className="text-sm font-semibold underline">{pick(locale, "Directory", "निर्देशिका")}</Link>
      </header>
      <section aria-label={pick(locale, "Stores", "पसलहरू")} className="space-y-2">
        {tenants.isError && <Alert tone="danger">{pick(locale, "Could not load stores.", "पसलहरू लोड गर्न सकिएन।")}</Alert>}
        {tenants.isLoading && <Skeleton className="h-24" />}
        <ul className="m-0 list-none space-y-2 p-0">{(tenants.data ?? []).map((t) => <TenantCard key={t.id} row={t} onChanged={refresh} />)}</ul>
      </section>
      <CreateStore onCreated={refresh} />
    </main>
  );
}
