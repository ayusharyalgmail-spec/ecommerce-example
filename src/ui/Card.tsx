import { forwardRef } from "react";
import { cn } from "./cn";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Hover raise (desktop, hover-capable pointers only). */
  interactive?: boolean;
  /** No padding: for cards that hold edge-to-edge media. */
  flush?: boolean;
};

/** Flat card: solid surface, one hairline border, no shadow stack. Never glass (DESIGN.md 3.3). */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card({ interactive, flush, className, ...rest }, ref) {
  return (
    <div ref={ref} className={cn(
      "rounded-lg border border-line bg-surface text-ink",
      !flush && "p-4",
      interactive && "transition-shadow hover-fine:hover:shadow-[var(--e2)]",
      className
    )} {...rest} />
  );
});
