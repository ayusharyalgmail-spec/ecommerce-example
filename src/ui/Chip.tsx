import { cn } from "./cn";
import { X } from "./icons";

type ChipProps = {
  children: React.ReactNode;
  /** Toggle chip (filter): reflects state with aria-pressed and a visible check-style fill. */
  pressed?: boolean;
  onClick?: () => void;
  /** Removable chip: shows a close button with this accessible name. */
  onRemove?: () => void;
  removeLabel?: string;
  className?: string;
};

/** Filter / removable chip. 48 px touch target through the hit area; the visible chip stays compact. */
export function Chip({ children, pressed, onClick, onRemove, removeLabel, className }: ChipProps) {
  const visual = cn(
    "inline-flex min-h-9 items-center gap-1.5 rounded-pill border px-3 text-sm font-semibold",
    pressed ? "border-brand-strong bg-brand-tint text-ink" : "border-line-strong bg-surface text-ink",
    className
  );
  if (onRemove) {
    return (
      <span className={visual}>
        {children}
        <button type="button" aria-label={removeLabel ?? "Remove"} onClick={onRemove} className="-mr-2 inline-flex size-12 items-center justify-center rounded-full">
          <X aria-hidden size={16} strokeWidth={2} />
        </button>
      </span>
    );
  }
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick} className={cn(visual, "relative before:absolute before:-inset-1.5 before:content-['']")}>
      {children}
    </button>
  );
}
