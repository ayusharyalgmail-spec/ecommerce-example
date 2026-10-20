# Phase 1 report: Foundation (20 Oct 2026)

Branch `ux/phase-1`, commits on top of the Phase 0 baseline, tag `v0.2.0`.

## Summary
- The design-system foundation is in place: tokens, self-hosted Mukta, glass recipe with four fallbacks, theme/brand/effects engine, 15 primitives, lazy overlays, toasts, Storybook and CI-style gates. The whole app already renders with the new tokens.
- `npm run check` passes: typecheck, ESLint, 31 tests (axe on all primitives), 232 i18n keys, 74 contrast checks, build, performance budget.
- Open risk: initial JS is **190.7 kB of 200 kB gzip (95%)**, up from 175.7 kB; about 9 kB of headroom remains for Phases 2 to 5.

## What changed (files)
- Styles: `src/styles/{tokens,base,glass,ui,legacy,fonts}.css`, `src/index.css`, `index.html` (pre-paint theme script, font preloads, dual `theme-color`), `public/fonts/*` (Mukta).
- Theme: `src/theme/{brand,fx,ThemeProvider,BrandLoader}` with unit tests.
- UI library: `src/ui/*` (Button, IconButton, Field/Input/Textarea/Select, Checkbox/Radio/ChoiceCard/Switch, Chip, Badge, Card, Skeleton, EmptyState, GlassPanel, Rating, icons, Overlays, toast, useSheetHistory), 4 story files, `a11y.test.tsx`.
- Data and i18n: `src/lib/useQuery.ts` (TanStack shim), `src/lib/queries.ts`, lazy Nepali dictionary in `src/lib/i18n.tsx`.
- Existing pages: emoji and glyph stars replaced with Lucide/Rating in 14 files; `Chrome.tsx` breakpoints `lg` to `md`; add-to-cart and cart-removal toasts.
- Tooling: `eslint.config.js` + `eslint.legacy-allowlist.json` (31 frozen legacy files), `scripts/{contrast,check-i18n,check-budget}.mjs`, `.storybook/`, vitest config, `package.json` scripts (`check`, `test`, `lint`, `contrast`, `i18n`, `size`, `storybook`).
- Database (additive plus one fix): `brand` and `ui_v2` columns; `store_settings` column-level grants; `admin_store_settings()`; `supabase/migrations/20261020150000_*.sql`; `DATABASE.md` updated.
- Docs: `DECISIONS.md` (ADR amendments), `TASKS.md` (status table), `docs/ux-overhaul/baseline/breakpoints.md`, `docs/ux-overhaul/phase-1/*`, skill `.claude/skills/bazaar-glass-ui/SKILL.md`.

## Verification (commands run, real results)
| Command | Result |
|---|---|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 problems. Rules: no `!` utilities or legacy classes in non-frozen files, `src/ui` layering, icons only via `@/ui`, hooks, jsx-a11y. Proven with a probe file that produced the expected errors, then deleted. |
| `npm test` | 31 passed: 25 brand/fx unit tests (7-colour brand matrix), 6 axe structural tests including a negative control and the dialog |
| `npm run i18n` | 232 keys, 0 errors, 0 warnings |
| `npm run contrast` | 74 checks, 0 failing (Phase 0: 9 failing plus glass failures) |
| `npm run build` | OK |
| `npm run size` | Initial JS 190.7 kB / 200 (95%); CSS 8.8 kB / 40; 25 lazy chunks, largest 10.1 kB / 80 |
| Storybook | Builds; dev server rendered the Nepali, dark, crimson-brand Button story correctly (white on-brand text chosen automatically) |
| Database (as anon, authenticated, non-staff) | `business_info`, `unconfirmed_expiry_hours`, `deployed_version` denied to anon; storefront columns allowed; `business_info` allowed to authenticated; `admin_store_settings()` FORBIDDEN for non-staff; REST `select=*` as anon returns 42501 |
| Browser pane | Gallery; Dialog (focus trap, Esc); Sheet (Back closes it, stays on page, no history residue); toast with Undo in English and Nepali; a single React copy; no console errors after the Vite pre-bundle fix |

## Phase 1 exit criteria (PHASES.md)
| Criterion | Result |
|---|---|
| Every primitive documented and tested | Stories and axe for 15 primitives. **Popover and Tooltip hover/focus not verified** |
| Brand matrix passes contrast | Yes in unit tests (7 colours incl. very light, very dark, mid-tone); no per-colour visual report |
| Glass holds 60 fps on the reference low-end Android with header + bottom nav | **Not verified: needs a real device** |
| Legacy pages render correctly with new tokens | Yes by spot check (home, product, cart toast, Nepali/dark/light, admin redirect); full screenshot matrix is manual |

## Decisions I made without asking (please confirm or change)
1. Global reskin now, flag later: the token re-map applies to everyone; `ui_v2` exists and sets `data-ui`, but only Phase 2+ layouts will use it.
2. `size-limit` replaced by a custom budget script; `tailwind-merge` and `motion` not adopted (this amends ux ARCHITECTURE.md section 4).
3. ESLint 9, not 10 (`eslint-plugin-jsx-a11y` supports up to 9).
4. Glass alpha .84 light and .72 dark (more opaque than the .62 and .58 in DESIGN.md) to satisfy contrast.
5. Devanagari weights 400, 600, 700 only; weights 500 and 800 map to 600 and 700 in Nepali.
6. I deleted `ecommerce main.zip` from the project root. It had the same size and timestamp as the copy inside `files (9)/`, which I left in place; say so if you wanted the root copy back.

## Risks and open questions
- **Entry budget:** 9 kB left. Candidates: lazy Supabase Realtime (about 25 kB, hard-wired in supabase-js 2.118, so it needs a lite client or a patch), a lighter router setup, or relaxing the budget for the first release. Decide before Phase 3.
- Devanagari font files are about 100 kB each and not subsetted; heavy on 3G for the first Nepali visit. Subsetting needs a font tool (fonttools) that is not installed here.
- Earlier migrations (schema, RPCs) exist only in Supabase, not in the repo; only this phase's migration is saved. Recommend exporting them with the Supabase CLI.
- The `useQuery` shim gives each call site a private cache entry; real de-duplication happens only for migrated queries.
- 31 files still use legacy classes (frozen allowlist); they migrate in Phases 2 to 7.

## Manual tasks for you
1. On a real low-end and a mid-range Android phone: scroll Home with the glass header and bottom nav (P1-33), press system Back with a sheet open (P1-26), try Lite via Data Saver.
2. Native Nepali review of the keys added since the last review: `common.close`, `common.undo`, `common.saved`, `cart.removed`, `cart.view`, `product.added_toast`, `rating.label`, `rating.stars`, `admin.primary_image`, plus the earlier `push.*` and `pay.*`.
3. Screen-reader smoke test (TalkBack, NVDA) on the dev gallery `/_ui` and Storybook.
4. Screenshots of Home, Shop, PDP, Cart, Checkout at 360, 768, 1024, 1366 px in EN/NE, light/dark for the visual baseline.
5. Decide on Realtime and the entry budget, and confirm the six decisions above.

## Next step
Stop here. Phase 2 (app shell and navigation) starts when you reply **"approved phase 1"**. Plan: glass header and floating bottom nav built from `src/ui`, desktop header and footer, route skeletons, error boundary, shortcuts, theme/language/effects switchers, admin shell skeleton, all gated by `ui_v2`.
