# TASKS: Bazaar Glass UX overhaul

Source: `docs/ux-overhaul/PHASES.md`. Status values: `todo`, `doing`, `done`, `blocked`. Each task is about half a day (`0.5d`) unless marked. Phase 1 starts only after the reply "approved phase 0".

## Phase 0 (this checkpoint)

| ID | Task | Status |
|---|---|---|
| P0-1 | Read all docs, list doc/code contradictions (`baseline/doc-vs-code.md`) | done |
| P0-2 | Install, typecheck, build, bundle baseline, add visualizer (`baseline/bundle.md`) | done |
| P0-3 | Route, style, legacy-class inventories (`baseline/routes.md`, `hardcoded-styles.md`, `legacy-classes.md`) | done |
| P0-4 | Contrast verification of DESIGN.md section 2 (`baseline/contrast.md`) | done |
| P0-5 | Library spike (`baseline/library-spike.md`) | done |
| P0-6 | Draft UX-D014 to UX-D020 in `DECISIONS.md` | done |
| P0-7 | Create this backlog | done |
| P0-8 | Checkpoint report (`baseline/phase-0-report.md`) | done |
| P0-M1 | **Manual:** answer PRD section 12 decisions and the 3 extra questions in the report | todo (you) |
| P0-M2 | **Manual:** Lighthouse mobile baseline, axe scan, 360/1366 px screenshots EN+NE, real-device check, 5 to 8 shopper sessions | todo (you or QA) |

## Phase 1: Foundation (3 weeks, about 30 tasks)

Conventions: every task ends with typecheck + lint + build green and a short note in the PR. UI tasks use the `frontend-design` skill where available. Strings go in `en.json` and `ne.json`.

### Week 1: tokens and legacy re-map

| ID | Task | Est | Depends | Acceptance |
|---|---|---|---|---|
| P1-01 | `git init`, first commit of the current tree, `.gitignore` check, branch `ux/phase-1` (needs your OK, see report) | 0.25d | M-approval | Clean history baseline exists |
| P1-02 | Add `src/styles/tokens.css`: palette (with Phase 0 contrast fixes), radius, elevation, motion, breakpoints as `@theme` | 0.5d | P1-01 | Tokens compile; no visual change yet |
| P1-03 | Add `--line-strong`, `--brand-strong`, tint opacity tokens from the contrast report | 0.25d | P1-02 | All pairs in `contrast.md` pass in a re-run of the script |
| P1-04 | Breakpoint audit: list every `sm:`/`md:`/`lg:` use, decide per use (keep 640/768/1024 or move to 600/840/1200) | 0.5d | P1-02 | Table committed to `baseline/breakpoints.md` |
| P1-05 | Apply the breakpoint change and fix layouts that shift | 0.5d | P1-04 | 360, 768, 1024, 1366 px screenshots unchanged except intended |
| P1-06 | Re-map `.btn`, `.btn-*` to tokens (radius, colours, 48 px height) | 0.5d | P1-03 | App-wide buttons restyled with no page edits |
| P1-07 | Re-map `.card`, `.badge-*`, `.alert`, inputs, `.field` to tokens | 0.5d | P1-03 | Same |
| P1-08 | Self-host Mukta (Latin + Devanagari, 400/700 preload), remove the Google Fonts `<link>` | 0.5d | P1-02 | No third-party font request; Nepali renders in Mukta |
| P1-09 | Remove Devanagari `letter-spacing`; set line-height 1.7 body, 1.35 headings for `lang="ne"` | 0.25d | P1-08 | Ligature test strings render correctly (screenshot) |
| P1-10 | Mesh background + `.glass` utility with all four fallbacks and the corrected alpha (0.84 / 0.64) | 0.5d | P1-03 | Fallback matrix verified in devtools (no backdrop-filter, reduced-transparency, forced-colors, `data-fx=lite`) |
| P1-11 | Lite-tier CSS hooks (`data-fx`) and `prefers-reduced-motion` defaults | 0.25d | P1-10 | Toggling `data-fx` removes blur everywhere |

### Week 2: theme engine and primitives

| ID | Task | Est | Depends | Acceptance |
|---|---|---|---|---|
| P1-12 | `ThemeProvider`: light/dark/system, pre-paint inline script in `index.html`, persistence | 0.5d | P1-02 | No flash on reload in either theme |
| P1-13 | `theme/brand.ts`: luminance, on-brand colour, `color-mix` derivations, unit tests | 0.5d | P1-12 | 5+ brand colours produce 4.5:1 text or a warning |
| P1-14 | `theme/fx.ts`: tier detection (`saveData`, `deviceMemory`, user override) | 0.25d | P1-11 | Unit tests with mocked navigator |
| P1-15 | Install CVA + clsx; decide on `tailwind-merge` (bundle cost 11 kB) | 0.25d | P1-02 | Decision recorded |
| P1-16 | Icons: add Lucide per-icon imports; replace all 18 emoji and 3 heart glyphs and the star glyphs with SVG components (`Icon`, `Rating`) | 0.5d | P1-15 | `legacy-classes.md` emoji count is 0 |
| P1-17 | Primitives batch 1: `Button`, `IconButton` (all variants, 48 px, loading keeps width) | 0.5d | P1-15 | States demo page |
| P1-18 | Primitives batch 2: `Field`, `Input`, `Textarea`, `Select` (native on compact), `Checkbox`, `Radio`, `Switch` | 1d | P1-17 | Same; labels and errors wired for a11y |
| P1-19 | Primitives batch 3: `Chip`, `Badge`, `Card`, `Skeleton`, `EmptyState` | 0.5d | P1-17 | Same |
| P1-20 | `GlassPanel` as the only way to make glass; lint note forbids `.glass` elsewhere | 0.25d | P1-10 | Used by one demo only |
| P1-21 | Entry-budget plan: split i18n dictionaries per language (lazy), decide motion approach (`motion/mini` or CSS), keep Supabase Realtime out of the storefront entry | 0.5d | P0 decisions | Entry gzip does not grow after primitives land |
| P1-22 | TanStack Query installed behind the `useQuery` shim; migrate Home and Shop categories as proof | 0.5d | P1-21 | No behaviour change; one categories request shared |

### Week 3: overlays, docs, tests

| ID | Task | Est | Depends | Acceptance |
|---|---|---|---|---|
| P1-23 | `Sheet` (Vaul) and `Dialog` (Radix) loaded on demand | 0.5d | P1-20 | Not in the entry chunk (verified in visualizer) |
| P1-24 | `Popover`, `Tooltip` (verify hover and focus, which the spike did not) | 0.25d | P1-20 | Keyboard and hover tested |
| P1-25 | `Toast` (Sonner) with Undo; replace the "Added" inline text | 0.5d | P1-20 | Max 2 visible; announced to screen readers |
| P1-26 | `useSheetHistory`: Android Back closes the top sheet first | 0.5d | P1-23 | Tested in real Chrome on Android (manual) |
| P1-27 | Storybook with EN/NE, light/dark, brand-colour and compact/expanded toggles | 1d | P1-19 | Every primitive has stories for every state |
| P1-28 | Brand matrix: 5+ vendor colours including very light and very dark, in Storybook | 0.5d | P1-13, P1-27 | Contrast report per colour |
| P1-29 | Quality gates: `size-limit` (entry 200 kB gzip), import-boundary lint, class-hygiene lint (no new `.btn`/`.card`/`!`), i18n key-parity script | 1d | P1-15 | CI fails on each violation (tested) |
| P1-30 | Fix `store_settings` over-exposure: public view or RPC for storefront columns; migration + RLS + `DATABASE.md` (before adding `brand`/`ui_v2`) | 0.5d | P1-01 | Anon cannot read PAN/VAT or tuning fields; checkout and invoice still work |
| P1-31 | Additive migration `store_settings.ui_v2` (and `brand` jsonb) + flag hook | 0.25d | P1-30 | Flag off keeps current UI |
| P1-32 | Create the `bazaar-glass-ui` project skill with `skill-creator` (+5 test prompts) | 0.5d | P1-27 | Skill file in repo |
| P1-33 | On-device glass profiling on a low-end Android (header + bottom nav); tune blur and layer count | 0.5d | P1-23 | 60 fps scroll or Lite thresholds tightened (**manual device**) |
| P1-34 | `design:accessibility-review` of primitives; fix findings | 0.5d | P1-27 | 0 critical/serious axe issues in Storybook |
| P1-35 | Phase 1 exit: legacy pages render correctly with new tokens; release notes; `v0.2` | 0.5d | all | Exit criteria in PHASES.md ticked |


### Phase 1 status (20 Oct 2026)

done = verified here; **manual** = needs a person or a real device; partial = see note.

| ID | Status | Note |
|---|---|---|
| P1-01 | done | git initialised, baseline commit, branch `ux/phase-1` |
| P1-02, P1-03 | done | tokens + contrast amendments; `npm run contrast` = 74 checks, 0 failing |
| P1-04, P1-05 | done | `baseline/breakpoints.md`; only `Chrome.tsx` needed a change |
| P1-06, P1-07 | done | legacy `.btn/.card/.badge/.alert/.field` and inputs re-mapped to tokens (48 px) |
| P1-08, P1-09 | done | Mukta self-hosted, Google Fonts removed, no Devanagari letter-spacing; Devanagari files are ~100 kB each (not subsetted yet) |
| P1-10, P1-11 | done | glass recipe with 4 fallbacks, mesh, Lite tier; glass alpha .84 light / .72 dark |
| P1-12 | done | ThemeProvider + pre-paint script |
| P1-13 | done | brand engine, 25 unit tests incl. matrix of 7 colours (very light, very dark, mid-tone) |
| P1-14 | done | fx tiers with tests |
| P1-15 | done | CVA + clsx; **tailwind-merge not adopted** (11 kB, not needed without `!` overrides) |
| P1-16 | done | all 18 emoji + heart/star glyphs replaced by Lucide / SVG Rating |
| P1-17 to P1-20 | done | Button, IconButton, Field/Input/Textarea/Select (native), Checkbox/Radio/ChoiceCard/Switch, Chip, Badge, Card, Skeleton, EmptyState, GlassPanel. Radix Select for expanded screens deferred to Phase 3 (filter sidebar) |
| P1-21 | partial | Nepali dictionary lazy (-3.7 kB), overlays lazy, motion = CSS (no `motion` package). **Supabase Realtime (~25 kB) still in the entry**; moving it out is not possible with supabase-js 2.118 (hard-wired) and is deferred |
| P1-22 | done | TanStack Query behind the shim; categories and settings shared |
| P1-23 | done | Sheet (Vaul), Dialog (Radix) as lazy chunks, not in the entry |
| P1-24 | partial | Popover, Tooltip built and lazy; **hover/focus behaviour not verified**, not in axe tests |
| P1-25 | done | Sonner toast with Undo, glass, max 2 visible; used for add-to-cart and cart removal |
| P1-26 | partial | `useSheetHistory` verified in the browser pane (Back closes the sheet, stays on page). **Manual: test on a real Android phone** |
| P1-27 | done | Storybook 10, 4 story files, toolbars for language/theme/effects/brand |
| P1-28 | partial | brand matrix is in unit tests and the Storybook toolbar; no per-colour contrast report page |
| P1-29 | done | ESLint (class hygiene, layering, icon imports), i18n parity, budget gate. **size-limit replaced by `scripts/check-budget.mjs`** (measures initial JS from index.html) |
| P1-30, P1-31 | done | store_settings column grants + `admin_store_settings()`; `brand` + `ui_v2` columns; verified as anon/authenticated/non-staff |
| P1-32 | partial | `.claude/skills/bazaar-glass-ui/SKILL.md` written by hand with 5 test prompts; `skill-creator` evaluation loop not run |
| P1-33 | **manual** | on-device glass profiling needs a real low-end Android phone |
| P1-34 | partial | axe-core over all primitives (jsdom, contrast rule off) + contrast script; `design:accessibility-review` skill unavailable; TalkBack/NVDA passes are **manual** |
| P1-35 | partial | legacy pages render and pass `npm run check`; release tag `v0.2.0`; full exit criteria listed in the Phase 1 report |

Estimated total: **16.75 days** in 35 tasks (week 1: 4.5, week 2: 5.25, week 3: 7.0) against 15 working days in the plan, so Phase 1 is about 1.75 days over. Candidates to slip into the start of Phase 2 (not on its critical path): P1-24, P1-28, P1-33. Phase 1 as written is a 3.5 week phase for one developer.

## Phase 2 to 9

Kept in `docs/ux-overhaul/PHASES.md`. Each is expanded into tasks like the above at its own kickoff, after the previous phase's exit criteria and your approval.
