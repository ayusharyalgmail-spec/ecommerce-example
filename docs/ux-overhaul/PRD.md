# PRD: UX/UI Overhaul ("Bazaar Glass")

Status: Draft v1.0, 20 Oct 2026
Applies to: `ecommerce_main` (React 19 + Vite + Tailwind 4 + Supabase)
Companion docs: `DESIGN.md`, `ARCHITECTURE.md`, `PLUGINS_AND_SKILLS.md`, `PHASES.md`
Relationship to existing specs: this PRD **extends** the root `PRD.md`. It changes how the product looks, feels and performs. It does not change business rules, security rules or the database authorization model.

---

## 1. Purpose

The storefront and vendor dashboard work, but they look and feel like a form-driven prototype. Goal: turn it into an enterprise-grade e-commerce experience that is **Android-first**, **excellent on Windows**, and visually built on a **glassmorphism + Flat 2.0** language, without hurting speed on low-end phones over 4G.

### One-line positioning
A fast, thumb-first Nepali bazaar: flat, bold and legible where people read and decide; frosted glass only where things float above content.

## 2. Principles

1. **Glass for what floats, flat for what you read.** Header, bottom nav, sheets, dialogs, toasts, sticky buy bar and image overlays are glass. Cards, forms, tables, prices and charts are flat, solid and high-contrast.
2. **Android first, Windows excellent.** Design at 360 px wide, then expand. Windows gets real desktop behaviour (sidebar, hover, keyboard, resizable windows), not a stretched phone layout.
3. **Speed is a feature.** Every visual effect has a cheap fallback. Budgets in section 5 are release gates.
4. **Nepali is first-class, not a translation.** Layouts, line-height and type are tuned for Devanagari. Every new string ships in English and Nepali.
5. **Trust at the moment of payment.** Clear totals, clear delivery fees, visible COD/manual-payment instructions, no surprises.
6. **Security model untouched.** UI changes never bypass RLS, idempotency, price-quote revalidation or audit logging.

## 3. Current-state audit (what the zip actually contains)

Findings come from reading the source, not from running it. Each is a requirement driver.

| # | Finding | Evidence | Impact |
|---|---|---|---|
| A1 | Home has no hero, banners, deal/bestseller sections or category imagery. It is a search box, text category buttons and a 12-product grid. | `pages/Home.tsx` | No merchandising, weak first impression |
| A2 | Emoji used as UI icons (🏠 🛍️ 🛒 📦 👤 🔍) and as image placeholders. Emoji render differently on Android vs Windows. | `components/Chrome.tsx`, `Product.tsx`, `Cart.tsx` | Inconsistent, unbranded look |
| A3 | Star ratings are text characters (`★☆`). | `Product.tsx`, `ProductPage.tsx` | Not scalable, no half stars, poor a11y |
| A4 | Product gallery thumbnails are not interactive; the main image never changes. | `ProductPage.tsx` | Broken core PDP interaction |
| A5 | No sticky add-to-cart on mobile PDP; two stacked WhatsApp buttons compete with the primary action. | `ProductPage.tsx` | Lower add-to-cart rate |
| A6 | Shop filters are two native `<select>`s; search fires on blur/Enter; prev/next pagination; no price or availability filter; no active-filter chips. | `pages/Shop.tsx` | Poor discovery |
| A7 | Loading state is the text "Loading…" everywhere; no skeletons. | `components/ui.tsx` | Feels slow even when fast |
| A8 | No toast system; feedback is inline text ("✓ Added"). No undo on cart removal. | `Product.tsx`, `Cart.tsx` | Weak feedback |
| A9 | Checkout is one long form of three fieldsets with radio buttons; no stepper, no sticky total bar on mobile, address chosen from a `<select>`. | `pages/Checkout.tsx` | Friction at the most valuable step |
| A10 | Admin navigation is a horizontally scrolling row of pill buttons. `DESIGN.md` specifies a desktop sidebar that was never built. Orders are card lists, not a work queue. | `admin/AdminLayout.tsx`, `admin/Orders.tsx` | Poor Windows productivity |
| A11 | Design tokens cover colour only. No radius, shadow, spacing, motion or glass tokens. Components fight the global `.btn`/`.card` classes with `!` overrides (`!p-0`, `!px-3`, `!min-h-0`). | `index.css` and many pages | Hard to evolve consistently |
| A12 | `DESIGN.md` §21 says primitives come from shadcn/ui, but `package.json` has no Radix/shadcn dependency. | `package.json` | Spec/code drift |
| A13 | Docs describe Next.js and next-intl (D-004, D-009), but the app is a Vite SPA with a hand-rolled i18n. The service worker still caches `/_next/static/`, a path Vite never produces (Vite emits `/assets/`). | `DECISIONS.md`, `public/sw.js` | JS/CSS bundles are not precached; docs mislead |
| A14 | The service worker only handles same-origin requests, so product images (served from the Supabase origin) are never cached. | `public/sw.js` | No offline/repeat-visit image benefit |
| A15 | Product images are full-size originals from the public bucket URL. No `srcset`, no sizes, no blur placeholder, no width/height. | `lib/supabase.ts`, `Product.tsx` | Heavy payload on 4G, layout shift |
| A16 | Manifest has one SVG icon, no PNG 192/512, no maskable icon, no shortcuts, no screenshots. `theme-color` is a single fixed value. | `manifest.webmanifest`, `index.html` | Weak Android install experience |
| A17 | Product links cannot produce rich WhatsApp/Facebook previews: `index.html` has only generic meta, and an SPA serves the same HTML to crawlers. | `index.html`, `ProductPage.tsx` | Sharing is a core Nepali buying channel |
| A18 | Devanagari gets `letter-spacing: .3px`. Letter-spacing breaks conjunct and headline-bar (shirorekha) continuity in Indic scripts. | `index.css` | Degraded Nepali typography |
| A19 | Noto Sans Devanagari loads from the Google Fonts CDN as a render-blocking stylesheet. | `index.html` | Slower first paint, third-party dependency |
| A20 | Data hook `useQuery` has no cache, de-duplication or stale-while-revalidate; categories are refetched on every mount of Home and Shop. | `lib/useQuery.ts` | Flicker, redundant requests |
| A21 | Dark mode follows the OS only; no manual toggle. | `index.css` | Minor |
| A22 | Language switch is a text button; price formatting never offers Devanagari digits. | `Chrome.tsx`, `lib/money.ts` | Minor |

**Strengths to preserve:** 44 px touch targets, `touch-action: manipulation`, safe-area padding, code-splitting of admin, idempotent checkout with server quote revalidation, RLS-based authorization, bilingual content model (`name_en` / `name_ne`), guest tracking via token, push notifications, print styles for invoices.

## 4. Users and contexts

| Context | Who | Device / network | Needs |
|---|---|---|---|
| Primary | Customers (Priya, Amit) | Mid/low-end Android, Chrome, 360×800, 3G/4G, often Nepali UI | Fast browse, clear prices, easy COD checkout, WhatsApp share |
| Primary | Vendor owner/manager (Ramesh, Asha) | Windows laptop + Android phone | Order queue, stock, reports, simple workflows |
| Secondary | Staff (Rajesh) | Shared Android phone or Windows PC | Pick/pack, printable invoices |
| Secondary | Operator | Desktop | White-label theming per vendor |

Reference test devices: a 360×800 low-end Android (≤3 GB RAM, throttled CPU), a mid-range Android, a 1366×768 Windows laptop at 125% scaling, a 1920×1080 Windows desktop, a foldable/tablet width (~600–840 px).

## 5. Goals and measurable targets

Targets are proposals. Baselines are captured in Phase 0 and targets are confirmed against them.

| Area | Metric | Target |
|---|---|---|
| Speed (mobile, p75 field data when available, lab otherwise) | LCP | ≤ 2.5 s on Slow 4G, mid-tier Android profile |
| | INP | ≤ 200 ms |
| | CLS | ≤ 0.1 |
| | Lighthouse mobile performance | ≥ 90 (existing PRD says > 80) |
| | Storefront entry JS (gzip) | ≤ 200 KB; admin stays lazy-loaded |
| Accessibility | axe-core critical/serious issues | 0 |
| | Conformance | WCAG 2.2 AA on storefront and checkout |
| Commerce (relative to Phase 0 baseline) | Product-view → add-to-cart rate | measurable lift, target set after baseline |
| | Checkout start → order placed | measurable lift, target set after baseline |
| | Cart abandonment on mobile | measurable drop, target set after baseline |
| Quality | Visual regression | No unreviewed diffs in CI |
| | Crash-free sessions | ≥ 99.5% |
| Vendor efficiency | Time to confirm an order from notification | Faster than baseline (measured in staff sessions) |

## 6. Non-goals

- New payment gateways (eSewa/Khalti API integration). Manual-payment UX is improved; gateway integration is a separate PRD.
- Native Android/iOS apps. The PWA is the mobile app.
- Replacing Supabase, changing RLS, or moving to Next.js.
- Marketplace/multi-vendor features.
- Product variants (size/colour). Called out as a likely follow-up; the PDP is designed to accommodate them.

## 7. Experience requirements

Priority: **P0** must ship in the first public release of the new UI; **P1** follows within the programme; **P2** is a stretch.

### UX-FND: Foundation
| ID | Requirement | Pri |
|---|---|---|
| FND-1 | A tokenised design system (colour, type, space, radius, elevation, glass, motion) in CSS variables and Tailwind `@theme`. | P0 |
| FND-2 | A component library (`src/ui`) with documented states, documented in Storybook. Replaces ad-hoc `.btn`/`.card` + `!` overrides. | P0 |
| FND-3 | One icon set (SVG, tree-shaken). No emoji as UI. | P0 |
| FND-4 | Per-vendor brand theming (primary colour, logo) at runtime with automatic readable text colour. | P0 |
| FND-5 | Light, dark and system themes with a user toggle. | P1 |
| FND-6 | Visual-effects tiers: Full, Lite (no blur) with automatic selection and a user override. | P0 |

### UX-SHELL: App shell and navigation
| ID | Requirement | Pri |
|---|---|---|
| SH-1 | Glass sticky header with logo, search entry, language switch, cart. Collapses on scroll down, returns on scroll up (mobile). | P0 |
| SH-2 | Floating glass bottom navigation on compact screens with SVG icons, active indicator and cart badge; hidden during checkout and when the keyboard is open. | P0 |
| SH-3 | Desktop header with category navigation, search, account menu; footer with contact, delivery and policy links. | P0 |
| SH-4 | Toast system for add-to-cart, wishlist, errors and undo. | P0 |
| SH-5 | Skeleton loaders on all data-driven views. | P0 |
| SH-6 | Route transitions using the View Transitions API where supported, no-op elsewhere. | P1 |
| SH-7 | Android system Back closes the topmost sheet/dialog before navigating. | P0 |

### UX-HOME: Home
| ID | Requirement | Pri |
|---|---|---|
| HM-1 | Hero carousel of vendor-managed banners (image, title, link), swipeable, with reduced-motion support. | P0 |
| HM-2 | Category rail with image or icon tiles. | P0 |
| HM-3 | Merchandised sections: New arrivals, Deals (discounted), Best sellers (`units_sold`), Recently viewed (local only). | P0 |
| HM-4 | Trust strip: Cash on delivery, delivery fee by zone, WhatsApp support. | P1 |
| HM-5 | Empty-catalogue state that guides the vendor to add products. | P1 |

### UX-SRCH and UX-SHOP: Search and listing
| ID | Requirement | Pri |
|---|---|---|
| SR-1 | Search overlay: recent searches, suggestions from product names, English and Nepali input, debounced. | P0 |
| SR-2 | Shop filters: category, price range, in-stock only, on-sale; mobile as a bottom sheet, desktop as a left sidebar. | P0 |
| SR-3 | Sort control and removable active-filter chips; all state in the URL. | P0 |
| SR-4 | "Load more" (accessible) replaces prev/next on mobile; numbered pagination remains on desktop. | P1 |
| SR-5 | Zero-result state with suggestions and a clear-filters action. | P0 |
| SR-6 | Server-side search quality upgrade (trigram/full-text) so Nepali and typo-tolerant search is usable. | P1 |

### UX-PDP: Product detail
| ID | Requirement | Pri |
|---|---|---|
| PD-1 | Swipeable gallery with working thumbnails, pinch-zoom lightbox, image dots, keyboard arrows on desktop. | P0 |
| PD-2 | Sticky glass buy bar on compact screens (price + quantity + Add to cart). | P0 |
| PD-3 | Clear price block: sale price, original price, savings. Stock state (in stock / low / out) as a flat status chip. | P0 |
| PD-4 | Delivery information by zone, with fee and expected window (windows are vendor-configurable). | P1 |
| PD-5 | Rating summary with distribution; review list with verified-purchase badge. | P1 |
| PD-6 | Share via Web Share API with WhatsApp fallback; ask-the-vendor on WhatsApp as a secondary action. | P0 |
| PD-7 | Rich link previews (title, price, image) for product URLs shared to WhatsApp/Facebook. | P0 |
| PD-8 | Breadcrumbs, related products, recently viewed. | P1 |

### UX-CART and UX-CHK: Cart and checkout
| ID | Requirement | Pri |
|---|---|---|
| CT-1 | Quantity stepper with ≥ 48 px targets, remove with **Undo** toast. | P0 |
| CT-2 | Free-delivery progress bar when the vendor sets a threshold. | P2 |
| CT-3 | Coupon entry in the cart summary with clear success/failure messages. | P1 |
| CT-4 | Glass summary sheet on mobile with the total always visible. | P0 |
| CK-1 | Stepped checkout: Contact → Delivery → Payment → Review, with progress indicator and per-step validation. Guests can complete it without signing up. | P0 |
| CK-2 | Saved addresses as selectable cards; delivery zones as cards with fee. | P0 |
| CK-3 | Payment method cards with plain-language instructions; manual payment shows the vendor's payment details clearly. | P0 |
| CK-4 | Sticky total/Place order bar on mobile; keyboard-aware (`interactive-widget=resizes-content`). | P0 |
| CK-5 | Inline validation, Nepali mobile number formatting, correct `autocomplete`, `inputmode`, `enterkeyhint`. | P0 |
| CK-6 | The existing "price changed, please confirm" behaviour is kept and made visually prominent. | P0 |
| CK-7 | Success screen: order number, what happens next, track link, share, install prompt, notification opt-in. | P0 |

### UX-POST: Account, tracking, notifications
| ID | Requirement | Pri |
|---|---|---|
| AC-1 | Account home with orders, wishlist, addresses, language, theme, effects. | P1 |
| AC-2 | Order list with status chips and **Buy again**. | P1 |
| TR-1 | Vertical tracking timeline with status icons and timestamps; payment-proof upload as a guided card. | P0 |
| NF-1 | In-context push opt-in (after first order), not on first load. | P1 |

### UX-ADM: Vendor dashboard
| ID | Requirement | Pri |
|---|---|---|
| AD-1 | Collapsible sidebar on ≥ 840 px; bottom navigation with "More" sheet on compact screens. | P0 |
| AD-2 | Order queue as a work surface: filter tabs with counts, split view (list + detail) on desktop, swipe-friendly cards on Android. | P0 |
| AD-3 | Dashboard KPIs with sparklines and a clear "needs action" area (new orders, payments to verify, low stock, reviews). | P0 |
| AD-4 | Data tables with sticky header, column visibility, bulk actions and keyboard navigation on desktop. | P1 |
| AD-5 | Command palette (Ctrl+K) and shortcuts for search, new product, go to orders. | P1 |
| AD-6 | Live new-order notification (toast + optional sound) while the dashboard is open. | P1 |
| AD-7 | Product editor with drag-to-reorder images and live preview of the product card. | P1 |
| AD-8 | Windows installed-PWA polish: title-bar overlay, resizable layout. | P2 |

### UX-PWA, UX-I18N, UX-A11Y, UX-PERF
| ID | Requirement | Pri |
|---|---|---|
| PW-1 | Installable on Android with PNG + maskable icons, shortcuts (Cart, Orders), screenshots, theme colours for light/dark. | P0 |
| PW-2 | Custom install prompt shown after a meaningful action, dismissible and remembered. | P1 |
| PW-3 | Service worker rebuilt on Workbox: precache the real build assets, cache images with expiry, keep the existing rule that private and API responses are never cached. | P0 |
| PW-4 | Offline page that shows the user's cart and recently viewed items. | P2 |
| I18-1 | Every new string exists in `en.json` and `ne.json`; CI fails on missing keys. | P0 |
| I18-2 | Devanagari typography: matched Latin/Devanagari family, no letter-spacing, line-height ≥ 1.7, tested ligatures. | P0 |
| I18-3 | Optional Devanagari digits for prices and quantities. | P2 |
| AX-1 | WCAG 2.2 AA: contrast (including text over glass), focus-visible, target size, reduced motion, reduced transparency, forced-colors fallback. | P0 |
| PF-1 | Performance budgets enforced in CI (bundle size, Lighthouse CI). | P0 |
| PF-2 | Responsive images (`srcset`, WebP/AVIF where available, intrinsic dimensions, blur placeholders). | P0 |

## 8. Platform requirements

### Android (primary)
- Baseline 360×800; also test 360×640 and 412×915.
- Touch targets ≥ 48×48 CSS px (existing 44 px is raised).
- Primary actions live in the thumb zone (bottom of screen). Filters and options open as bottom sheets.
- System Back closes sheets/dialogs first. Sheets push a history entry while open.
- `viewport-fit=cover` (already present) plus `interactive-widget=resizes-content` so sticky bars react to the keyboard.
- Respect Data Saver (`saveData`) and low device memory by switching to the Lite effects tier and smaller image sizes.
- Chrome install: valid manifest with PNG and maskable icons; custom install prompt; share target is a P2 option.
- Use `navigator.share` for sharing; native `<select>` is kept on Android for long lists (best native picker).

### Windows (excellent)
- Layouts use real breakpoints: compact (<600), medium (600–839), expanded (840–1199), large (1200–1599), extra-large (≥1600).
- Hover states only inside `@media (hover: hover)`. Visible keyboard focus everywhere. Predictable tab order.
- Admin: sidebar, split views, tables, shortcuts, Ctrl+K.
- Works at 125–150% display scaling and 1366×768.
- Windows high-contrast (`forced-colors`) fallback for glass surfaces.
- Installed PWA in Edge/Chrome behaves like an app (own window, title bar colours).
- Glass naturally echoes Windows 11 acrylic/mica; keep the effect subtle and fast.

## 9. Constraints (must not regress)

- All authorization stays in Postgres RLS/RPC. Hiding UI is cosmetic only (existing comment in `AdminLayout.tsx` stays true).
- Checkout keeps idempotency keys, server-side quote revalidation and the price-changed confirmation.
- The service worker never caches private or API responses (D-010). Any caching of public catalogue data requires an explicit decision to amend D-010 (see section 12).
- Nepali mobile validation (`^(\+?977)?9\d{9}$`) and NPR formatting stay.
- Print stylesheet for invoices stays and is re-verified after the redesign.
- Guest checkout and token tracking stay.

## 10. Data and backend requirements (additive only)

Each item needs a migration, RLS policy and an update to `DATABASE.md`.

| Need | Change |
|---|---|
| Hero banners | New `banners` table: image path, title/subtitle en+ne, link, sort order, active, start/end dates. Public read of active rows; staff write with a permission and audit log entry. |
| Category imagery | `categories.image_path` (nullable). |
| Brand theming | `store_settings.brand` (jsonb: primary colour, logo path, optional accent). |
| Free-delivery threshold | `store_settings.free_delivery_threshold_paisa` (nullable). |
| Image performance | `product_images.width`, `height`, `blur_hash` (or dominant colour), populated at upload. Backfill job for existing images. |
| Search | Trigram and/or full-text index on product names/descriptions (en + ne). |
| Delivery windows | Optional `delivery_zones.eta_min_days`, `eta_max_days`. |
| Analytics (optional) | First-party `ux_events` or a self-hosted privacy-friendly tool. Decision required. |

Supabase image transformations (resized variants via URL) are the preferred way to get responsive images. Confirm the project's plan supports them before committing; otherwise generate variants at upload time.

## 11. Rollout

- New UI ships behind a `ui_v2` flag in `store_settings` so each vendor can be moved over and rolled back instantly.
- Old and new styles coexist during migration: legacy `.btn`/`.card` classes are first re-mapped to the new tokens, then replaced page by page.
- Release order follows `PHASES.md`: foundation → shell → discovery → PDP → cart/checkout → account/tracking → admin → hardening → launch.
- Each phase ends with a demoable, shippable slice.

## 12. Risks and open questions

### Risks
| Risk | Mitigation |
|---|---|
| `backdrop-filter` is costly on low-end Android. | Limit to ≤ 3 simultaneous glass surfaces, blur ≤ 20 px, never glass on scrolling list items, Lite tier, solid fallback, on-device profiling in Phase 1 and Phase 8. |
| Text over glass fails contrast. | Glass always sits on a scrim or an opaque-enough tint; contrast is tested against worst-case backgrounds. |
| Vendor brand colours break contrast. | Auto-select on-brand text colour; clamp or warn in settings. |
| Bundle growth from UI libraries. | Per-route code splitting, `LazyMotion`, size-limit gates, no heavy chart/carousel in the entry chunk. |
| Two-language copy for every new screen slows delivery. | Copy workflow with `ux-copy` skill, CI key check, Nepali review step in each phase. |
| Scope creep (this is a long programme). | Strict phase exit criteria; P2 items cut first. |
| Visual regressions during migration. | Storybook + Playwright visual tests from Phase 1. |

### Decisions needed from you
1. **Hosting for share previews (PD-7):** Vercel (D-011 says Vercel) or a static host? The answer decides whether previews use an edge function or a Supabase Edge Function plus bot rewrite.
2. **Catalogue caching:** may public catalogue data be cached for offline/repeat visits (amends D-010)?
3. **Analytics:** first-party table, self-hosted tool, or none?
4. **Brand direction:** keep the proposed Indigo/Marigold/Rhododendron default, or supply vendor brand colours?
5. **Supabase plan:** are image transformations available on the target projects?
6. **Product variants:** are they needed soon enough to design the PDP around them now?
7. **Team size:** estimates in `PHASES.md` assume 1–2 developers plus part-time design review.
