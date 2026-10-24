import { pick, useT } from "@/lib/i18n";
import { PageSkeleton } from "@/shell/PageSkeleton";
import { useTenant } from "./TenantContext";
import type { FeatureKey } from "./features";

/** Store mode only: waits for the tenant, and shows a clear page (never a broken store) when it is unknown or not active. */
export function StoreGate({ children }: { children: React.ReactNode }) {
  const { isLoading, error, slug } = useTenant();
  const { locale } = useT();
  if (isLoading) return <PageSkeleton />;
  if (error) {
    return (
      <main className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-4 py-12 text-center">
        <h1 className="m-0 text-2xl font-bold text-ink">{pick(locale, "Store not found", "पसल भेटिएन")}</h1>
        <p className="m-0 text-muted">
          {pick(locale, `We could not find an active store${slug ? ` called “${slug}”` : ""}. It may be unpublished or the link is mistyped.`,
            "सक्रिय पसल भेटिएन। यो प्रकाशित नभएको वा लिङ्क गलत हुन सक्छ।")}
        </p>
        <a href="/?tenant=hub" className="font-semibold underline">{pick(locale, "Back to the directory", "निर्देशिकामा फर्कनुहोस्")}</a>
      </main>
    );
  }
  return <>{children}</>;
}

/** Route guard: a feature this store does not have shows a clear page instead of a broken or stale screen. */
export function FeatureGate({ feature, children }: { feature: FeatureKey; children: React.ReactNode }) {
  const { hasFeature } = useTenant();
  const { locale } = useT();
  if (hasFeature(feature)) return <>{children}</>;
  return (
    <main className="mx-auto flex min-h-[40dvh] max-w-md flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      <h1 className="m-0 text-xl font-bold text-ink">{pick(locale, "Not available for this store", "यो पसलका लागि उपलब्ध छैन")}</h1>
      <p className="m-0 text-muted">{pick(locale, "This feature is not enabled for this store.", "यो सुविधा यो पसलमा सक्रिय छैन।")}</p>
    </main>
  );
}
