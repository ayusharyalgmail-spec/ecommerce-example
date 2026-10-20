# PHASES: From Prototype to Enterprise-Grade UX

Status: Draft v1.0, 20 Oct 2026
Read with `PRD.md`, `DESIGN.md`, `ARCHITECTURE.md`, `PLUGINS_AND_SKILLS.md`.

## How to read this plan

- **Estimates assume 1–2 developers plus part-time design/QA review.** Treat durations as planning ranges, not promises. Phase 0 re-estimates everything against measured baselines.
- **Every phase ends with a shippable slice** behind the `ui_v2` flag. Nothing is "big bang".
- **Exit criteria are gates.** A phase is not done until every box is ticked, including the real-device pass.
- **Standard gates for every phase (not repeated below):**
  - [ ] Typecheck, lint, Storybook build, Playwright (Android + Desktop projects) green
  - [ ] `size-limit` and Lighthouse CI within budget (or budget change approved)
  - [ ] axe: 0 critical/serious on touched screens
  - [ ] All new strings present in `en.json` **and** `ne.json`, Nepali reviewed
  - [ ] Checked on a low-end Android, a mid-range Android and Windows at 125% scaling
  - [ ] Lite effects tier and reduced-motion/transparency verified
  - [ ] `DATABASE.md`/`DECISIONS.md` updated if the phase changed schema or decisions
  - [ ] Demo recorded; release notes written

## Timeline overview

| Phase | Name | Duration (weeks) | Depends on | Can overlap with |
|---|---|---|---|---|
| 0 | Discovery, baseline, cleanup | 1 | — | — |
| 1 | Foundation: tokens, theme, primitives | 3 | 0 | — |
| 2 | App shell and navigation | 2 | 1 | — |
| 3 | Discovery: Home, search, shop | 3 | 2 | 4 (partly) |
| 4 | Product detail and media | 3 | 2 | 3 (partly) |
| 5 | Cart and checkout | 4 | 3, 4 | 7 (second dev) |
| 6 | Account, tracking, PWA, notifications | 2 | 5 | 7 |
| 7 | Vendor admin workspace | 5 | 2 (shell), 1 | 5, 6 (second dev) |
| 8 | Hardening: performance, accessibility, i18n, QA | 3 | 3–7 | — |
| 9 | Launch, rollout, measurement | 2 + ongoing | 8 | — |

**Total ≈ 28 weeks sequential (about 6.5 months).** With two developers running Phase 7 in parallel with Phases 5–6, the critical path shortens to roughly 23–24 weeks. A single developer should plan for 8–9 months.

```
Wk  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28
P0  █
P1     ███████
P2              █████
P3                    ███████
P4                       ███████ (overlaps P3 by ~1 wk)
P5                                ███████████
P6                                            █████
P7                                ████████████████████ (second dev, parallel)
P8                                                        ███████
P9                                                               █████ → ongoing
```

---

## Phase 0: Discovery, baseline, cleanup (1 week)

**Goal:** know exactly where we start, remove misleading drift, and lock decisions that block later work.

**Tasks**
- [ ] Run and record baselines: Lighthouse (mobile, Slow 4G), Web Vitals, bundle sizes (`rollup-plugin-visualizer`), a11y scan, screenshots of every route at 360 px and 1366 px in EN and NE.
- [ ] Analytics baseline for the funnel (view product, add to cart, begin checkout, order placed), even if rough.
- [ ] 5–8 short sessions with real shoppers (Android) and 2–3 with vendor staff; use `design:user-research` and `design:research-synthesis`.
- [ ] Token audit with `design:design-system` (hard-coded values, `!` overrides, naming).
- [ ] Reconcile docs: add ADRs D-014 to D-020 (`ARCHITECTURE.md` §15); fix `DESIGN.md` §21 and Next.js references.
- [ ] Fix the service-worker cache path bug and cross-origin image caching in a minimal patch (or defer to Phase 6 with a note).
- [ ] Spike: install and smoke-test Radix, Vaul, Sonner, Embla, Lucide, Motion, TanStack Query, vite-plugin-pwa against React 19 and Vite 8. Record results.
- [ ] Verify every colour pair in `DESIGN.md` §2 with tooling; adjust values that fail.
- [ ] Confirm open decisions from `PRD.md` §12 (hosting, caching policy, analytics, brand direction, Supabase image transformations, variants).
- [ ] Create the `TASKS.md` backlog (`productivity:task-management`).

**Deliverables:** baseline report, research summary, decision log, updated docs, confirmed stack list.
**Exit:** decisions 1–5 from the PRD answered; baselines stored in the repo; no unresolved library incompatibility.

---

## Phase 1: Foundation: tokens, theme, primitives (3 weeks)

**Goal:** a design system the rest of the work stands on. The whole app already looks different by the end of week 1, without touching pages.

**Week 1 — Tokens and legacy re-map**
- [ ] `tokens.css` with palette, radius, elevation, glass, motion, breakpoints (`DESIGN.md` §2.4).
- [ ] Re-map `.btn`, `.card`, `.badge`, `.alert` and inputs to the new tokens (the "reskin without rewriting" step).
- [ ] Self-hosted Mukta; remove Google Fonts link; remove Nepali letter-spacing; set Devanagari line-height.
- [ ] Mesh background and `.glass` utility with all four fallbacks.
- [ ] Update breakpoint usages (existing `md:`/`lg:` classes shift from 768/1024 to 840/1200; audit and fix).

**Week 2 — Theme engine and primitives**
- [ ] `ThemeProvider`: light/dark/system, pre-paint inline script, brand runtime with contrast calculation, FX tier detection.
- [ ] Primitives with all states: Button, IconButton, Field, Input, Textarea, Select, Checkbox, Radio, Switch, Chip, Badge, Card, GlassPanel, Skeleton, EmptyState.
- [ ] Replace emoji with Lucide icons in existing components.
- [ ] TanStack Query installed; `useQuery` shim re-implemented on top of it.

**Week 3 — Overlays, docs, tests**
- [ ] Sheet (Vaul), Dialog, Popover, Tooltip, Toast (Sonner), `useSheetHistory` (Android Back).
- [ ] Storybook with EN/NE, light/dark, brand-colour and compact/expanded toggles.
- [ ] Brand test matrix (5+ vendor colours, including a very light and a very dark one).
- [ ] `size-limit`, import-boundary lint, class-hygiene lint.
- [ ] Create the `bazaar-glass-ui` skill with `skill-creator`.
- [ ] On-device glass profiling on the low-end Android; tune blur radius and layer count.
- [ ] `design:accessibility-review` of the primitives.

**Deliverables:** `src/styles`, `src/theme`, `src/ui`, Storybook, `bazaar-glass-ui` skill.
**Exit:** every primitive documented and tested; brand matrix passes contrast; glass holds 60 fps scrolling on the reference low-end device with header + bottom nav active (otherwise Lite tier thresholds are tightened); legacy pages render correctly with new tokens.
**Release:** `v0.2` (visual refresh via tokens, behind `ui_v2`).

---

## Phase 2: App shell and navigation (2 weeks)

**Goal:** the frame of the product feels like an app on Android and a real site on Windows.

- [ ] Glass top bar: logo, search entry, language switch, cart badge; hide on scroll down, show on scroll up (compact).
- [ ] Floating glass bottom nav with SVG icons, active indicator, badge; hidden in checkout and when the keyboard is open.
- [ ] Expanded layout: desktop header with category menu, account menu, footer with contact and policies.
- [ ] Toast host, global error boundary with a friendly flat error state, 404 page with illustration.
- [ ] Skeleton components for routes (replace `Loading` text).
- [ ] View transitions between routes (supported browsers only).
- [ ] Theme and language switchers; Appearance settings (Full/Lite effects, theme).
- [ ] `viewport` meta update (`interactive-widget=resizes-content`); dual `theme-color`.
- [ ] Keyboard shortcuts (`/`, `g c`, `?`) and skip link.
- [ ] Copy pass (`design:ux-copy`); critique pass (`design:design-critique`).
- [ ] Admin shell skeleton: sidebar on ≥ 840 px, bottom nav on compact (content pages migrate in Phase 7).

**Deliverables:** new `AppLayout`/`AdminLayout`, navigation components.
**Exit:** Back button closes sheets before navigating; shell passes TalkBack and NVDA smoke tests; no layout shift when bars hide/show; bottom nav respects gesture bar.

---

## Phase 3: Discovery — Home, search, shop (3 weeks)

**Goal:** first impression and findability.

**Backend (week 1)**
- [ ] Migrations: `banners` table, `categories.image_path`, RLS (public read of active banners; staff write with permission), audit logging.
- [ ] Minimal admin screens for banners and category images (full admin polish in Phase 7).

**Frontend**
- [ ] Home: hero carousel, category rail, Deals, New arrivals, Best sellers, Recently viewed, trust strip, empty-catalogue state.
- [ ] `ProductCard` v2 (SVG rating, price block, sale and stock chips, wishlist heart, single action, blur-up image).
- [ ] Search overlay: recent searches, suggestions, debounced input, EN/NE.
- [ ] Shop: filter sheet (compact) and sidebar (expanded), sort, removable filter chips, URL-synced state, load-more (compact) and pagination (expanded), zero-result state, skeleton grid.
- [ ] Banner and category artwork produced with `canvas-design` or supplied by the vendor.
- [ ] `design:ux-copy`, `design:design-critique`, `design:design-handoff` on each screen.

**Exit:** Home LCP within budget on Slow 4G; filters usable one-handed at 360 px; search handles Nepali input; empty states cover first-run vendors.
**Release:** `v0.4`.

---

## Phase 4: Product detail and media (3 weeks)

**Goal:** make the product page convert.

- [ ] Image pipeline: `width`, `height`, `blur_hash` columns; upload-time processing; backfill job for existing images; Supabase transformation URLs or fixed variants.
- [ ] `<Img>` component and responsive `srcset` across the app (cards, cart, gallery).
- [ ] Gallery: swipe, working thumbnails, dots, lightbox with pinch-zoom, keyboard arrows.
- [ ] Sticky glass buy bar (compact); inline buy box (expanded).
- [ ] Price and stock presentation; delivery information by zone (add optional ETA columns).
- [ ] Rating summary with distribution; review list refresh.
- [ ] Web Share with WhatsApp fallback; "Ask on WhatsApp" as a secondary action.
- [ ] Breadcrumbs, related products, recently viewed tracking (local).
- [ ] **Share previews:** edge function for crawler requests, `og:*` tags, JSON-LD, sitemap and robots (`ARCHITECTURE.md` §10). Test with WhatsApp and Facebook debuggers.
- [ ] Usability test of the PDP with 5 shoppers (`design:user-research`).

**Exit:** gallery bug (non-interactive thumbnails) fixed and covered by an e2e test; CLS ≤ 0.1 on PDP; shared product links show image, title and price in WhatsApp.
**Release:** `v0.5`.

---

## Phase 5: Cart and checkout (4 weeks)

**Goal:** the revenue moment feels trustworthy, fast and effortless.

**Cart (1 week)**
- [ ] Line items with 96 px images, 48 px stepper, remove with Undo toast.
- [ ] Glass summary sheet (compact) / sticky summary (expanded); coupon in summary; optional free-delivery progress (`free_delivery_threshold_paisa`).
- [ ] Out-of-stock and quantity-conflict states made explicit and fixable in place.

**Checkout (2–3 weeks)**
- [ ] Stepper: Contact → Delivery → Payment → Review; per-step validation with react-hook-form + zod; progress persisted so a refresh does not lose input.
- [ ] Saved addresses as cards; zone cards with fee; Nepali mobile formatting; correct `autocomplete`, `inputmode`, `enterkeyhint`.
- [ ] Payment method cards with instructions; manual-payment details block (QR/account info from settings).
- [ ] Sticky total bar; bottom nav hidden; keyboard-aware layout.
- [ ] Price-changed confirmation made prominent (keep the existing `lastTotal` logic and idempotency key handling).
- [ ] Success screen: order number with copy, next steps, Track, Share, Install prompt, notification opt-in.
- [ ] Usability test (5 shoppers, COD and manual payment) with `design:user-research`; iterate once.
- [ ] Security regression: idempotency conflict, stock failure, coupon failure, price change, double-tap submit, offline during submit.

**Exit:** all existing checkout error codes (`err.*`) have clear, actionable UI; test completion of a guest COD order on a low-end Android in under 2 minutes of user time on the happy path; no regression in server-side validations.
**Release:** `v0.7`.

---

## Phase 6: Account, tracking, PWA, notifications (2 weeks)

- [ ] Account home with tiles, orders list with status chips, **Buy again**, wishlist grid, address manager with cards.
- [ ] Tracking timeline with icons and timestamps, payment-proof upload as a guided card, WhatsApp contact.
- [ ] Rebuild the service worker with `vite-plugin-pwa` (`injectManifest`): precache real assets, image runtime cache for the Supabase origin, offline page, update toast, kill-switch. Preserve D-010 and add a test that private routes are never cached.
- [ ] Manifest: PNG 192/512 and maskable icons, shortcuts, screenshots, `id`, `lang`; per-vendor generation.
- [ ] Install prompt after first add-to-cart/order, 30-day dismissal memory.
- [ ] Push opt-in moved to the post-order moment; notification copy checked in EN/NE.
- [ ] Invoice page and print styles re-verified against the new tokens.

**Exit:** installable on Android Chrome with a correct icon and splash; repeat visit loads shell from cache; update flow tested mid-session without disrupting checkout.
**Release:** `v0.8`.

---

## Phase 7: Vendor admin workspace (5 weeks, parallelisable)

**Goal:** Windows-grade productivity, still usable on a phone.

- [ ] Sidebar layout, breadcrumbs, page headers, density setting.
- [ ] **Dashboard:** "Needs action" band, KPI cards with sparklines, recent orders, low stock.
- [ ] **Orders:** tabbed queue with counts, split view on expanded, swipe-friendly cards on compact, bulk actions, print queue; Realtime new-order toast and optional sound.
- [ ] **Order detail:** timeline, payment verification flow, refund and COD collection actions with confirmation dialogs.
- [ ] **Products:** table with sticky header, filters, column visibility, inline stock adjust; editor with drag-to-reorder images, live card preview, autosave draft, validation.
- [ ] **Banners and category images** (full UI), **brand settings** with live preview and contrast warnings.
- [ ] Reviews, coupons, zones, staff, audit, settings, import/export migrated to the new components.
- [ ] Reports with lazy-loaded charts and date ranges.
- [ ] Command palette (Ctrl+K), shortcuts, keyboard table navigation.
- [ ] Windows pass: 1366×768, 125–150% scaling, forced-colors, installed PWA title bar (P2).
- [ ] Usability sessions with vendor staff.

**Exit:** a staff member confirms and dispatches an order using keyboard only on Windows and with one thumb on Android; permissions still enforced by RLS (negative tests); admin bundle stays lazy and outside the storefront entry.
**Release:** `v0.9`.

---

## Phase 8: Hardening (3 weeks)

- [ ] **Performance:** profile every key route on the low-end device; tune image sizes, preload, code-splitting; verify glass layers per screen; frame-budget probe to auto-select the Lite tier; confirm budgets.
- [ ] **Accessibility:** full `design:accessibility-review`; TalkBack (Android) and NVDA (Windows) scripted walkthroughs of browse, checkout and order management; fix all findings.
- [ ] **Nepali QA:** native-speaker review of every screen; conjunct, wrapping and numeral checks; long-name stress tests; optional Devanagari digits (P2).
- [ ] **Resilience:** slow/offline/flaky network tests, interrupted checkout, expired session, SW update edge cases, empty/error states everywhere.
- [ ] **Security:** repeat the pre-production checklist in `SECURITY.md`; verify no new data exposure through banners, share function or analytics.
- [ ] **Visual QA:** screenshot review across the matrix (EN/NE × light/dark × compact/expanded × Full/Lite).
- [ ] **Cleanup:** remove legacy classes and shims, delete dead code, finalise docs (`DESIGN.md` replaced by the new spec, `DECISIONS.md` ADRs).
- [ ] Final `design:design-system` audit: tokens used consistently, no stragglers.

**Exit:** budgets met on the reference device; 0 critical/serious axe issues; no P0/P1 bugs open; Nepali sign-off; docs consistent with code.
**Release:** `v1.0-rc`.

---

## Phase 9: Launch, rollout, measurement (2 weeks + ongoing)

- [ ] Pilot with 1–2 friendly vendors behind `ui_v2`; watch errors, vitals and funnel daily.
- [ ] Staged rollout (10% → 50% → 100% of traffic where the host allows, otherwise per vendor); rollback rehearsed.
- [ ] Vendor onboarding: walkthrough deck (`pptx`), short video, WhatsApp support script, in-app tips for banners and brand settings.
- [ ] Compare funnel and vitals against the Phase 0 baseline; set final KPI targets from real data.
- [ ] Retrospective and backlog: product variants, payment gateway integration, wishlist sharing, reviews with photos, loyalty, richer personalisation.
- [ ] Remove the `ui_v2` flag after one stable release.

**Exit:** two vendors live on the new UI for two weeks without a severity-1 incident; KPI report delivered.
**Release:** `v1.0`.

---

## Cross-phase tracks

| Track | Cadence | Owner |
|---|---|---|
| Nepali copy review | Weekly batch | Native-speaker reviewer |
| Real-device testing | Before every phase exit | QA / dev |
| Design critique and a11y review | Each screen, pre-dev and pre-merge | Design lead (with Claude skills) |
| Budget watch (bundle, vitals) | Every PR (CI) | Dev |
| Docs and ADR upkeep | End of each phase | Tech lead |
| Backlog grooming | Weekly | Product owner |

## Risk register (programme level)

| Risk | Likelihood | Impact | Response |
|---|---|---|---|
| Glass makes low-end phones janky | Medium | High | Profile early (Phase 1), Lite tier, layer cap, tune per device |
| Scope grows ("just one more screen") | High | High | Phase gates; P2 items cut first; change log |
| Single developer bottleneck | Medium | High | Prioritise P0 items; shift Phase 7 later rather than rush |
| Library incompatibility with React 19 | Low–Medium | Medium | Phase 0 spike; alternatives listed |
| Nepali review delays | Medium | Medium | Weekly batches; English fallback keeps working |
| Vendor brand colours break design | Medium | Medium | Contrast engine, brand matrix, settings warnings |
| Regression in checkout | Low | Very high | Keep server logic untouched; e2e suite; staged rollout |
| Service-worker staleness | Low | High | Update toast, kill-switch, versioned precache |

## Definition of Done for the whole programme

- Storefront and admin fully on the new design system; legacy classes and the `ui_v2` flag removed.
- Budgets in `PRD.md` §5 met on the reference devices; field vitals trending to targets.
- WCAG 2.2 AA verified on storefront and checkout; keyboard-only admin workflows work on Windows.
- Android install experience complete; share previews working; offline fallback present.
- Full EN/NE parity with native review.
- Documentation, ADRs, Storybook and the `bazaar-glass-ui` skill reflect the shipped product.
