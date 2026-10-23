import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";
import { LoaderCircle, type LucideIcon } from "./icons";

/** Class recipe, exported so a router <Link> can look like a button: className={buttonStyles({ variant })} */
export const buttonStyles = cva(
  [
    "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap",
    "rounded-md border font-semibold no-underline",
    "transition-[transform,background-color,color] duration-[var(--duration-1)] ease-[var(--ease-out)]",
    "shadow-[0_1px_0_rgba(255,255,255,.08)_inset] active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100",
  ],
  {
    variants: {
      variant: {
        primary: "border-transparent bg-brand text-on-brand hover-fine:hover:bg-[var(--brand-hover)] active:bg-[var(--brand-press)]",
        secondary: "border-line-strong bg-transparent text-ink hover-fine:hover:bg-surface-2",
        // quiet brand action that repeats in grids (Add on product cards): tint at rest, full brand on hover
        soft: "border-transparent bg-brand-tint text-brand-strong hover-fine:hover:bg-brand hover-fine:hover:text-on-brand",
        // brand accent (coral) for the one promotional action on a surface, never next to another accent button
        accent: "border-transparent bg-accent text-on-accent hover-fine:hover:bg-[color-mix(in_oklab,var(--accent)_88%,black)]",
        ghost: "border-transparent bg-transparent text-ink hover-fine:hover:bg-surface-2",
        danger: "border-transparent bg-danger text-[var(--on-danger)]",
        // on-image icon buttons only (DESIGN.md 3.2); the one button allowed to be glass
        glass: "glass rounded-full text-ink",
      },
      size: {
        sm: "min-h-12 px-3 text-sm",
        md: "min-h-12 px-4 text-base",
        lg: "min-h-14 px-6 text-lg",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonStyles> & {
    loading?: boolean;
    leadingIcon?: LucideIcon;
    trailingIcon?: LucideIcon;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, block, loading = false, leadingIcon: Lead, trailingIcon: Trail, className, children, disabled, type = "button", ...rest }, ref
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={cn(buttonStyles({ variant, size, block }), className)} {...rest}>
      {/* children stay in the layout (invisible while loading) so the button keeps its width */}
      <span className={cn("inline-flex items-center justify-center gap-2", loading && "invisible")}>
        {Lead && <Lead aria-hidden size={20} strokeWidth={1.75} />}
        {children}
        {Trail && <Trail aria-hidden size={20} strokeWidth={1.75} />}
      </span>
      {loading && <LoaderCircle aria-hidden className="absolute animate-spin" size={20} strokeWidth={2} />}
    </button>
  );
});
