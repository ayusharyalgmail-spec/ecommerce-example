// Super Admin Portal (Hub mode only, route /admin on amanaryal.com):
// List all onboarded vendors, display active status, onboard new vendors with initial Vendor Admin Gmail,
// and strictly protect access to users whose auth.uid() exists in platform_admins.
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pick, useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { errorCode, supabase } from "@/lib/supabase";
import { Alert, Badge, Button, Field, Input, Skeleton, Switch, toast } from "@/ui";
import { FEATURE_KEYS, FLAGSHIP_SLUG, normalizeFeatures, type FeatureKey, type TenantFeatures } from "./features";
import { DEFAULT_ROOT_DOMAIN, SLUG_RE } from "./resolve";

type Row = {
  id: string;
  slug: string;
  business_name: string;
  email: string | null;
  status: "draft" | "active" | "suspended";
  custom_domain: string | null;
  features: unknown;
  created_at: string;
};

const FEATURE_LABEL: Record<FeatureKey, [string, string]> = {
  coupons: ["Coupons", "कुपन"],
  campaigns: ["Campaigns", "अभियान"],
  ledger: ["Shop ledger (udhaar)", "खाता / उधारो"],
  messaging: ["Customer messaging", "ग्राहक सन्देश"],
  min_order_qty: ["Minimum order quantity", "न्यूनतम अर्डर मात्रा"],
  reviews: ["Reviews", "समीक्षा"],
  pos_export: ["POS import / export", "POS आयात / निर्यात"],
};

const NEXT_STATUS = { draft: "active", active: "suspended", suspended: "active" } as const;
const STATUS_TONE = { draft: "neutral", active: "success", suspended: "danger" } as const;

/** Maps Postgres/RPC failures to a short safe message (no SQL or stack traces reach the screen). */
function friendly(message: string | undefined, locale: "en" | "ne"): string {
  const code = errorCode(message);
  if (code === "FORBIDDEN" || /platform admin/i.test(message ?? "")) {
    return pick(locale, "Only Super Admins (platform_admins) can do this.", "यो काम सुपर एडमिनले मात्र गर्न सक्छन्।");
  }
  if (code === "VALIDATION_FAILED") {
    return pick(locale, "Check the colour (#RRGGBB) and that the logo is an https link.", "रङ (#RRGGBB) र लोगो https लिङ्क हो कि जाँच गर्नुहोस्।");
  }
  if (/duplicate key|23505|already exists/i.test(message ?? "")) {
    return pick(locale, "That store slug or custom domain is already taken.", "यो पसलको स्लग वा डोमेन पहिल्यै प्रयोगमा छ।");
  }
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

  const statusMutation = useMutation({
    mutationFn: async () => {
      const next = NEXT_STATUS[row.status];
      const { error } = await supabase.rpc("platform_set_tenant_status", { p_tenant: row.id, p_status: next });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success(pick(locale, "Status updated successfully", "स्थिति अद्यावधिक भयो"));
      onChanged();
    },
    onError: (e: Error) => toast.error(friendly(e.message, locale)),
  });

  const saveFeatures = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("platform_set_tenant_features", { p_tenant: row.id, p_features: feat });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success(pick(locale, "Features saved successfully", "सुविधाहरू सुरक्षित भए"));
      onChanged();
    },
    onError: (e: Error) => toast.error(friendly(e.message, locale)),
  });

  const actionLabel = row.status === "active" ? pick(locale, "Suspend", "निलम्बन") : pick(locale, "Activate", "सक्रिय गर्नुहोस्");
  const subdomain = `${row.slug}.${DEFAULT_ROOT_DOMAIN}`;

  return (
    <li className="rounded-xl border border-line bg-surface p-4 shadow-xs transition-colors hover:border-ink/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="m-0 truncate font-semibold text-ink text-base">{row.business_name}</p>
            <Badge tone={STATUS_TONE[row.status]}>{row.status.toUpperCase()}</Badge>
          </div>
          <p className="m-0 truncate text-xs text-muted mt-0.5">
            <span className="font-mono text-ink/80">{subdomain}</span>
            {row.custom_domain ? ` · ${row.custom_domain}` : ""}
            {row.email ? ` · Admin: ${row.email}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/s/${row.slug}/`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-accent hover:underline px-2 py-1"
          >
            {pick(locale, "Storefront ↗", "पसल हेर्नुहोस् ↗")}
          </a>
          <a
            href={`/s/${row.slug}/admin`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-muted hover:text-ink hover:underline px-2 py-1"
          >
            {pick(locale, "Store Admin ↗", "पसल एडमिन ↗")}
          </a>
          <Button
            size="sm"
            variant="secondary"
            disabled={flagship && row.status === "active"}
            loading={statusMutation.isPending}
            onClick={() => statusMutation.mutate()}
          >
            {actionLabel}
          </Button>
          <Button size="sm" variant="ghost" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {pick(locale, "Features", "सुविधा")}
          </Button>
        </div>
      </div>
      {open && (
        <div className="mt-3 border-t border-line pt-3">
          {flagship && <p className="m-0 mb-2 text-xs text-muted">{pick(locale, "The flagship store always has every feature enabled.", "मुख्य पसलमा सबै सुविधा सधैं सक्रिय हुन्छन्।")}</p>}
          <FeatureSwitches
            value={flagship ? normalizeFeatures(Object.fromEntries(FEATURE_KEYS.map((k) => [k, true]))) : feat}
            onChange={(k, v) => setFeat((f) => ({ ...f, [k]: v }))}
            disabled={flagship}
          />
          {!flagship && (
            <Button size="sm" className="mt-3" loading={saveFeatures.isPending} onClick={() => saveFeatures.mutate()}>
              {pick(locale, "Save features", "सुविधा सुरक्षित गर्नुहोस्")}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

function OnboardVendorForm({ onCreated }: { onCreated: () => void }) {
  const { locale } = useT();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    adminGmail: "",
    domain: "",
    color: "#2563EB",
    logo: "",
  });
  const [features, setFeatures] = useState<TenantFeatures>(() =>
    normalizeFeatures({ reviews: true, min_order_qty: true, coupons: true, ledger: true })
  );
  const [err, setErr] = useState<string | null>(null);

  const setField = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const slugOk = SLUG_RE.test(form.slug);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminGmail.trim());

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("platform_create_store", {
        p_slug: form.slug,
        p_name: form.name.trim(),
        p_owner_email: form.adminGmail.trim() || null,
        p_custom_domain: form.domain.trim() || null,
        p_brand: form.color,
        p_logo_path: form.logo.trim() || null,
        p_features: features,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success(pick(locale, "Vendor onboarded successfully! Set to draft status.", "नयाँ भेन्डर सफलतापूर्वक थपियो!"));
      setForm({ name: "", slug: "", adminGmail: "", domain: "", color: "#2563EB", logo: "" });
      setErr(null);
      onCreated();
    },
    onError: (e: Error) => setErr(friendly(e.message, locale)),
  });

  return (
    <form
      className="space-y-4 rounded-xl border border-line bg-surface p-5 shadow-xs"
      onSubmit={(e) => {
        e.preventDefault();
        if (slugOk && form.name.trim() && emailValid) {
          createMutation.mutate();
        }
      }}
    >
      <div>
        <h2 className="m-0 text-lg font-bold text-ink">{pick(locale, "Onboard New Vendor", "नयाँ भेन्डर दर्ता गर्नुहोस्")}</h2>
        <p className="m-0 text-xs text-muted mt-1">
          {pick(
            locale,
            "Assign initial store details and initial Vendor Admin Gmail for isolated access.",
            "भेन्डरको स्टोरको नाम, स्लग, र प्रारम्भिक एडमिनको जिमेल तोक्नुहोस्।"
          )}
        </p>
      </div>

      {err && <Alert tone="danger">{err}</Alert>}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={pick(locale, "Store Name", "पसलको नाम")} required>
          {(a) => <Input {...a} value={form.name} onChange={setField("name")} placeholder="My Shop" maxLength={80} />}
        </Field>

        <Field
          label={pick(locale, "Subdomain Slug", "ठेगाना (स्लग)")}
          required
          hint={`e.g. myshop -> myshop.${DEFAULT_ROOT_DOMAIN}`}
          error={form.slug && !slugOk ? pick(locale, "Lowercase letters, numbers and dashes, 3-50 chars.", "सानो अक्षर, अङ्क र ड्यास, ३-५० अक्षर।") : undefined}
        >
          {(a) => (
            <Input
              {...a}
              value={form.slug}
              onChange={(e) => setForm((x) => ({ ...x, slug: e.target.value.toLowerCase() }))}
              placeholder="myshop"
              autoCapitalize="none"
            />
          )}
        </Field>

        <Field
          label={pick(locale, "Initial Vendor Admin Gmail", "भेन्डर एडमिन जिमेल")}
          required
          hint={pick(locale, "The vendor admin who will have isolated rights to this store.", "यो स्टोर व्यवस्थापन गर्ने एडमिनको इमेल")}
          error={form.adminGmail && !emailValid ? pick(locale, "Enter a valid email address.", "मान्य इमेल ठेगाना प्रविष्ट गर्नुहोस्।") : undefined}
        >
          {(a) => (
            <Input
              {...a}
              type="email"
              value={form.adminGmail}
              onChange={setField("adminGmail")}
              placeholder="vendor@gmail.com"
              required
            />
          )}
        </Field>

        <Field label={pick(locale, "Custom Domain (optional)", "आफ्नै डोमेन (ऐच्छिक)")} hint="shop.example.com">
          {(a) => <Input {...a} value={form.domain} onChange={setField("domain")} autoCapitalize="none" placeholder="shop.example.com" />}
        </Field>

        <Field label={pick(locale, "Brand Colour", "ब्रान्ड रङ")}>
          {(a) => <Input {...a} type="color" value={form.color} onChange={setField("color")} className="h-10 p-1 cursor-pointer" />}
        </Field>

        <Field label={pick(locale, "Logo URL (https, optional)", "लोगो URL (https, ऐच्छिक)")}>
          {(a) => <Input {...a} type="url" value={form.logo} onChange={setField("logo")} placeholder="https://..." />}
        </Field>
      </div>

      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 font-semibold text-sm text-ink">{pick(locale, "Store Features", "स्टोर सुविधाहरू")}</legend>
        <FeatureSwitches value={features} onChange={(k, v) => setFeatures((x) => ({ ...x, [k]: v }))} />
      </fieldset>

      <div className="pt-2">
        <Button
          type="submit"
          loading={createMutation.isPending}
          disabled={!slugOk || !form.name.trim() || !emailValid}
        >
          {pick(locale, "Onboard Vendor", "भेन्डर अनबोर्ड गर्नुहोस्")}
        </Button>
      </div>
    </form>
  );
}

export default function PlatformAdmin() {
  const { locale } = useT();
  const { user } = useAuth();
  const qc = useQueryClient();

  // Strict Protection: verify user's auth.uid() in public.platform_admins table
  const adminQuery = useQuery({
    queryKey: ["platform-admin", "is-admin", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<boolean> => {
      if (!user) return false;
      const { data: rpcRes, error: rpcErr } = await supabase.rpc("is_platform_admin");
      if (!rpcErr && typeof rpcRes === "boolean") return rpcRes;
      const { data, error } = await supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!error && data?.user_id) return true;
      return false;
    },
  });

  const tenantsQuery = useQuery({
    queryKey: ["platform-admin", "tenants"],
    enabled: adminQuery.data === true,
    staleTime: 10_000,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id,slug,business_name,email,status,custom_domain,features,created_at")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
  });

  const refresh = () => void qc.invalidateQueries({ queryKey: ["platform-admin", "tenants"] });

  if (adminQuery.isLoading) {
    return (
      <main className="mx-auto max-w-4xl space-y-4 p-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </main>
    );
  }

  // Blocked for non-super-admins
  if (adminQuery.data !== true) {
    return (
      <main className="mx-auto max-w-md space-y-4 p-8 text-center mt-12">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger text-2xl font-bold">
          ✕
        </div>
        <h1 className="m-0 text-2xl font-bold text-ink">{pick(locale, "Access Denied", "पहुँच अस्वीकृत")}</h1>
        <p className="m-0 text-sm text-muted">
          {pick(
            locale,
            "Only Super Admins whose auth.uid() exists in the platform_admins table can access this dashboard.",
            "यो पृष्ठ केवल platform_admins तालिकामा सूचीकृत सुपर एडमिनहरूले मात्र खोल्न सक्छन्।"
          )}
        </p>
        <div className="pt-2">
          <Link to="/network" className="text-sm font-semibold text-accent underline">
            {pick(locale, "Return to Business Directory", "निर्देशिकामा फर्कनुहोस्")}
          </Link>
        </div>
      </main>
    );
  }

  const vendors = tenantsQuery.data ?? [];
  const activeCount = vendors.filter((v) => v.status === "active").length;
  const draftCount = vendors.filter((v) => v.status === "draft").length;
  const suspendedCount = vendors.filter((v) => v.status === "suspended").length;

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="m-0 text-2xl font-bold text-ink">
            {pick(locale, "Super Admin Dashboard", "सुपर एडमिन ड्यासबोर्ड")}
          </h1>
          <p className="m-0 text-xs text-muted mt-1">
            {pick(locale, `Multi-Tenant Control Plane (${DEFAULT_ROOT_DOMAIN})`, `बहु-भेन्डर नियन्त्रण कक्ष (${DEFAULT_ROOT_DOMAIN})`)}
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="text-success font-medium">● {activeCount} Active</span>
          <span className="text-muted font-medium">○ {draftCount} Draft</span>
          <span className="text-danger font-medium">✕ {suspendedCount} Suspended</span>
          <Link to="/network" className="text-accent underline ml-2">
            {pick(locale, "Directory", "निर्देशिका")}
          </Link>
        </div>
      </header>

      <section aria-label={pick(locale, "Onboarded Vendors", "दर्ता भएका भेन्डरहरू")} className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="m-0 text-base font-bold text-ink">
            {pick(locale, "Onboarded Vendors", "दर्ता भएका भेन्डरहरू")} ({vendors.length})
          </h2>
          <Button size="sm" variant="ghost" onClick={refresh}>
            {pick(locale, "Refresh", "ताजा गर्नुहोस्")}
          </Button>
        </div>

        {tenantsQuery.isError && (
          <Alert tone="danger">{pick(locale, "Could not load vendors list.", "भेन्डर सूची लोड गर्न सकिएन।")}</Alert>
        )}

        {tenantsQuery.isLoading && <Skeleton className="h-28" />}

        {vendors.length === 0 && !tenantsQuery.isLoading && (
          <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
            {pick(locale, "No vendors found. Onboard the first vendor below.", "कुनै भेन्डर भेटिएन। तल नयाँ भेन्डर थप्नुहोस्।")}
          </div>
        )}

        <ul className="m-0 list-none space-y-2 p-0">
          {vendors.map((t) => (
            <TenantCard key={t.id} row={t} onChanged={refresh} />
          ))}
        </ul>
      </section>

      <OnboardVendorForm onCreated={refresh} />
    </main>
  );
}

