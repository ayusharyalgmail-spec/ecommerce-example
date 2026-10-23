import { useId } from "react";
import { cn } from "./cn";

type Option<T extends string> = { value: T; label: string; lang?: string };

type Props<T extends string> = {
  /** Visible group label (also the accessible name). */
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
  hint?: string;
  /** Keep the label for assistive tech only (toolbars where the options speak for themselves). */
  hideLabel?: boolean;
  className?: string;
};

/** Native radios styled as a segmented control: arrow keys, 48 px targets, checked state is fill AND border (not colour alone). */
export function SegmentedControl<T extends string>({ label, value, onChange, options, hint, hideLabel = false, className }: Props<T>) {
  const name = useId();
  return (
    <fieldset className={cn("m-0 min-w-0 border-0 p-0", className)}>
      <legend className={hideLabel ? "sr-only-text" : "mb-1 p-0 text-sm font-semibold text-ink"}>{label}</legend>
      <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-md border border-line bg-surface-2 p-1">
        {options.map((o) => (
          <label key={o.value} lang={o.lang}
            className={cn(
              "flex min-h-10 cursor-pointer items-center justify-center rounded-sm px-3 text-center text-sm font-semibold transition-[background-color,box-shadow,color] duration-[var(--duration-2)]",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]",
              // selected: raised white segment with a hairline ring (shape and elevation, not colour alone)
              value === o.value ? "bg-surface text-ink shadow-[var(--e1)] ring-1 ring-[var(--line-strong)]" : "text-muted hover-fine:hover:text-ink"
            )}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only-text" />
            {o.label}
          </label>
        ))}
      </div>
      {hint && <p className="m-0 mt-1 text-sm text-muted">{hint}</p>}
    </fieldset>
  );
}
