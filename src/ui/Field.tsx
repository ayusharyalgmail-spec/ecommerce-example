import { forwardRef, useId } from "react";
import { cn } from "./cn";

const control =
  "block w-full min-h-12 rounded-sm border bg-surface px-3.5 py-2.5 text-base text-ink placeholder:text-muted " +
  "disabled:bg-surface-2 disabled:text-muted aria-[invalid=true]:border-danger";

type ControlProps = { invalid?: boolean };

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & ControlProps>(function Input({ invalid, className, ...rest }, ref) {
  return <input ref={ref} aria-invalid={invalid || undefined} className={cn(control, invalid ? "border-danger" : "border-line-strong", className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & ControlProps>(function Textarea({ invalid, className, rows = 4, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} aria-invalid={invalid || undefined} className={cn(control, "min-h-24", invalid ? "border-danger" : "border-line-strong", className)} {...rest} />;
});

/** Native select: the best picker on Android. A Radix variant for expanded screens comes with the filter sidebar (Phase 3). */
export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & ControlProps>(function Select({ invalid, className, children, ...rest }, ref) {
  return <select ref={ref} aria-invalid={invalid || undefined} className={cn(control, invalid ? "border-danger" : "border-line-strong", className)} {...rest}>{children}</select>;
});

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  /** Render the control; spread the props onto it so the label, hint and error are wired for assistive tech. */
  children: (p: { id: string; "aria-describedby"?: string; invalid: boolean; required: boolean }) => React.ReactNode;
};

/** Label above the field (no floating labels), optional hint, error announced politely. */
export function Field({ label, hint, error, required = false, className, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const describedBy = [hint && hintId, error && errId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}{required && <span aria-hidden className="ml-0.5 text-danger">*</span>}
      </label>
      {children({ id, "aria-describedby": describedBy, invalid: !!error, required })}
      {hint && !error && <p id={hintId} className="m-0 text-sm text-muted">{hint}</p>}
      {error && <p id={errId} role="alert" className="m-0 text-sm font-semibold text-danger">{error}</p>}
    </div>
  );
}
