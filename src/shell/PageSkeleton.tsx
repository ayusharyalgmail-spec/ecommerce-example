import { Skeleton, SkeletonGroup } from "@/ui";
import { useT } from "@/lib/i18n";

/** Route-level loading state sized like a typical page (title plus a product grid) so content swaps in without a jump. */
export function PageSkeleton() {
  const { t } = useT();
  return (
    <SkeletonGroup label={t("common.loading")} className="mx-auto max-w-[75rem] space-y-6 p-4 sm:p-6 md:px-8">
      <Skeleton className="max-w-xs" lines={1} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} variant="card" className={i > 1 ? "hidden md:block" : undefined} />)}
      </div>
    </SkeletonGroup>
  );
}
