# Bundle baseline (20 Oct 2026)

Measured on the current `main` tree after `npm install`, `npm run typecheck` and `ANALYZE=1 npm run build`.

| Step | Result |
|---|---|
| `npm install` | OK, 0 vulnerabilities, 112 MB `node_modules` |
| `npm run typecheck` | OK, 0 errors (about 4.6 s) |
| `npm run build` (`tsc --noEmit && vite build`) | OK, built in 2.3 s (Vite 8.3.4, Rolldown) |
| Build warning | Entry chunk is over 500 kB after minification |

Tooling added: `rollup-plugin-visualizer@7.1.1` (dev dependency), enabled only when `ANALYZE=1`. It writes `bundle-report.html` (treemap) and `bundle-stats.json` into this folder. Run `ANALYZE=1 npm run build` to refresh.

## Output files

| File | Raw | Gzip | Brotli |
|---|---|---|---|
| `assets/index-*.js` (entry: shell + every storefront route + libraries) | 618.9 kB | **175.7 kB** | 149.9 kB |
| `assets/index-*.css` | 24.8 kB | 5.6 kB | 4.9 kB |
| `index.html` | 0.9 kB | 0.5 kB | n/a |
| 14 admin route chunks (lazy) | 1.1 to 7.0 kB each | 0.6 to 2.3 kB each | n/a |
| All admin chunks together | 45.2 kB | 17.3 kB | n/a |

Gzip note: the table uses `gzip -9`. Vite's own reporter prints 177.6 kB for the same entry (default gzip level), so budgets must be set with one tool (`size-limit`) and compared only against itself.

`public/` adds `sw.js` (4.5 kB), `manifest.webmanifest`, `icon.svg`. Fonts are not in the bundle: Noto Sans Devanagari comes from the Google Fonts CDN (render-blocking `<link>`).

## What is inside the entry chunk

From `bundle-stats.json` (raw is minified size before compression):

| Package | Raw | Gzip | Brotli |
|---|---|---|---|
| `react-dom` | 524.2 kB | 99.0 kB | 80.6 kB |
| App source (all storefront pages, `lib/`, **both message dictionaries**) | 217.8 kB | 62.3 kB | 53.8 kB |
| `react-router` | 207.3 kB | 46.8 kB | 39.1 kB |
| `@supabase/auth-js` | 170.0 kB | 33.4 kB | 28.5 kB |
| `@supabase/realtime-js` + `phoenix` | 94.1 kB | 25.4 kB | 22.2 kB |
| `@supabase/storage-js` | 41.4 kB | 7.7 kB | 6.8 kB |
| `@supabase/postgrest-js` | 30.4 kB | 7.0 kB | 6.2 kB |
| `@supabase/supabase-js` + `functions-js` | 26.1 kB | 8.0 kB | 7.0 kB |
| `react`, `scheduler` | 25.8 kB | 7.3 kB | 6.3 kB |

Notes:
- `@supabase/realtime-js` (about 25 kB gzip) is bundled although the storefront does not use Realtime today. Admin Realtime is planned (AD-6), so it will be needed there but not in the storefront entry.
- `src/messages/en.json` + `ne.json` are about 23.6 kB raw (6.7 kB gzip) and are both bundled eagerly. Only the active language is needed.

## Against the proposed budgets

| Budget (ARCHITECTURE.md section 9.1) | Limit | Now | Headroom |
|---|---|---|---|
| Storefront entry JS (gzip) | 200 kB | **175.7 kB** | **24 kB only** |
| Any route chunk (gzip) | 80 kB | 2.3 kB (admin max) | fine |
| CSS (gzip) | 40 kB | 5.6 kB | fine |

**The entry is already 88% of its budget before any new UI library is added.** The library spike (see `library-spike.md`) shows the planned stack would add roughly 125 kB gzip (without `motion`) to 200 kB (with `LazyMotion` `motion`) if loaded eagerly. The budget is only reachable with route-level splitting of overlays (sheet, dialog, carousel, motion), a smaller motion choice, and loading only the active language.

## Not measured in this pass

Lighthouse (mobile, Slow 4G), Web Vitals, axe scan and route screenshots at 360 px and 1366 px in EN and NE. These need either a real device or a Chrome-based run and are listed as manual tasks in the Phase 0 report.
