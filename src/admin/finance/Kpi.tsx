import { TrendingDown, TrendingUp, type LucideIcon } from "@/ui";
import { cn } from "@/ui/cn";
import { formatNpr } from "@/lib/money";

type Props = {
  icon: LucideIcon; label: string; value: number | null; hint: string;
  /** Percent vs previous period; null hides the comparison (no baseline → no invented trend). */
  change?: number | null; changeLabel?: string; tone?: "neutral" | "success" | "danger"; onClick?: () => void;
};

/** KPI row item: icon + label, a large tabular figure, and an optional honest comparison. */
export function Kpi({ icon: Icon, label, value, hint, change, changeLabel, tone = "neutral", onClick }: Props) {
  const Tag = onClick ? "button" : "div";
  const up = (change ?? 0) >= 0;
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick}
      className={cn("flex min-w-0 flex-col gap-1 p-4 text-left", onClick && "rounded-md transition-colors hover-fine:hover:bg-surface-2 focus-visible:bg-surface-2")}>
      <span className="flex items-center gap-2 text-sm font-semibold text-muted">
        <Icon aria-hidden size={18} strokeWidth={1.75} className={cn(tone === "success" && "text-success", tone === "danger" && "text-danger")} />{label}
      </span>
      <span className="tabular truncate text-2xl font-bold text-ink sm:text-[1.75rem]">{value == null ? "–" : formatNpr(value)}</span>
      <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
        {change != null && (
          <span className={cn("inline-flex items-center gap-0.5 font-semibold", up ? "text-success" : "text-danger")}>
            {up ? <TrendingUp aria-hidden size={14} /> : <TrendingDown aria-hidden size={14} />}{up ? "+" : ""}{change}% {changeLabel}
          </span>
        )}
        <span>{hint}</span>
      </span>
    </Tag>
  );
}
