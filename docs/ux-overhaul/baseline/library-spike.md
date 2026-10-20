# Library spike (Phase 0, step 5)

**Method.** The project is not a git repository, so a throwaway branch was impossible. The spike ran in a scratch copy of the project outside the repo (`.../scratchpad/spike`), fresh `npm install`, no changes to the real tree. A single page (`Spike.tsx`) used every library; it was type-checked, built for production, run in the dev server and driven in the in-app browser. Real Supabase data was read through TanStack Query.

Environment: React 19.3.0, Vite 8.3.4 (Rolldown), Tailwind 4.3.3, TypeScript 5.9.3, Node 24.17.

## Result

| Library | Version | Peer deps allow React 19 | Installs clean | Type-check | Prod build | Runtime smoke test | Verdict |
|---|---|---|---|---|---|---|---|
| `@radix-ui/react-dialog` | 1.3.1 | yes | yes | OK | OK | opened and closed | Works |
| `@radix-ui/react-popover` | 1.3.1 | yes | yes | OK | OK | opened | Works |
| `@radix-ui/react-select` | 2.4.1 | yes | yes | OK | OK | listbox opened | Works |
| `@radix-ui/react-tabs` | 1.2.1 | yes | yes | OK | OK | switched panel | Works |
| `@radix-ui/react-switch` | 1.4.1 | yes | yes | OK | OK | toggled | Works |
| `@radix-ui/react-tooltip` | 1.4.1 | yes | yes | OK | OK | **mounted only** (hover not exercised) | Works (hover not verified) |
| `vaul` | 1.1.2 | yes | yes | OK | OK | drawer opened | Works |
| `sonner` | 2.0.8 | yes | yes | OK | OK | toast with Undo action rendered | Works |
| `embla-carousel-react` | 8.6.0 | yes | yes | OK | OK | next slide moved index 0 to 1 | Works |
| `lucide-react` | 1.60.0 | yes | yes | OK | OK | 4 icons rendered | Works (see note) |
| `motion` | 14.4.0 | yes | yes | OK | OK | animated element reached opacity 1 | Works, **but heavy** (see sizes) |
| `@tanstack/react-query` | 5.104.5 | yes | yes | OK | OK | fetched categories from Supabase (2 rows) | Works |
| `class-variance-authority` / `clsx` / `tailwind-merge` | 0.7.1 / 2.1.1 / 3.7.0 | yes | yes | OK | OK | used for variants | Works |
| `vite-plugin-pwa` (+ `workbox-build`, `workbox-window` 7.4.1) | 2.0.0 | `vite ^8` accepted | yes | OK | OK, `injectManifest` produced `sw-spike.js` with a precache list | **not verified** (see below) | Builds; runtime unverified |

No install conflicts, no `ERESOLVE`, no React duplicate (`npm ls react` shows one deduped 19.3.0). The browser console showed no errors or warnings during the smoke test.

Notes:
- `lucide-react` 1.60.0 is a new major (older docs reference 0.x). Per-icon named imports tree-shook correctly: 4 icons cost about 4.8 kB gzip including the shared base.
- `vite-plugin-pwa` 2.0.0 printed a Rolldown deprecation warning (`inlineDynamicImports` should be `codeSplitting: false`). Cosmetic today; watch on upgrades.
- The generated precache list included the project's current `public/sw.js` as an asset. When PW-3 lands, the legacy `public/sw.js` must be removed so it is not precached or shadowed.
- **Service worker could not be tested at runtime.** The in-app browser rejects `navigator.serviceWorker.register` for any script, including the project's existing `/sw.js` ("unknown error occurred when fetching the script", while the file is served correctly). It is an environment limit of that browser pane. Real Chrome on Android and Windows must verify registration, precache, update prompt and the image runtime cache. Manual task.

## Install size on disk (`node_modules` delta, includes transitive deps)

| Package group | Delta |
|---|---|
| Radix (6 primitives) | +3.6 MB |
| `vaul` | +0.2 MB |
| `sonner` | +0.2 MB |
| `embla-carousel-react` | +0.8 MB |
| `lucide-react` | **+44.0 MB** (all icon source files on disk; only used icons ship) |
| `motion` | +13.1 MB |
| `@tanstack/react-query` | +7.1 MB |
| `vite-plugin-pwa` + `workbox-build` + `workbox-window` | **+64.1 MB** (build-time only) |
| `class-variance-authority`, `clsx`, `tailwind-merge` | +1.2 MB |
| Total on top of the 104 MB baseline | about +133 MB |

Disk size matters for CI cache and installs, not for users.

## Bundle cost in the browser (what users download)

Measured with `rollup-plugin-visualizer` on the spike build (entry gzip, everything eager):

| Library | Gzip |
|---|---|
| Radix (6 primitives, plus `@floating-ui`, `aria-hidden`, `react-remove-scroll`) | about 58 kB (floating-ui 8.9 kB of that) |
| `motion` via `LazyMotion` + `domAnimation` | **about 78 kB** (`motion-dom` 64 kB + `framer-motion` 14 kB) |
| `@tanstack/react-query` | 19.5 kB |
| `sonner` | 11.6 kB |
| `vaul` | 11.5 kB |
| `embla-carousel` | 11.5 kB |
| `tailwind-merge` | 11.1 kB |
| `lucide-react` (4 icons) | 4.8 kB |

Spike entry totalled 234 kB gzip, versus 175.7 kB for the real app today (the spike contains only React, Supabase and these libraries, not the app's pages or router).

Motion variants tested:

| Variant | Entry gzip | Notes |
|---|---|---|
| `LazyMotion` + `domAnimation` imported statically (as in ARCHITECTURE.md section 4) | 234.0 kB | About 78 kB for motion alone |
| Same, `domAnimation` loaded with a dynamic `import()` | 219.0 kB entry + 17.9 kB lazy chunk | Saves only 15 kB: the `m` component still pulls most of `motion-dom` |
| `motion/mini` (`animate()` only, Web Animations API) | 207.8 kB | motion family about **9.8 kB** gzip |

## Findings that change the plan

1. **Everything is compatible with React 19 and Vite 8.** No library needs replacing.
2. **The stack does not fit the 200 kB entry budget if loaded eagerly.** Today's entry is 175.7 kB. Radix + vaul + sonner + embla + TanStack Query + `tailwind-merge` alone add about 125 kB gzip. Adding `motion` (78 kB) brings the total to about 200 kB on top of today's entry. Required mitigations:
   - Load Sheet/Dialog (Radix + vaul), carousel and lightbox on first use via `import()`, not in the entry.
   - Replace `motion/react` for routine animation with CSS and View Transitions, and use `motion/mini` (about 10 kB) only where the Web Animations API is useful. Reserve full `motion` for admin or drop it. This needs an ADR amendment to ARCHITECTURE.md section 4.
   - Load only the active language dictionary.
   - Prefer `clsx` + CVA without `tailwind-merge` (11 kB) once the `!` overrides are gone, or keep `tailwind-merge` inside `src/ui` only.
   - Keep `@supabase/realtime-js` (25 kB) out of the storefront entry by importing a client without Realtime for storefront routes, or lazy-loading Realtime in admin.
3. **`vite-plugin-pwa` is the heaviest install (64 MB) but build-time only.** Its runtime behaviour must be proven in real Chrome before Phase 6.
4. **Lucide per-icon imports are cheap**, so the "no emoji" rule has almost no bundle cost.
