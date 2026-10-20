// Verifies WCAG contrast for every token pair that matters, reading the real values from
// src/styles/tokens.css. Exits 1 on any failure. Run: npm run contrast
// Thresholds: text 4.5:1, UI components / graphical objects 3:1 (WCAG 2.2 AA).
import fs from "node:fs";

const css = fs.readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8");

function block(startRe) {
  const m = css.match(startRe);
  if (!m) throw new Error("block not found: " + startRe);
  let i = m.index + m[0].length, depth = 1, out = "";
  while (depth && i < css.length) { const c = css[i++]; if (c === "{") depth++; else if (c === "}") depth--; if (depth) out += c; }
  return out;
}
const vars = (b) => Object.fromEntries([...b.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const lightFull = vars(block(/\n:root \{\n  color-scheme: light;/) );
const darkOver = vars(block(/:root\[data-theme="dark"\] \{/));

const L = lightFull;
const D = { ...L, ...darkOver };

const hex = (h) => { h = h.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const over = (fg, a, bg) => fg.map((v, i) => v * a + bg[i] * (1 - a));
const color = (T, k) => hex(T[k]);

const rgba = (s) => { const m = s.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/); return { c: [+m[1], +m[2], +m[3]], a: +m[4] }; };
const TINT = 0.08; // status tint opacity, matches --*-tint in tokens.css

const rows = [];
function check(mode, name, fg, bg, need) { const r = ratio(fg, bg); rows.push({ mode, name, r, need, ok: r >= need }); }

for (const [mode, T] of [["light", L], ["dark", D]]) {
  const S = color(T, "surface"), B = color(T, "bg"), S2 = color(T, "surface-2");
  for (const [bn, bg] of [["bg", B], ["surface", S], ["surface-2", S2]]) {
    check(mode, `ink on ${bn}`, color(T, "ink"), bg, 4.5);
    check(mode, `text-muted on ${bn}`, color(T, "text-muted"), bg, 4.5);
  }
  check(mode, "on-brand on brand (primary button)", color(T, "on-brand"), color(T, "brand"), 4.5);
  check(mode, "on-danger on danger (danger button)", color(T, "on-danger"), color(T, "danger"), 4.5);
  check(mode, "brand-strong as UI on surface", color(T, "brand-strong"), S, 3);
  check(mode, "brand-strong as UI on bg", color(T, "brand-strong"), B, 3);
  check(mode, "line-strong (input border) on surface", color(T, "line-strong"), S, 3);
  check(mode, "line-strong (input border) on bg", color(T, "line-strong"), B, 3);
  check(mode, "accent text on surface", color(T, "accent"), S, 4.5);
  check(mode, "glacier-text on surface", color(T, "glacier-text"), S, 4.5);
  for (const k of ["success", "warning", "danger", "info", "accent"]) {
    check(mode, `${k} text on surface`, color(T, k), S, 4.5);
    check(mode, `${k} text on its ${TINT * 100}% tint chip`, color(T, k), over(color(T, k), TINT, S), 4.5);
  }
  // glass: ink must reach 4.5:1 on the worst backdrop. Muted text is not allowed on glass at all.
  const g = rgba(T["glass-bg"]), gs = rgba(T["glass-bg-solid"]);
  const backdrops = { black: [0, 0, 0], white: [255, 255, 255], marigold: hex("#F5A524"), grey: [128, 128, 128], indigo: hex("#0E1030"), red: [220, 30, 40] };
  for (const [bn, bc] of Object.entries(backdrops)) {
    check(mode, `ink on glass over ${bn}`, color(T, "ink"), over(g.c, g.a, bc), 4.5);
    check(mode, `ink on Lite glass over ${bn}`, color(T, "ink"), over(gs.c, gs.a, bc), 4.5);
  }
}

const f = (n) => n.toFixed(2);
const fails = rows.filter((r) => !r.ok);
for (const r of rows) if (process.argv.includes("--all") || !r.ok) console.log(`${r.ok ? "PASS" : "FAIL"} [${r.mode}] ${r.name}: ${f(r.r)} (needs ${r.need})`);
console.log(`${rows.length} checks, ${fails.length} failing`);
process.exit(fails.length ? 1 : 0);
