import { useId, useState } from "react";
import { cn } from "@/ui";
import { formatNpr } from "@/lib/money";

export type Point = { key: string; label: string; value: number; count: number };

/** Short money label for axis ticks: Rs. 1.2k, Rs. 35k, Rs. 1.4L (lakh, as read in Nepal). */
export function compactNpr(paisa: number) {
  const r = paisa / 100;
  if (r >= 100000) return `Rs. ${(r / 100000).toFixed(r >= 1000000 ? 0 : 1)}L`;
  if (r >= 1000) return `Rs. ${(r / 1000).toFixed(r >= 10000 ? 0 : 1)}k`;
  return `Rs. ${Math.round(r)}`;
}

/** A tidy upper bound for the y axis (1, 2, 2.5 or 5 times a power of ten) so grid lines land on round numbers. */
function niceMax(v: number) {
  if (v <= 100000) return 100000; // never below Rs. 1,000, so small days do not look like spikes

  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 2.5, 5, 10].find((m) => m * p >= v) ?? 10) * p;
}

/**
 * Sales bars with a smooth trend line. Hover, tap or arrow keys select a bar; the readout above the plot announces it.
 * The y axis starts at zero (honest bar heights) and a visually hidden table carries every value for screen readers.
 */
export function SalesChart({ points, labels }: { points: Point[]; labels: { sales: string; orders: string; summary: string; empty: string } }) {
  const id = useId();
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...points.map((p) => p.value)));
  const W = 600, H = 200, padL = 0, n = Math.max(points.length, 1), slot = (W - padL) / n;
  const sel = active ?? (points.length ? points.length - 1 : 0);
  const p = points[sel];
  const y = (v: number) => H - (v / max) * (H - 8);
  const line = points.map((pt, i) => `${i ? "L" : "M"}${padL + slot * i + slot / 2},${y(pt.value)}`).join(" ");
  const empty = points.every((pt) => pt.value === 0);

  return (
    <figure className="m-0 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3" aria-live="polite">
        <div>
          <p className="m-0 text-sm text-muted">{p?.label}</p>
          <p className="m-0 text-metric font-bold tabular">{p ? formatNpr(p.value) : "–"}</p>
        </div>
        <p className="m-0 text-sm text-muted tabular">{p ? `${p.count} ${labels.orders}` : ""}</p>
      </div>
      <div className="relative">
        {/* grid lines with labels: 0, half, max */}
        <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col justify-between">
          {[max, max / 2, 0].map((v) => (
            <div key={v} className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-[11px] text-muted tabular">{empty ? "" : compactNpr(v)}</span>
              <span className="h-px flex-1 border-t border-dashed border-line" />
            </div>
          ))}
        </div>
        {/* A slider over the time axis: arrow keys move between bars and the value text is read out. */}
        <div tabIndex={0} role="slider" aria-label={labels.summary} aria-describedby={`${id}-t`}
          aria-valuemin={0} aria-valuemax={Math.max(0, points.length - 1)} aria-valuenow={sel}
          aria-valuetext={p ? `${p.label}: ${formatNpr(p.value)}, ${p.count} ${labels.orders}` : undefined}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") { e.preventDefault(); setActive(Math.max(0, sel - 1)); }
            else if (e.key === "ArrowRight") { e.preventDefault(); setActive(Math.min(points.length - 1, sel + 1)); }
          }}
          className="relative ml-16 rounded-sm">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-44 w-full sm:h-52" aria-hidden onMouseLeave={() => setActive(null)}>
            <defs>
              <linearGradient id={`${id}-bar`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--ink)" stopOpacity=".9" />
                <stop offset="1" stopColor="var(--ink)" stopOpacity=".55" />
              </linearGradient>
            </defs>
            {points.map((pt, i) => {
              const h = Math.max(pt.value ? 3 : 0, H - y(pt.value));
              const x = padL + slot * i;
              const on = i === sel;
              return (
                <g key={pt.key} onMouseEnter={() => setActive(i)} onClick={() => setActive(i)} style={{ cursor: "pointer" }}>
                  <rect x={x} y={0} width={slot} height={H} fill="transparent" />
                  {on && !empty && <rect x={x + slot * 0.08} y={0} width={slot * 0.84} height={H} rx="6" fill="var(--surface-2)" />}
                  <rect className="chart-bar" x={x + slot * 0.2} y={H - h} width={slot * 0.6} height={h} rx={Math.min(6, slot * 0.2)}
                    fill={on ? "var(--accent-fill)" : `url(#${id}-bar)`} style={{ animationDelay: `${i * 14}ms` }} />
                </g>
              );
            })}
            {!empty && <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity=".35" />}
          </svg>
          {empty && <p className="absolute inset-0 m-0 flex items-center justify-center text-center text-sm text-muted">{labels.empty}</p>}
        </div>
      </div>
      <div aria-hidden className="ml-16 flex justify-between text-xs text-muted tabular">
        <span>{points[0]?.label}</span><span>{points.at(-1)?.label}</span>
      </div>
      <figcaption id={`${id}-t`} className="sr-only-text">
        <table><caption>{labels.summary}</caption><thead><tr><th>Date</th><th>{labels.sales}</th><th>{labels.orders}</th></tr></thead>
          <tbody>{points.map((pt) => <tr key={pt.key}><td>{pt.label}</td><td>{formatNpr(pt.value)}</td><td>{pt.count}</td></tr>)}</tbody></table>
      </figcaption>
    </figure>
  );
}

/** Ranked horizontal bars (best sellers, revenue by category). Values are shown as text; the bar only supports the number. */
export function BarList({ items, tone = "ink", format = formatNpr }: {
  items: { key: string; label: string; value: number; sub?: string; leading?: React.ReactNode }[];
  tone?: "ink" | "accent" | "mint"; format?: (v: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const fill = tone === "accent" ? "bg-accent-fill" : tone === "mint" ? "bg-mint" : "bg-ink";
  return (
    <ul className="m-0 list-none space-y-3 p-0">
      {items.map((i) => (
        <li key={i.key} className="flex items-center gap-3">
          {i.leading}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-semibold text-ink">{i.label}</span>
              <span className="shrink-0 font-semibold tabular">{format(i.value)}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span aria-hidden className={cn("chart-hbar block h-1.5 rounded-pill", fill)} style={{ width: `${Math.max(3, (i.value / max) * 100)}%` }} />
              {i.sub && <span className="shrink-0 text-xs text-muted tabular">{i.sub}</span>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
