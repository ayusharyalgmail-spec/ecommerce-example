# ARCHITECTURE: UX/UI Overhaul

Status: Draft v1.0, 20 Oct 2026
Scope: frontend architecture, theming engine, data access, PWA, performance and delivery tooling needed to ship the "Bazaar Glass" design (see `DESIGN.md`). The backend security model in the root `ARCHITECTURE.md`, `SECURITY.md` and `DATABASE.md` is unchanged unless stated.

---

## 1. Current architecture (as found in the zip)

```
Browser (React 19 SPA, Vite)
 ├─ main.tsx → App.tsx (createBrowserRouter)
 │    ├─ Providers: I18n (JSON dict) → Auth → Cart (localStorage)
 │    ├─ Layout (Chrome.tsx): Header + Outlet + BottomNav
 │    ├─ Storefront pages (eager) · Admin pages (lazy chunks)
 │    └─ Data: custom useQuery(fn, deps) → supabase-js (RLS) + RPC (lib/api.ts)
 ├─ Styling: Tailwind 4 + global .btn/.card/.badge classes + colour CSS variables
 ├─ Service worker: hand-written sw.js (push + static cache)
 └─ Supabase (Postgres + RLS + RPC, Auth, Storage)
Node push worker: server/worker.mjs (Web Push)
```

What works well and stays: RLS-based authorization, RPC-based checkout with idempotency and server quote, code-split admin, bilingual content columns, token-based guest tracking.

## 2. Known inconsistencies to resolve first (Phase 0)

| Item | Problem | Action |
|---|---|---|
| Docs vs code | Docs state Next.js and next-intl; code is Vite + custom i18n | Add an ADR (`D-014`) recording "Vite SPA, no Next.js" and update `DECISIONS.md`, `ARCHITECTURE.md`, `DESIGN.md` §21 |
| `sw.js` cache path | Caches `/_next/static/`, which Vite never emits | Replace with Workbox precache of the real build (section 8) |
| `sw.js` origin check | Cross-origin product images are skipped | Add a runtime image cache for the Supabase storage origin |
| shadcn claim | Spec says shadcn/ui, no dependency present | Adopt Radix primitives + local components (section 4) |
| Fonts | External Google Fonts stylesheet | Self-host (section 7.4) |

## 3. Target architecture

```
┌──────────────────────────────────────────────────────────────┐
│ Routes / Pages        src/pages/**   (thin: compose features) │
├──────────────────────────────────────────────────────────────┤
│ Features              src/features/{catalog,cart,checkout,    │
│                        account,orders,admin,promo,search}     │
│   components · hooks · queries · copy keys                    │
├──────────────────────────────────────────────────────────────┤
│ UI primitives         src/ui/**  (Button, Sheet, GlassPanel…) │
│   Radix + Vaul + Sonner + Embla + Lucide, styled with tokens  │
├──────────────────────────────────────────────────────────────┤
│ Design tokens & theme src/styles/tokens.css · src/theme/**    │
│   colours, radius, glass, motion, brand runtime, fx tiers     │
├──────────────────────────────────────────────────────────────┤
│ Platform services     src/platform/{pwa,install,share,        │
│                        network,view-transition,hotkeys}       │
├──────────────────────────────────────────────────────────────┤
│ Data layer            src/lib/{supabase,api,query}            │
│   TanStack Query cache · Supabase client · typed RPC          │
└──────────────────────────────────────────────────────────────┘
```

Dependency rule: each layer imports only from layers below it. `ui/` never imports from `features/`. CI enforces this with an import-boundary lint rule.

### 3.1 Proposed folder layout
```
src/
  main.tsx  App.tsx
  styles/        tokens.css  base.css  glass.css  fonts.css
  theme/         ThemeProvider.tsx  brand.ts (contrast + derive)  fx.ts (tier detection)
  ui/            Button  Field  Select  Chip  Badge  Card  GlassPanel  Sheet  Dialog
                 Toast  Skeleton  EmptyState  Rating  PriceTag  QuantityStepper
                 Gallery  Stepper  Timeline  DataTable  KPI  CommandPalette
  features/
    shell/       Header  BottomNav  Sidebar  Footer  AppLayout  AdminLayout
    promo/       HeroCarousel  CategoryRail  Sections
    catalog/     ProductCard  FilterSheet  FilterSidebar  useProducts  useProduct
    search/      SearchOverlay  useSuggest
    cart/        CartProvider  CartLine  CartSummary
    checkout/    CheckoutStepper  steps/*  schema.ts (zod)
    orders/      Timeline  PaymentProofCard
    account/     ...
    admin/       orders/ products/ reports/ ...
  platform/      pwa.ts  install.ts  share.ts  network.ts  hotkeys.ts
  lib/           supabase.ts  api.ts  money.ts  i18n.tsx  query.ts
  messages/      en.json  ne.json
  pages/         route components (thin)
```
The move is incremental (strangler pattern, section 11). Existing files keep working until replaced.

## 4. UI library decisions

| Concern | Choice | Reason |
|---|---|---|
| Accessible behaviour | **Radix UI primitives** (Dialog, Popover, Select, Tabs, Tooltip, Toggle, Switch…) | Accessibility and focus management done correctly; unstyled; matches spec intent for shadcn/ui |
| Styling | **Tailwind 4 + CSS variables**; `class-variance-authority` for variants | Already in the project; tokens drive everything |
| Bottom sheets | **Vaul** | Drag gestures, snap points, built on Radix Dialog |
| Toasts | **Sonner** | Small, accessible, supports undo actions |
| Carousel | **Embla Carousel** | Light, touch-first, no CSS dependency |
| Icons | **lucide-react** (per-icon imports) | One consistent set, tree-shakeable |
| Motion | **Motion** (`motion/react`, formerly Framer Motion) via `LazyMotion` + `domAnimation`; CSS for simple states | Spring sheets and shared layout; bundle kept small |
| Forms | **react-hook-form + zod** | Stepped checkout with per-step validation, typed schemas |
| Charts (admin) | A lightweight lazy-loaded chart library, loaded only on admin report routes | Keep storefront bundle untouched |
| Command palette | **cmdk** | Standard, accessible |

Versions are pinned at install time and recorded in `package.json`; confirm React 19 compatibility of each package during Phase 1 (a spike task).

## 5. Theming engine

### 5.1 Layers
1. **Static tokens** in `tokens.css` (palette, radius, elevation, glass, motion).
2. **Mode**: `data-theme="light|dark"` on `<html>`; "system" removes the attribute and uses `prefers-color-scheme`. Persisted in `localStorage`; read by a tiny inline script in `index.html` before first paint to avoid a flash.
3. **Brand**: `brand.ts` reads `store_settings.brand`, computes `--brand`, `--on-brand`, hover/press/tint via `color-mix()`, and writes variables on `:root`. Contrast is computed (WCAG relative luminance); text colour is ink or white. Settings UI warns when no option reaches 4.5:1.
4. **FX tier**: `fx.ts` sets `data-fx` on `<html>`.

### 5.2 FX tier detection (sketch)
```ts
// src/theme/fx.ts
type Nav = Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };

export function detectFx(): "full" | "lite" {
  const n = navigator as Nav;
  const pref = localStorage.getItem("fx");            // "full" | "lite" | null (auto)
  if (pref === "full" || pref === "lite") return pref;
  if (n.connection?.saveData) return "lite";
  if (n.deviceMemory !== undefined && n.deviceMemory <= 2) return "lite";
  return "full";
}
// Phase 8 adds a one-time frame-budget probe that can downgrade to "lite" and remember it.
```
`deviceMemory` and `connection` are Chromium-only APIs, which covers Android Chrome and Edge. Other browsers fall back to "full" with CSS fallbacks still in place.

### 5.3 Brand config location
`store_settings.brand` (jsonb) is read once with the existing `store_settings` query, cached by TanStack Query, and injected by `ThemeProvider` before the first route renders. Logo and colour are also embedded in the cached manifest response (section 8) so the installed app matches.

## 6. Routing and navigation

- Keep `createBrowserRouter`. Add `viewTransition` on `<Link>`/`navigate` for supported browsers (React Router 7 feature).
- Breakpoint-aware layouts: `AppLayout` renders `Header + BottomNav` on compact and `Header + (mega menu)` on expanded; `AdminLayout` renders `Sidebar` on ≥ 840 px and bottom nav on compact.
- **Sheet routing:** filter sheet, cart peek and "More" sheet push a history entry (`history.pushState` with a sentinel key) so the Android Back button closes them. Implemented once in `useSheetHistory()`.
- Link prefetch: on `pointerenter` (desktop) and `touchstart` (mobile) call `queryClient.prefetchQuery` for product detail data, and `import()` the next route chunk.
- Scroll: keep `ScrollRestoration`; restore list scroll position when returning from a PDP.

## 7. Data layer

### 7.1 Replace `useQuery` with TanStack Query
Reasons (audit A20): cache, de-duplication, stale-while-revalidate, retries, prefetch, mutation helpers, optimistic updates for wishlist/cart. Migration is mechanical: a shim `useQuery(fn, deps)` is kept for unmigrated pages and re-implemented on top of TanStack Query so pages move one at a time.

Query-key convention: `['catalog','list',{category,q,sort,page,filters}]`, `['product',slug]`, `['categories']`, `['settings']`, `['orders','mine']`, etc.

Cache policy:
| Data | staleTime | Notes |
|---|---|---|
| `store_settings`, categories, banners | 10 min | Shared by Home, Shop, Header |
| Product lists | 60 s | Keep previous data while paginating (`placeholderData`) |
| Product detail | 60 s | Prefetched on hover/touch |
| Cart quote, order, tracking | 0 | Always fresh |
| Admin lists | 15 s + Realtime invalidation | |

### 7.2 Mutations
Wishlist toggle and cart quantity use optimistic updates with rollback. Checkout stays a single idempotent RPC call; **no optimistic UI** for placing an order.

### 7.3 Images
- Store `width`, `height`, `blur_hash` at upload (the admin upload already converts to WebP client-side for payment proofs; reuse the same pipeline for product images, capped at 1600 px).
- Serve responsive variants through Supabase Storage image transformation URLs (width + quality + format) when the project plan supports it; otherwise generate fixed variants (320, 640, 960, 1600) at upload.
- A single `<Img>` component: `srcset`/`sizes`, intrinsic dimensions, blur-up, `loading`/`fetchpriority` props, graceful fallback to a flat illustration when there is no image.
- Respect Data Saver by choosing a smaller `sizes` hint and quality.

### 7.4 Fonts
`@fontsource/mukta` (400, 500, 600, 700, 800; Latin and Devanagari subsets), imported in `fonts.css`, `font-display: swap`, 400 and 700 preloaded. Removes the third-party stylesheet.

### 7.5 Search
Phase 3 ships client UX over the existing `ilike` query (debounced, minimum length). Phase 5/6 adds a Postgres RPC `search_products(q, filters, page)` backed by a trigram (and optionally full-text) index across `name_en`, `name_ne`, descriptions, returning ranked rows and counts. Suggestions use a lightweight RPC returning top N names. All stay under RLS.

### 7.6 Realtime (admin)
Supabase Realtime subscription on `orders` inserts (and payment-proof submissions) while the dashboard is open, with a toast, an optional sound and TanStack Query invalidation. Authorization stays RLS-based. Subscriptions are torn down on unmount and when the tab is hidden for a long time.

## 8. PWA and service worker

Replace the hand-written `sw.js` with **vite-plugin-pwa** in `injectManifest` mode so we keep our own push and notification-click handlers and gain Workbox precaching and routing.

| Resource | Strategy |
|---|---|
| Built JS/CSS/fonts (`/assets/*`) | Precache (revisioned by the build) |
| App shell navigation | Network-first with offline fallback page; never serve a stale shell for private routes |
| Product images (Supabase storage origin) | Stale-while-revalidate, max entries and age limits, opaque responses excluded |
| Supabase REST/RPC, auth, `/account`, `/admin`, `/checkout`, `/track`, `/cart`, `/orders` | **Never cached** (D-010 preserved) |
| Public catalogue JSON | Not cached by the SW. Optional in-memory/IndexedDB persistence of TanStack Query for catalogue only, pending the D-010 decision |

Update flow: new SW waits; the app shows an "Update available" toast with a Refresh action (no silent reload during checkout).

Manifest changes: PNG 192/512 and maskable icons, `id`, `lang`, `categories`, `shortcuts` (Cart, Orders), `screenshots`, `description`, separate light/dark `theme-color` metas, `display_override` for the admin entry. The manifest can be generated per vendor at build or served dynamically so name, colours and icons match the white-label brand.

Install prompt: capture `beforeinstallprompt`, show `InstallPrompt` after a meaningful event (first add-to-cart or order placed), remember dismissal for 30 days.

## 9. Performance architecture

### 9.1 Budgets (CI gates)
| Budget | Value |
|---|---|
| Storefront entry JS (gzip) | ≤ 200 KB |
| Any route chunk (gzip) | ≤ 80 KB (admin chunks may be larger but are lazy) |
| CSS (gzip) | ≤ 40 KB |
| LCP (lab, Slow 4G, mid-tier Android profile) | ≤ 2.5 s |
| CLS | ≤ 0.1 |
| Long tasks on route change | none > 100 ms on the reference device |

Enforced by `size-limit` (bundle) and Lighthouse CI (lab metrics) in the pipeline. Phase 0 records current values so budgets are set against reality.

### 9.2 Techniques
- Split by route: storefront critical routes eager, secondary routes (account, tracking, invoice) lazy, admin lazy (already).
- `LazyMotion` with the reduced feature set; no motion in the entry chunk beyond CSS.
- Carousel, gallery lightbox, filter sheet, command palette, charts: dynamic `import()` on first use.
- Preconnect to the Supabase origin; preload the LCP image on Home and PDP.
- Avoid layout shift: fixed aspect ratios, skeletons matching final size, reserved space for sticky bars.
- Glass cost control: ≤ 3 layers, no nested blur, no blur animation, Lite tier (see `DESIGN.md` §3).
- `content-visibility: auto` on below-the-fold sections of long pages.
- Real-user monitoring: `web-vitals` reported to the chosen analytics sink (section 12).

## 10. Share previews and SEO (PD-7)

Problem: an SPA returns the same `index.html` to every URL, so WhatsApp/Facebook crawlers see generic metadata.

Design: a small **edge function** answers requests for `/product/:slug` (and optionally `/shop?category=`) when the user agent is a known link-preview crawler. It queries Supabase (anon key, public product only), and returns minimal HTML with `og:title`, `og:description`, `og:image` (a sized variant), `og:url`, and `product:price`. Normal browsers receive the SPA unchanged.

| Hosting | Implementation |
|---|---|
| Vercel (D-011) | Edge Middleware or a serverless function with a rewrite for crawler user agents |
| Static host | Supabase Edge Function plus host-level rewrite, or a Cloudflare Worker in front |

Also add: per-page `<title>` and meta description (extend `useTitle`), canonical URLs, `sitemap.xml` generated from published products, `robots.txt`, JSON-LD `Product` on PDP via the same function. This is the one piece of server-side code in the programme; it is read-only and exposes only already-public data.

## 11. Migration strategy (strangler)

1. **Tokens first.** Introduce `tokens.css` and re-map the legacy `.btn`, `.card`, `.badge`, `.alert`, input styles to the new tokens. The entire app changes colour, radius and type with no component edits.
2. **Primitives next.** Build `src/ui` alongside legacy classes. New code uses primitives only.
3. **Shell, then pages.** Replace `Chrome.tsx` (Header, BottomNav) first, then pages in the order of `PHASES.md`.
4. **Flag-gated.** `store_settings.ui_v2` toggles new routes/layouts so a vendor can be switched back instantly. After the last page migrates and one stable release passes, delete the legacy classes and the flag.
5. **Lint rule** forbids new uses of legacy classes and `!` important utilities once Phase 2 completes.

## 12. Analytics and observability

- Web vitals and key funnel events (view product, add to cart, begin checkout, place order, search, filter use, install prompt shown/accepted). Privacy-respecting, no ad targeting (root PRD §15 intent).
- Sink options: first-party `ux_events` table with RLS insert-only for anon and read for owner; or a self-hosted privacy-friendly analytics tool; or none. **Decision pending** (PRD §12).
- Error reporting: an error boundary per route with a friendly flat error state and a "Report" option; optional Sentry-class service.
- Feature flag and release version attached to all events to compare old and new UI.

## 13. Testing and quality architecture

| Layer | Tool | What it proves |
|---|---|---|
| Types and lint | TypeScript (strict), ESLint with import-boundary and a11y rules | Layering, no legacy classes, basic a11y |
| Components | Storybook + interaction tests | Every state, EN/NE, light/dark, compact/expanded |
| Visual regression | Playwright screenshots (or a Storybook visual service) | No accidental UI change |
| End-to-end | Playwright, projects: Pixel-class Android emulation, Desktop Edge/Chromium 1366×768 and 1920×1080 | Browse → cart → checkout (COD and manual) → track; admin order flow; offline page |
| Accessibility | `@axe-core/playwright` in e2e + manual screen-reader pass (TalkBack on Android, NVDA on Windows) | WCAG 2.2 AA |
| Performance | Lighthouse CI + `size-limit` + on-device profiling checklist | Budgets and glass cost on a real low-end Android |
| i18n | Script that fails CI on missing keys and checks for untranslated English in `ne.json` | Bilingual completeness |
| Security regression | Existing checks plus a test that no private route is cached by the SW | D-010 preserved |

Real-device pass: at least one low-end and one mid-range Android phone and one Windows laptop at 125% scaling before each phase exit.

## 14. Delivery pipeline

- Preview deployments per pull request with the Supabase staging project.
- CI order: typecheck → lint → unit/component → build → size-limit → Storybook build → Playwright (visual + e2e + axe) → Lighthouse CI.
- Migrations are reviewed with the RLS tests in the existing `SECURITY.md` checklist.
- Semantic versioning per D-013; each phase ends with a tagged release and notes.

## 15. Architecture decisions to record (new ADRs)

| ID | Decision |
|---|---|
| D-014 | Frontend is a Vite SPA; Next.js text in older docs is superseded |
| D-015 | Radix + Tailwind tokens + local `src/ui` library (not a third-party themed kit) |
| D-016 | TanStack Query replaces the custom `useQuery` |
| D-017 | Glass is restricted to floating surfaces with mandatory fallbacks and effect tiers |
| D-018 | Service worker built with Workbox (`injectManifest`); D-010 caching rules preserved |
| D-019 | Edge function for share previews (read-only, public data) |
| D-020 | `ui_v2` flag and strangler migration |

## 16. Risks specific to this architecture

| Risk | Mitigation |
|---|---|
| New libraries are not yet verified against React 19 | Phase 1 spike installs and smoke-tests each library; fall back to alternatives or in-house components |
| Bundle bloat from the UI stack | Budgets as CI gates; dynamic imports; periodic bundle analysis |
| Service-worker bugs lock users on stale builds | Update toast, versioned precache, kill-switch (a small unregister path controlled by a remote flag) |
| White-label colour produces unreadable UI | Automatic contrast selection, settings warning, Storybook theme matrix with several brand colours |
| Edge function becomes a new attack surface | Read-only, anon key, allow-list of fields, rate limiting, no user data |
| Two parallel style systems during migration | Time-boxed strangler phases and the lint rule |
