import { Link } from "react-router-dom";
import { cn } from "./cn";
import { iconButtonStyles } from "./IconButton";
import type { LucideIcon } from "./icons";

type Props = {
  to: string;
  icon: LucideIcon;
  /** Required accessible name. */
  label: string;
  badge?: number;
  variant?: "ghost" | "secondary" | "primary" | "glass";
  className?: string;
  viewTransition?: boolean;
};

/** Navigation counterpart of IconButton: a real <a> (opens in new tab, shows URL on hover) with the same 48 px target and badge. */
export function IconLink({ to, icon: Icon, label, badge, variant, className, viewTransition }: Props) {
  return (
    <Link to={to} aria-label={label} viewTransition={viewTransition} className={cn(iconButtonStyles({ variant }), className)}>
      <Icon aria-hidden size={24} strokeWidth={1.75} />
      {!!badge && (
        <span aria-hidden className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-semibold text-on-accent" style={{ height: 20 }}>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}
