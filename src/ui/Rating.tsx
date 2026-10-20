import { useId } from "react";
import { cn } from "./cn";

const STAR = "M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.5 6.1 20.7l1.2-6.6L2.5 9.5l6.6-.9z";

type Props = {
  /** 0 to 5, halves allowed (4.5). */
  value: number;
  /** Number of reviews, shown in brackets. */
  count?: number;
  size?: number;
  /** Accessible text, for example "4.5 out of 5, 28 reviews". Pass a translated string. */
  label: string;
  className?: string;
};

/** Read-only SVG stars with half-star support. Scalable and legible in forced-colors (uses currentColor). */
export function Rating({ value, count, size = 16, label, className }: Props) {
  const uid = useId();
  const v = Math.max(0, Math.min(5, value));
  return (
    <span role="img" aria-label={label} className={cn("inline-flex items-center gap-1 text-sm text-muted", className)}>
      <span aria-hidden className="inline-flex text-brand-strong">
        {[0, 1, 2, 3, 4].map((i) => {
          const fill = Math.max(0, Math.min(1, v - i));
          const id = `${uid}-${i}`;
          return (
            <svg key={i} width={size} height={size} viewBox="0 0 24 24">
              <defs><clipPath id={id}><rect x="0" y="0" width={24 * fill} height="24" /></clipPath></defs>
              <path d={STAR} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
              <path d={STAR} fill="currentColor" clipPath={`url(#${id})`} />
            </svg>
          );
        })}
      </span>
      {count !== undefined && <span aria-hidden>({count})</span>}
    </span>
  );
}
