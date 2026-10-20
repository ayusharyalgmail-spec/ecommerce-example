import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";
import type { LucideIcon } from "./icons";

export const iconButtonStyles = cva(
  [
    "relative inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-transparent",
    "transition-[transform,background-color] duration-[var(--duration-1)] ease-[var(--ease-out)] active:scale-[.94]",
    "disabled:cursor-not-allowed disabled:opacity-60",
  ],
  {
    variants: {
      variant: {
        ghost: "bg-transparent text-ink hover-fine:hover:bg-surface-2",
        secondary: "border-line-strong bg-transparent text-ink hover-fine:hover:bg-surface-2",
        primary: "bg-brand text-on-brand",
        glass: "glass text-ink",
      },
    },
    defaultVariants: { variant: "ghost" },
  }
);

export type IconButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> &
  VariantProps<typeof iconButtonStyles> & {
    icon: LucideIcon;
    /** Required: the accessible name (icon-only buttons have no visible text). */
    label: string;
    /** Small numeric badge, for example the cart count. */
    badge?: number;
    pressed?: boolean;
  };

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, badge, pressed, variant, className, type = "button", ...rest }, ref
) {
  return (
    <button ref={ref} type={type} aria-label={label} aria-pressed={pressed} className={cn(iconButtonStyles({ variant }), className)} {...rest}>
      <Icon aria-hidden size={24} strokeWidth={1.75} fill={pressed ? "currentColor" : "none"} />
      {!!badge && (
        <span aria-hidden className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-semibold text-on-accent" style={{ height: 20 }}>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
});
