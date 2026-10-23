import { forwardRef, useId } from "react";
import { cn } from "./cn";

type ChoiceProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string; description?: string };

const box = "mt-0.5 size-5 shrink-0 accent-[var(--brand-strong)]";

export const Checkbox = forwardRef<HTMLInputElement, ChoiceProps>(function Checkbox({ label, description, className, id, ...rest }, ref) {
  const gen = useId(); const cid = id ?? gen;
  return (
    <label htmlFor={cid} className={cn("flex min-h-12 cursor-pointer items-start gap-3 py-2", className)}>
      <input ref={ref} id={cid} type="checkbox" className={box} {...rest} />
      <span><span className="block font-medium text-ink">{label}</span>{description && <span className="block text-sm text-muted">{description}</span>}</span>
    </label>
  );
});

export const Radio = forwardRef<HTMLInputElement, ChoiceProps>(function Radio({ label, description, className, id, ...rest }, ref) {
  const gen = useId(); const cid = id ?? gen;
  return (
    <label htmlFor={cid} className={cn("flex min-h-12 cursor-pointer items-start gap-3 py-2", className)}>
      <input ref={ref} id={cid} type="radio" className={box} {...rest} />
      <span><span className="block font-medium text-ink">{label}</span>{description && <span className="block text-sm text-muted">{description}</span>}</span>
    </label>
  );
});

/** Card-style radio for payment and delivery choices. The whole card is the target; selected state is a border AND a check, not colour alone. */
export const ChoiceCard = forwardRef<HTMLInputElement, ChoiceProps>(function ChoiceCard({ label, description, className, id, ...rest }, ref) {
  const gen = useId(); const cid = id ?? gen;
  return (
    <label htmlFor={cid} className={cn("flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border border-line-strong bg-surface p-4 has-[:checked]:border-2 has-[:checked]:border-brand-strong has-[:checked]:bg-brand-tint", className)}>
      <input ref={ref} id={cid} type="radio" className={box} {...rest} />
      <span><span className="block font-semibold text-ink">{label}</span>{description && <span className="block text-sm text-muted">{description}</span>}</span>
    </label>
  );
});

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: React.ReactNode;
  disabled?: boolean;
  className?: string;
};

/** role="switch" button: keyboard (Space/Enter), 48 px target, thumb position plus text state for assistive tech. */
export function Switch({ checked, onCheckedChange, label, disabled, className }: SwitchProps) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onCheckedChange(!checked)}
      className={cn("flex min-h-12 w-full items-center justify-between gap-3 text-left disabled:opacity-60", className)}>
      <span className="font-medium text-ink">{label}</span>
      <span aria-hidden className={cn("relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-[var(--duration-2)]", checked ? "border-success bg-success" : "border-line-strong bg-surface-2")}>
        <span className={cn("absolute top-[3px] size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.25)] transition-transform duration-[var(--duration-2)] ease-[var(--ease-out)]", checked ? "translate-x-[1.375rem]" : "translate-x-[3px]")} />
      </span>
    </button>
  );
}
