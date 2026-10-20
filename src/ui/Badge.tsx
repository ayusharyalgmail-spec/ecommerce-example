import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";
import { CircleCheck, Info, TriangleAlert, type LucideIcon } from "./icons";

const badgeStyles = cva("inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-xs font-semibold leading-[1.4]", {
  variants: {
    tone: {
      neutral: "bg-surface-2 text-ink",
      success: "bg-[var(--success-tint)] text-success",
      warning: "bg-[var(--warning-tint)] text-warning",
      danger: "bg-[var(--danger-tint)] text-danger",
      info: "bg-[var(--info-tint)] text-info",
    },
  },
  defaultVariants: { tone: "neutral" },
});

const DEFAULT_ICON: Partial<Record<NonNullable<VariantProps<typeof badgeStyles>["tone"]>, LucideIcon>> = {
  success: CircleCheck, warning: TriangleAlert, danger: TriangleAlert, info: Info,
};

type BadgeProps = VariantProps<typeof badgeStyles> & { children: React.ReactNode; icon?: LucideIcon | false; className?: string };

/** Status chip. Colour is never the only signal: every non-neutral tone carries an icon next to its text. */
export function Badge({ tone = "neutral", icon, children, className }: BadgeProps) {
  const Icon = icon === false ? null : icon ?? (tone ? DEFAULT_ICON[tone] : undefined);
  return (
    <span className={cn(badgeStyles({ tone }), className)}>
      {Icon && <Icon aria-hidden size={14} strokeWidth={2} />}
      {children}
    </span>
  );
}
