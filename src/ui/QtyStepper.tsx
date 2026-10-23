import { cn } from "./cn";
import { Minus, Plus, Trash2 } from "./icons";

type Props = {
  value: number;
  max: number;
  onChange: (n: number) => void;
  /** Accessible names: the group, decrease, increase, and (when min is 0) remove. */
  labels: { group: string; less: string; more: string; remove?: string };
  /** 0 lets the minus button remove the line (shown as a bin); 1 keeps the value at one or more. */
  min?: 0 | 1;
  /** sm fits a two-column product card on a 320 px phone (40 px targets there, 44 px from 360 px). */
  size?: "sm" | "md" | "lg";
  className?: string;
};

/** Quantity control with 48 px targets. The count is announced politely; it never goes below min or above max. */
export function QtyStepper({ value, max, onChange, labels, min = 1, size = "md", className }: Props) {
  const removing = min === 0 && value <= 1;
  const btn = cn(size === "sm" ? "size-10 min-[360px]:size-11" : "size-12", "inline-flex shrink-0 items-center justify-center rounded-md text-brand-strong transition-[transform,background-color] duration-[var(--duration-1)] active:scale-[.94] disabled:cursor-not-allowed disabled:opacity-40 hover-fine:hover:bg-[color-mix(in_oklab,var(--brand)_16%,var(--surface))]");
  const LessIcon = removing ? Trash2 : Minus;
  return (
    <div role="group" aria-label={labels.group} className={cn("inline-flex items-center justify-between rounded-md bg-brand-tint", size === "lg" && "min-w-40", className)}>
      <button type="button" className={btn} aria-label={removing ? labels.remove ?? labels.less : labels.less} disabled={value <= min && !removing}
        onClick={() => onChange(Math.max(min, value - 1))}>
        <LessIcon aria-hidden size={removing ? 18 : 20} strokeWidth={2} />
      </button>
      <span aria-live="polite" className={cn(size === "sm" ? "min-w-6" : "min-w-8", "text-center font-bold text-ink tabular", size === "lg" ? "text-lg" : "text-base")}>{value}</span>
      <button type="button" className={btn} aria-label={labels.more} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        <Plus aria-hidden size={20} strokeWidth={2} />
      </button>
    </div>
  );
}
