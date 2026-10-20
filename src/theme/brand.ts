// White-label brand engine (docs/ux-overhaul/ARCHITECTURE.md section 5.1, DESIGN.md section 2.3).
// Given a vendor's primary colour it picks readable text for buttons, derives a stroke colour that is
// perceivable on both backgrounds, and warns when the colour cannot be made accessible without a change.

export const INK = "#15173A";
export const WHITE = "#FFFFFF";
const LIGHT_SURFACES = ["#FFFFFF", "#F7F6FB"];
const DARK_SURFACES = ["#181B45", "#0E1030"];

export type Rgb = [number, number, number];

export function parseHex(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
}

export const toHex = (c: Rgb) =>
  "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();

const lin = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
export const luminance = (c: Rgb) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);

export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const mix = (a: Rgb, b: Rgb, t: number): Rgb => a.map((v, i) => v * (1 - t) + b[i] * t) as Rgb;

export type BrandResult = {
  /** The (possibly clamped) primary colour. */
  brand: string;
  /** Text colour on the primary: ink or white, whichever reaches 4.5:1. */
  onBrand: string;
  /** Colour for strokes, focus accents and indicators; at least 3:1 on every surface of the theme. */
  strongLight: string;
  strongDark: string;
  /** True when the input had to be changed to reach 4.5:1 for button text. */
  clamped: boolean;
  /** Human-readable warning for the settings screen, or null. */
  warning: string | null;
  ratio: number;
};

function pickOn(brand: Rgb): { on: string; ratio: number } {
  const ink = parseHex(INK)!, white = parseHex(WHITE)!;
  const ri = contrast(brand, ink), rw = contrast(brand, white);
  return ri >= rw ? { on: INK, ratio: ri } : { on: WHITE, ratio: rw };
}

/** Move `c` toward `target` until it reaches `need` against every surface. */
function reach(c: Rgb, target: Rgb, need: number, surfaces: string[]): Rgb {
  const bgs = surfaces.map((s) => parseHex(s)!);
  for (let t = 0; t <= 1.0001; t += 0.01) {
    const next = mix(c, target, t);
    if (bgs.every((bg) => contrast(next, bg) >= need)) return next;
  }
  return target;
}

export function deriveBrand(input: string): BrandResult | null {
  const rgb = parseHex(input);
  if (!rgb) return null;
  let brand = rgb;
  let { on, ratio } = pickOn(brand);
  let clamped = false;
  let warning: string | null = null;

  if (ratio < 4.5) {
    // Neither ink nor white is readable on this colour (a mid-tone). Push the colour toward whichever
    // end is nearer until the best text colour reaches 4.5:1.
    const toward = luminance(brand) > 0.18 ? parseHex(WHITE)! : parseHex(INK)!;
    const original = toHex(brand);
    for (let t = 0.02; t <= 1; t += 0.02) {
      const next = mix(rgb, toward, t);
      const r = pickOn(next);
      if (r.ratio >= 4.5) { brand = next; on = r.on; ratio = r.ratio; clamped = true; break; }
    }
    warning = `${original} is too mid-tone for readable button text; using ${toHex(brand)} instead.`;
  }

  const darkTarget = parseHex(INK)!;
  const lightTarget = parseHex("#FFFFFF")!;
  const strongLight = toHex(reach(brand, darkTarget, 3.05, LIGHT_SURFACES));
  const strongDark = toHex(reach(brand, lightTarget, 3.05, DARK_SURFACES));
  return { brand: toHex(brand), onBrand: on, strongLight, strongDark, clamped, warning, ratio };
}

/** CSS that overrides the brand variables for light, dark and system-dark. Injected by ThemeProvider. */
export function brandCss(b: BrandResult | null): string {
  if (!b) return "";
  const base = `--brand:${b.brand};--on-brand:${b.onBrand};`;
  return [
    `:root{${base}--brand-strong:${b.strongLight};}`,
    `:root[data-theme="dark"]{${base}--brand-strong:${b.strongDark};}`,
    `@media (prefers-color-scheme: dark){:root:not([data-theme]){${base}--brand-strong:${b.strongDark};}}`,
  ].join("\n");
}
