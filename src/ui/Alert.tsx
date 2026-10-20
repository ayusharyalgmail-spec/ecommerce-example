import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";
import { CircleCheck, Info, TriangleAlert, type LucideIcon } from "./icons";

const alertStyles = cva("flex items-start gap-3 rounded-md border p-3 text-ink", {
  variants: {
    tone: {
      info: "border-info bg-[var(--info-tint)]",
      success: "border-success bg-[var(--success-tint)]",
      warning: "border-warning bg-[var(--warning-tint)]",
      danger: "border-danger bg-[var(--danger-tint)]",
    },
  },
  defaultVariants: { tone: "info" },
});
const ICON: Record<string, LucideIcon> = { info: Info, success: CircleCheck, warning: TriangleAlert, danger: TriangleAlert };

type Props = VariantProps<typeof alertStyles> & { children: React.ReactNode; className?: string };

/** Inline message. Danger and warning use role="alert" (announced at once); info and success are polite status. Icon plus text, never colour alone. */
export function Alert({ tone = "info", children, className }: Props) {
  const Icon = ICON[tone ?? "info"];
  const urgent = tone === "danger" || tone === "warning";
  return (
    <div role={urgent ? "alert" : "status"} className={cn(alertStyles({ tone }), className)}>
      <Icon aria-hidden size={20} strokeWidth={2} className="mt-0.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
