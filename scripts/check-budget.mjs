// Performance budgets as a CI gate (docs/ux-overhaul/ARCHITECTURE.md section 9.1). Run after build: npm run size
// The storefront's "entry JS" is everything index.html loads up front (entry chunk plus the shared chunks the bundler
// splits out), so it is measured from index.html rather than from file names. Sizes use gzip level 9, the same as
// the Phase 0 baseline (docs/ux-overhaul/baseline/bundle.md: 175.7 kB).
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const dist = path.resolve("dist"); // run from the project root (npm run size)
const BUDGET = { entryJs: 200, css: 40, routeChunk: 80 }; // kB gzip
const gz = (f) => zlib.gzipSync(fs.readFileSync(f), { level: 9 }).length / 1000;

const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const initial = new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1].slice(1)));
const all = fs.readdirSync(path.join(dist, "assets")).map((f) => "assets/" + f);

let jsInitial = 0, css = 0, fail = 0;
const rows = [];
for (const f of all) {
  const size = gz(path.join(dist, f));
  if (f.endsWith(".css")) { if (initial.has(f)) css += size; continue; }
  if (initial.has(f)) { jsInitial += size; rows.push([f, size, "initial"]); }
  else {
    rows.push([f, size, "lazy"]);
    if (size > BUDGET.routeChunk) { console.error(`FAIL lazy chunk ${f}: ${size.toFixed(1)} kB > ${BUDGET.routeChunk} kB`); fail++; }
  }
}
const line = (name, v, b) => { const ok = v <= b; if (!ok) fail++; console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${v.toFixed(1)} kB of ${b} kB (${((v / b) * 100).toFixed(0)}%)`); };
line("storefront initial JS (gzip)", jsInitial, BUDGET.entryJs);
line("initial CSS (gzip)", css, BUDGET.css);
const lazy = rows.filter((r) => r[2] === "lazy");
console.log(`lazy chunks: ${lazy.length}, largest ${Math.max(0, ...lazy.map((r) => r[1])).toFixed(1)} kB (budget ${BUDGET.routeChunk} kB each)`);
if (process.argv.includes("--list")) for (const r of rows.sort((a, b) => b[1] - a[1])) console.log(`  ${r[2].padEnd(7)} ${r[1].toFixed(1).padStart(7)} kB  ${r[0]}`);
process.exit(fail ? 1 : 0);
