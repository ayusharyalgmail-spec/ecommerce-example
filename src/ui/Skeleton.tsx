import { cn } from "./cn";

type Variant = "text" | "image" | "row" | "card";

/** Static tinted placeholder sized like the real content (no layout shift). The shimmer is CSS, Full tier only. */
export function Skeleton({ variant = "text", className, lines = 1 }: { variant?: Variant; className?: string; lines?: number }) {
  if (variant === "text") {
    return (
      <span aria-hidden className={cn("block space-y-2", className)}>
        {Array.from({ length: lines }, (_, i) => <span key={i} className="skeleton block h-4 rounded-xs" style={{ width: i === lines - 1 && lines > 1 ? "60%" : "100%" }} />)}
      </span>
    );
  }
  if (variant === "image") return <span aria-hidden className={cn("skeleton block aspect-square w-full rounded-lg", className)} />;
  if (variant === "row") return <span aria-hidden className={cn("skeleton block h-16 w-full rounded-lg", className)} />;
  return (
    <span aria-hidden className={cn("block overflow-hidden rounded-lg border border-line bg-surface", className)}>
      <span className="skeleton block aspect-square w-full" />
      <span className="block space-y-2 p-4"><span className="skeleton block h-4 w-4/5 rounded-xs" /><span className="skeleton block h-4 w-2/5 rounded-xs" /><span className="skeleton block h-12 w-full rounded-md" /></span>
    </span>
  );
}

/** Wrap a group of skeletons so assistive tech announces loading once. */
export function SkeletonGroup({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div role="status" aria-busy="true" aria-label={label} className={className}>{children}</div>;
}
