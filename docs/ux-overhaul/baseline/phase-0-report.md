# Phase 0 checkpoint report (20 Oct 2026)

## Summary
- All 12 documents and the code were read; 15 doc/code contradictions found, 3 are security-relevant (`localStorage` sessions, public `store_settings`, no idle timeout).
- Baseline: build and typecheck green; storefront entry is **175.7 kB gzip against a 200 kB budget**, so almost no room for new libraries unless they are loaded on demand.
- Every planned library works with React 19 and Vite 8. `motion` is far heavier than planned (about 78 kB gzip); 9 colour pairs fail contrast and the glass tint fails for muted text.

## What changed (files)
Code and config (no application source changed):
- `vite.config.ts`: optional `rollup-plugin-visualizer` (`ANALYZE=1`), `package.json` / `package-lock.json`: one dev dependency.

New documents:
- `docs/ux-overhaul/*.md` (copies of the five planning docs from `files (9)/`)
- `docs/ux-overhaul/baseline/`: `bundle.md`, `bundle-report.html`, `bundle-stats.json`, `routes.md`, `hardcoded-styles.md`, `legacy-classes.md`, `contrast.md`, `library-spike.md`, `doc-vs-code.md`, `phase-0-report.md`
- `DECISIONS.md`: appended proposed `UX-D014` to `UX-D020`
- `TASKS.md`: Phase 0 status and a 35-task Phase 1 backlog

The library spike ran in a scratch copy outside the repo. The real `node_modules` and tree were not touched by it.

## Verification (commands run, real results)
| Command | Result |
|---|---|
| `npm install` | OK, 0 vulnerabilities |
| `npm run typecheck` | OK, 0 errors (re-run after the config change) |
| `npm run build` | OK in 2.3 s; entry `index-*.js` 618.9 kB raw, 175.7 kB gzip, 149.9 kB brotli; CSS 5.6 kB gzip |
| `ANALYZE=1 npm run build` | OK; treemap and stats written to `baseline/` |
| Contrast script | 48 pairs, 9 fail; glass tint fails for muted text (details in `contrast.md`) |
| Library spike | 14 packages installed with no peer conflicts; type-check and production build pass; 11 of 12 UI behaviours verified at runtime in the browser; no console errors |
| Lint | Not run: the project has no ESLint configuration (removed with Next.js). Adding it is task P1-29. |

Not verified: service-worker registration and caching (the in-app browser rejects all service workers, including the current `sw.js`), Radix Tooltip hover, Lighthouse, axe, real-device behaviour.

## What surprised me
1. **No bundle headroom.** 24 kB left. The planned stack costs about 125 kB gzip without `motion` and about 200 kB with it if loaded eagerly. The plan only works with on-demand loading, `motion/mini` (9.8 kB) or CSS instead of `LazyMotion` `motion` (78 kB even when lazily loaded), and per-language dictionaries (both are bundled today, 6.7 kB gzip).
2. **`store_settings` is public in full** (including PAN/VAT and tuning fields). The docs say a safe view; the applied RLS is `using (true)`. This must be fixed before adding `brand` and `ui_v2` columns.
3. **Session tokens are in `localStorage`**, contradicting SECURITY.md. This follows from being an SPA; it needs an explicit, documented decision rather than silence.
4. **ADR IDs D-014 to D-020 are already used** in `DECISIONS.md` for deferred questions. I used `UX-D014..UX-D020` and propose renumbering to D-021..D-027.
5. **The brand colour itself fails UI contrast** (marigold on white is 2.04:1). The ink-on-marigold button is fine; focus rings and indicators in marigold are not.
6. **This folder is not a git repository**, so "branches" and "small commits" could not be done. No history exists to roll back to.
7. Phase 1 as written is about 16.75 days of work for a 15-day slot.

## Decisions I need from you (PRD section 12), with my recommended answers
| # | Decision | Recommendation |
|---|---|---|
| 1 | Hosting for share previews | **Vercel** (matches D-011): static SPA plus Edge Middleware for crawlers. Choose a static host only if the vendor cost model needs it. |
| 2 | Catalogue caching (amends D-010) | Allow **public product images** in the SW cache and in-memory query caching now. Do not persist catalogue JSON offline until after launch. D-010 still forbids private and API responses. |
| 3 | Analytics | A minimal **first-party `ux_events` table** (insert-only for anon, owner read) with the 4 funnel events and web vitals. There is no analytics today, so there is no funnel baseline yet. |
| 4 | Brand direction | **Keep Indigo/Marigold/Rhododendron** with the contrast adjustments in `contrast.md` (`--brand-strong`, `--line-strong`, glacier for fills only). |
| 5 | Supabase image transformations | The new project was quoted at $0/month, which suggests the **free plan**, where image transformations are not offered (confirm in the Supabase dashboard). Plan for **fixed variants at upload** (320/640/960/1600 px, client-side, plus width/height/blur). Confirm per vendor before relying on transformations. |
| 6 | Product variants | **Not now.** Keep the PDP data model ready, do not design the UI around them. |
| 7 | Team size | Assume **1 developer**; plan 8 to 9 months and treat Phase 7 as the one to defer. |

Extra decisions raised by Phase 0:
- **E1.** OK to run `git init` and commit the current tree as the baseline (task P1-01)? Recommended: yes.
- **E2.** Renumber the new ADRs to D-021..D-027 (recommended) or keep `UX-D0xx`?
- **E3.** Accept the contrast amendments (glass alpha 0.84 light / 0.64 dark, `--line-strong`, `--brand-strong`) and the motion plan (CSS + `motion/mini`, no `LazyMotion`)? Recommended: yes.

## Risks / open questions
- Entry-budget risk (above) is the biggest threat to the performance targets.
- The SW rebuild (Phase 6) rests on a runtime I could not test here.
- White-label brand colours need the contrast engine before any vendor picks a colour.
- Phase 1 over by about 1.75 days; candidates to slip are listed in `TASKS.md`.
- No funnel or Lighthouse baseline exists, so the commerce targets in the PRD cannot be confirmed yet.

## Manual tasks for you
1. Reply to the decisions above (7 + 3).
2. Real-Chrome checks: install the PWA on a low-end and a mid-range Android phone, register the service worker, check Back-button behaviour.
3. Run Lighthouse (mobile, Slow 4G), an axe scan and capture 360 px and 1366 px screenshots in EN and NE for every route listed in `routes.md`.
4. Arrange 5 to 8 shopper sessions and 2 to 3 vendor-staff sessions (use the `design:user-research` skill if available).
5. Native Nepali reviewer for the copy workflow (weekly batches from Phase 2).
6. Decide who provides banner and category artwork (Phase 3).

## Skills
The skills named in `PLUGINS_AND_SKILLS.md` (`frontend-design`, `design:*`) are not installed in this session, so the design-system audit and contrast review were done with scripts and manual checklists instead. `frontend-design` and `skill-creator`-style tooling are listed in the session; the `design:*` family is not.

## Next step
Stop here. Phase 1 starts when you reply **"approved phase 0"**, ideally with answers to the decisions above.
