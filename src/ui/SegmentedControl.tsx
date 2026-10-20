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
  className?: string;
};

/** Native radios styled as a segmented control: arrow keys, 48 px targets, checked state is fill AND border (not colour alone). */
export function SegmentedControl<T extends string>({ label, value, onChange, options, hint, className }: Props<T>) {
  const name = useId();
  return (
    <fieldset className={cn("m-0 min-w-0 border-0 p-0", className)}>
      <legend className="mb-1 p-0 text-sm font-semibold text-ink">{label}</legend>
      <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-md border border-line-strong bg-surface-2 p-1">
        {options.map((o) => (
          <label key={o.value} lang={o.lang}
            className={cn(
              "flex min-h-11 cursor-pointer items-center justify-center rounded-sm px-2 text-center text-sm font-semibold text-ink",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--ink)]",
              value === o.value ? "border-2 border-brand-strong bg-surface" : "border-2 border-transparent"
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
