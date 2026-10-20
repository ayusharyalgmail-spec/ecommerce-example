import { cn } from "./cn";
import type { LucideIcon } from "./icons";

type Props = { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode; className?: string };

/** Flat empty/error state: one icon tile in a brand tint, a title, one action. */
export function EmptyState({ icon: Icon, title, description, action, className }: Props) {
  return (
    <div className={cn("mx-auto flex max-w-sm flex-col items-center gap-3 px-4 py-12 text-center", className)}>
      <span aria-hidden className="flex size-20 items-center justify-center rounded-xl bg-brand-tint text-ink">
        <Icon size={36} strokeWidth={1.5} />
      </span>
      <h2 className="m-0 text-xl font-bold text-ink">{title}</h2>
      {description && <p className="m-0 text-muted">{description}</p>}
      {action}
    </div>
  );
}
