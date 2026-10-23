import { useState } from "react";
import { formatNpr } from "@/lib/money";
import type { SeriesPoint } from "@/lib/ledger";

type Props = { points: SeriesPoint[]; locale: string; labels: { sales: string; collected: string; summary: string } };

/**
 * Grouped bars: goods sold vs money received per day. Hand-drawn SVG (no chart dependency).
 * The y-axis always starts at zero so bar heights are honest; a visually hidden table carries the same data.
 */
export function TrendChart({ points, locale, labels }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...points.flatMap((p) => [p.sales_paisa, p.collected_paisa]));
  const W = 100 / Math.max(points.length, 1);
  const H = 120;
  const day = (d: string, o: Intl.DateTimeFormatOptions) => new Date(`${d}T00:00:00`).toLocaleDateString(locale, o);
  const sel = active ?? points.length - 1;
  const p = points[sel];

  return (
    <figure className="m-0 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2" aria-live="polite">
        <span className="text-sm text-muted">{p && day(p.day, { weekday: "short", day: "numeric", month: "short" })}</span>
        <span className="flex gap-4 text-sm">
          <span className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-xs bg-ink" />{labels.sales} <strong className="tabular">{p ? formatNpr(p.sales_paisa) : "–"}</strong></span>
          <span className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-xs bg-success" />{labels.collected} <strong className="tabular">{p ? formatNpr(p.collected_paisa) : "–"}</strong></span>
        </span>
      </div>
      <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className="h-40 w-full sm:h-48" aria-hidden onMouseLeave={() => setActive(null)}>
        <line x1="0" x2="100" y1={H} y2={H} stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        {points.map((pt, i) => {
          const hs = (pt.sales_paisa / max) * (H - 4);
          const hc = (pt.collected_paisa / max) * (H - 4);
          const x = i * W;
          const dim = sel !== i ? 0.45 : 1;
          return (
            <g key={pt.day} onMouseEnter={() => setActive(i)} onClick={() => setActive(i)} style={{ cursor: "pointer" }}>
              <rect x={x} y={0} width={W} height={H} fill="transparent" />
              <rect className="chart-bar" x={x + W * 0.14} y={H - hs} width={W * 0.34} height={hs} rx="0.6" fill="var(--ink)" opacity={dim} style={{ animationDelay: `${i * 18}ms` }} />
              <rect className="chart-bar" x={x + W * 0.52} y={H - hc} width={W * 0.34} height={hc} rx="0.6" fill="var(--success)" opacity={dim} style={{ animationDelay: `${i * 18 + 30}ms` }} />
            </g>
          );
        })}
      </svg>
      <div aria-hidden className="flex justify-between text-xs text-muted tabular">
        <span>{points[0] && day(points[0].day, { day: "numeric", month: "short" })}</span>
        <span>{points.at(-1) && day(points.at(-1)!.day, { day: "numeric", month: "short" })}</span>
      </div>
      <figcaption className="sr-only">
        {labels.summary}
        <table><thead><tr><th>Date</th><th>{labels.sales}</th><th>{labels.collected}</th></tr></thead>
          <tbody>{points.map((pt) => <tr key={pt.day}><td>{pt.day}</td><td>{formatNpr(pt.sales_paisa)}</td><td>{formatNpr(pt.collected_paisa)}</td></tr>)}</tbody></table>
      </figcaption>
    </figure>
  );
}
