import { forwardRef } from "react";
import { cn } from "./cn";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Hover raise (desktop, hover-capable pointers only). */
  interactive?: boolean;
  /** No padding: for cards that hold edge-to-edge media. */
  flush?: boolean;
};

/** Surface card: white on the warm page, a hairline border and resting elevation; interactive cards lift on hover. */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card({ interactive, flush, className, ...rest }, ref) {
  return (
    <div ref={ref} className={cn(
      "rounded-lg border border-line bg-surface text-ink shadow-[var(--e1)]",
      !flush && "p-5",
      interactive && "transition-[box-shadow,transform] duration-[var(--duration-2)] hover-fine:hover:-translate-y-0.5 hover-fine:hover:shadow-[var(--e2)]",
      className
    )} {...rest} />
  );
});
