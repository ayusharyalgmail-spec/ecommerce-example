# DESIGN: "Bazaar Glass"

Status: Draft v1.0, 20 Oct 2026
Supersedes `DESIGN.md` in the repo root for visual language. Keeps its accessibility and localisation intent.
Stack: Tailwind CSS 4 (`@theme`), CSS variables, React 19.

---

## 1. Concept

Nepal's markets are dense, colourful and fast. The interface borrows that energy in a controlled way:

- **Flat 2.0 does the work.** Solid colour blocks, confident type, generous radius, light layered shadows, simple geometric icons. Product cards, forms, tables, prices and charts are always flat and opaque, because that is where people read and decide.
- **Glass floats above.** Frosted translucent surfaces appear only on elements that sit over content: header, bottom nav, sheets, dialogs, toasts, the sticky buy bar and small chips on images. Glass is the "depth" layer; flat is the "content" layer.
- **One memorable moment per screen.** Home gets the hero; the product page gets the gallery; checkout gets the sticky total; admin gets the order queue. Everything else stays quiet.

### The golden rule
> If it scrolls with the content, it is flat. If it floats above the content, it may be glass.

### Cultural touches (used sparingly)
- Marigold (sayapatri/genda) as the action colour; rhododendron (Nepal's national flower) crimson for sale and love; deep indigo as ink.
- An optional low-opacity geometric textile-style pattern in empty states and the hero backdrop. Never behind text a user must read.

## 2. Colour

Default brand. Every brand colour is overridable per vendor (see section 2.3).

### 2.1 Palette

| Token | Light | Dark | Role |
|---|---|---|---|
| `--ink` | `#15173A` | `#F2F3FF` | Primary text, strong lines |
| `--bg` | `#F7F6FB` | `#0E1030` | Page background |
| `--surface` | `#FFFFFF` | `#181B45` | Cards, forms (flat layer) |
| `--surface-2` | `#EEEDF6` | `#222657` | Wells, inputs, skeletons |
| `--text-muted` | `#555A7D` | `#B4B8DC` | Secondary text |
| `--line` | `#DAD9E8` | `#2E3266` | Borders, dividers |
| `--brand` | `#F5A524` (marigold) | `#F5A524` | Primary buttons, active states |
| `--on-brand` | `#15173A` | `#15173A` | Text on brand (ink on marigold ≈ 8:1) |
| `--accent` | `#D1244F` (rhododendron) | `#FF5C82` | Sale, wishlist, urgency |
| `--glacier` | `#2FB5A3` | `#52D4C2` | Positive highlights, delivery/in-stock accents |
| `--success` | `#0E7C4A` | `#34D399` | Delivered, verified |
| `--warning` | `#B45309` | `#FBBF24` | Low stock, pending |
| `--danger` | `#C21F3A` | `#F87171` | Errors, cancelled |
| `--info` | `#2457D6` | `#7FA6FF` | Informational |

Why ink-on-marigold, not white-on-marigold: white on a warm yellow-orange fails AA. Dark text on the brand colour is a deliberate, accessible choice, and it makes the primary button unmistakable.

Contrast values above are approximate. Phase 0 verifies every pair with tooling and records the results.

### 2.2 Ambient mesh (backs the glass)
Glass only reads as glass over something. Behind the shell sits a fixed, low-saturation mesh of three radial gradients (marigold, rhododendron, indigo) at 8–14% alpha in light mode and 18–28% in dark. It is a single static CSS background (no animation, no canvas), cheap to paint.

### 2.3 White-label theming
Store settings supply `brand.primary` (and optionally `brand.accent`). At runtime:
1. Compute relative luminance of the primary.
2. Set `--on-brand` to ink or white, whichever gives ≥ 4.5:1.
3. Derive `--brand-hover`, `--brand-press`, `--brand-tint` with `color-mix()`.
4. If neither ink nor white reaches 4.5:1, the settings screen warns the vendor and clamps lightness.

### 2.4 Tokens (Tailwind 4)

```css
@import "tailwindcss";

@theme {
  /* Breakpoints follow Material window size classes: compact / medium / expanded */
  --breakpoint-sm: 600px;   /* large phones, foldables, small tablets */
  --breakpoint-md: 840px;   /* tablets, small Windows windows: sidebars appear */
  --breakpoint-lg: 1200px;  /* laptops */
  --breakpoint-xl: 1600px;  /* desktops */

  --font-sans: "Mukta", "Segoe UI Variable Text", "Segoe UI", Roboto, system-ui, sans-serif;

  --radius-xs: .375rem;  /* chips inside dense UI */
  --radius-sm: .5rem;    /* inputs */
  --radius-md: .75rem;   /* buttons */
  --radius-lg: 1rem;     /* cards */
  --radius-xl: 1.5rem;   /* sheets, hero */
  --radius-pill: 999px;

  --ease-out: cubic-bezier(.2, .8, .2, 1);
  --dur-1: 120ms; --dur-2: 200ms; --dur-3: 320ms;
}

:root {
  color-scheme: light;
  --ink:#15173A; --bg:#F7F6FB; --surface:#fff; --surface-2:#EEEDF6;
  --text-muted:#555A7D; --line:#DAD9E8;
  --brand:#F5A524; --on-brand:#15173A; --accent:#D1244F; --glacier:#2FB5A3;
  --success:#0E7C4A; --warning:#B45309; --danger:#C21F3A; --info:#2457D6;

  /* Elevation (flat layer) */
  --e1: 0 1px 2px rgba(21,23,58,.06);
  --e2: 0 4px 12px rgba(21,23,58,.08);

  /* Glass (floating layer) */
  --glass-bg: rgba(255,255,255,.62);
  --glass-bg-solid: rgba(255,255,255,.94);   /* Lite tier */
  --glass-border: rgba(255,255,255,.55);
  --glass-highlight: rgba(255,255,255,.7);
  --glass-shadow: 0 8px 32px rgba(21,23,58,.14);
  --glass-blur: 18px;
}

:root[data-theme="dark"] {
  color-scheme: dark;
  --ink:#F2F3FF; --bg:#0E1030; --surface:#181B45; --surface-2:#222657;
  --text-muted:#B4B8DC; --line:#2E3266;
  --accent:#FF5C82; --glacier:#52D4C2;
  --success:#34D399; --warning:#FBBF24; --danger:#F87171; --info:#7FA6FF;
  --e1: 0 1px 2px rgba(0,0,0,.4); --e2: 0 4px 12px rgba(0,0,0,.45);
  --glass-bg: rgba(24,27,69,.58);
  --glass-bg-solid: rgba(24,27,69,.96);
  --glass-border: rgba(255,255,255,.12);
  --glass-highlight: rgba(255,255,255,.08);
  --glass-shadow: 0 8px 32px rgba(0,0,0,.5);
}
/* "system" theme: same dark values under @media (prefers-color-scheme: dark) :root:not([data-theme]) */
```

## 3. Glass spec

### 3.1 Recipe
```css
.glass {
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(160%);
          backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow), inset 0 1px 0 var(--glass-highlight);
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass { background: var(--glass-bg-solid); }
}
@media (prefers-reduced-transparency: reduce) {
  .glass { backdrop-filter: none; -webkit-backdrop-filter: none; background: var(--glass-bg-solid); }
}
@media (forced-colors: active) {
  .glass { background: Canvas; border-color: CanvasText; backdrop-filter: none; box-shadow: none; }
}
[data-fx="lite"] .glass { backdrop-filter: none; -webkit-backdrop-filter: none; background: var(--glass-bg-solid); }
```

### 3.2 Where glass is allowed
| Surface | Glass | Notes |
|---|---|---|
| Top app bar | Yes | Becomes more opaque after scroll to protect contrast |
| Floating bottom nav (compact) | Yes | Pill, inset 12 px from the edges, respects safe-area |
| Bottom sheets (filters, cart summary, "More") | Yes | `--radius-xl` top corners, drag handle |
| Dialogs, popovers, command palette | Yes | Backdrop scrim at 40% ink |
| Toasts | Yes | |
| Sticky buy bar / checkout total bar | Yes | |
| Chips over images (discount, 1/5 gallery counter, wishlist heart) | Yes, small | Keep area small for GPU cost |
| Hero text panel | Yes | Only when text overlaps a photo |

### 3.3 Where glass is forbidden
Product cards, list rows, table rows, form fields, buttons (except an on-image icon button), charts, long text blocks, anything inside a scrolling list that repeats. Repeating blur layers are the biggest performance risk on low-end Android.

### 3.4 Rules
1. At most **three** glass surfaces visible at once (typical: header + bottom nav + one sheet or toast).
2. Blur 12–20 px. Never nest glass inside glass.
3. Text on glass must meet 4.5:1 against the **worst** background beneath it. Use the ambient scrim (`--glass-bg` alpha ≥ .58 light / ≥ .55 dark) and test with a busy product photo underneath.
4. No animating `backdrop-filter` or `blur()` values. Animate `transform` and `opacity` only.
5. Fallbacks are mandatory (see 3.1): unsupported, reduced transparency, forced colours, Lite tier.

### 3.5 Effects tiers
| Tier | Selected when | Behaviour |
|---|---|---|
| Full | Default | Blur + mesh + motion |
| Lite | `navigator.connection.saveData`, device memory ≤ 2 GB (where reported), a failed frame-budget probe, or the user picks it | No blur (opaque glass tint), mesh becomes a flat tint, shorter transitions, smaller images |
| Reduced | `prefers-reduced-motion` / `prefers-reduced-transparency` | No non-essential motion; no blur |

Applied as `data-fx="full|lite"` on `<html>`. The user can override under Account → Appearance.

## 4. Flat 2.0 spec

- **Surfaces:** solid `--surface` on `--bg`, 1 px `--line` border *or* `--e1` shadow, not both on the same card.
- **Radius hierarchy** (do not use one radius everywhere): chips `xs`, inputs `sm`, buttons `md`, cards `lg`, sheets/hero `xl`, avatars/badges `pill`.
- **Colour blocks:** category tiles, promo tiles and empty states use solid brand-derived tints (`color-mix(in oklab, var(--brand) 14%, var(--surface))`), not gradients.
- **Icons:** one outline set (Lucide), 1.75 px stroke, 24 px grid, filled variant for the active nav item. Geometric spot illustrations for empty/error states in flat colour (indigo, marigold, glacier).
- **Depth:** `--e1` for resting cards, `--e2` for hover/raised on desktop. No bevels, no inner shadows, no gradients on content surfaces.
- **Imagery:** product photos on a neutral `--surface-2` mat with `object-fit: cover`, blur-up placeholder, fixed aspect ratios to prevent layout shift.

## 5. Typography

### 5.1 Families
- **Primary: Mukta** (Latin + Devanagari designed together, so mixed English/Nepali lines look consistent). Self-hosted via `@fontsource`, subsetted to Latin + Devanagari, `font-display: swap`, preloaded for the 400 and 700 weights.
- Fallback stack on Windows: Segoe UI Variable → Segoe UI. On Android: Roboto / Noto Sans Devanagari (system).
- Optional display face for hero headlines only (to be chosen in Phase 1 after rendering real Nepali copy; candidate: Baloo 2, which also covers Devanagari). If it fails the Devanagari ligature check, hero headlines use Mukta 800.

Replace the render-blocking Google Fonts `<link>` (audit A19).

### 5.2 Scale
| Token | Mobile | ≥ 840 px | Weight | Use |
|---|---|---|---|---|
| `display` | 28 / 1.15 | 44 / 1.1 | 800 | Hero |
| `h1` | 24 / 1.25 | 32 / 1.2 | 700 | Page title |
| `h2` | 20 / 1.3 | 24 / 1.25 | 700 | Section |
| `h3` | 17 / 1.35 | 18 / 1.35 | 600 | Card/section sub |
| `body` | 16 / 1.55 | 16 / 1.55 | 400 | Default (never below 16 for inputs) |
| `small` | 14 / 1.45 | 14 / 1.45 | 400 | Meta |
| `caption` | 12 / 1.4 | 12 / 1.4 | 500 | Badges |
| `price` | 18 / 1.2 | 20 / 1.2 | 700, tabular numerals | Prices |

### 5.3 Devanagari rules
- `line-height` ≥ 1.7 for body and ≥ 1.35 for headings in `lang="ne"` (Devanagari has tall ascenders and matras).
- **Remove `letter-spacing`** on Nepali text (current CSS sets `.3px`; it breaks the headline bar and conjuncts).
- No ALL CAPS, no faux italics, no synthetic bold (load real weights).
- Never truncate with a hard character limit; use `line-clamp` and allow height to grow.
- Test strings: long conjunct-heavy product names, mixed English/Nepali, numerals.

### 5.4 Copy
Sentence case, plain verbs, same action name across the flow ("Add to cart" → toast "Added to cart"). Errors say what happened and how to fix it. All strings keyed in `en.json` and `ne.json`.

## 6. Space, layout, grid

- 4 px base. Scale: 4, 8, 12, 16, 20, 24, 32, 40, 56, 72.
- Page gutters: 16 px (compact), 24 px (medium), 32 px (expanded+). Max content width: 1200 px storefront, fluid admin.
- Product grid: 2 columns (compact), 3 (medium), 4 (expanded), 5 (large+). Gap 12 px mobile, 20 px desktop.
- Bottom nav height 64 px plus safe-area; page content gets matching bottom padding.
- Touch targets ≥ 48×48 px; spacing between adjacent targets ≥ 8 px.

## 7. Motion

| Pattern | Spec |
|---|---|
| Micro-feedback (press, toggle) | 120 ms, `transform: scale(.97)` + colour change |
| Add to cart | Button morphs to a check (200 ms), cart icon bounces once, toast appears. No fly-to-cart particles. |
| Sheets/dialogs | Spring from bottom (mobile) or fade+scale 0.98→1 (desktop), 200–320 ms |
| Route change | View Transition cross-fade 200 ms; shared-element transition for product image → PDP where supported |
| Skeletons | Static tinted blocks; a single slow shimmer (1.6 s) only in Full tier |
| Hero | Auto-advance every 6 s, pauses on touch/hover/focus, off under reduced motion |

Rules: animate `transform` and `opacity` only; no scroll-triggered fade-ins on every section; everything honours `prefers-reduced-motion`.

## 8. Components

Built on Radix primitives (accessible behaviour) styled with tokens; Vaul for bottom sheets; Sonner for toasts; Embla for carousels; Lucide for icons. Each component ships with Storybook stories for every state and both languages.

| Component | Variants / states | Notes |
|---|---|---|
| Button | primary (marigold), secondary (outline), ghost, danger, glass (on images); sm/md/lg; loading; icon-only | Min height 48. Loading keeps width. |
| Field, Input, Textarea | default, focus, error, disabled; helper and error text | 16 px font, 48 px height, floating-free labels above field |
| Select | Native on compact screens, Radix on expanded | |
| Checkbox, Radio, Switch | | Choice cards for payment/delivery |
| Chip | filter, removable, status | |
| Badge | success, warning, danger, info, neutral | Replaces `.badge-*`; colour never alone: icon or text too |
| Card | flat (`--e1`), interactive (hover `--e2` on `hover:hover`) | |
| GlassPanel | header, nav, sheet, toast, bar | The only way to produce glass in code |
| ProductCard | default, compact, list; sale, low stock, out of stock; wishlist heart | Image blur-up, price block, one primary action |
| PriceTag | regular, sale (with savings), range | Tabular numerals; optional Devanagari digits |
| Rating | read-only (SVG stars, half stars), input, summary with histogram | |
| QuantityStepper | 48 px targets, min/max/disabled | |
| Gallery | swipe, thumbnails, dots, lightbox with pinch-zoom | |
| CategoryTile | image, icon-only | |
| FilterSheet / FilterSidebar | | URL-synced |
| Stepper | 4-step checkout | |
| Timeline | order tracking | |
| Toast | success, error, info, undo | Max 2 visible |
| Skeleton | card, row, text, image | |
| EmptyState | with illustration, title, one action | |
| DataTable | sticky header, density, bulk bar | Admin |
| KPI | value, delta, sparkline | Admin |
| CommandPalette | | Admin, Ctrl+K |
| InstallPrompt | | Dismissible, remembered |

## 9. Screens

ASCII wireframes show structure at 360 px. Glass elements are marked `[g]`.

### 9.1 Shell (compact)
```
┌────────────────────────────────┐
│ [g] Logo        🔍search  EN  🛒2│  top bar
├────────────────────────────────┤
│            content             │
│                                │
│  [g] ⌂   ▦    🛒   ▣   ☺      │  floating nav
└────────────────────────────────┘
```
(Icons are Lucide, shown here as placeholders.)

### 9.2 Home
```
[g] top bar
┌──────────────────────────────┐
│  HERO banner (swipe)         │  one big moment
│  [g] headline + Shop now     │
│  • • ○ ○                     │
└──────────────────────────────┘
Categories  ▢ ▢ ▢ ▢ ▢ →        (image tiles, horizontal)
Deals       ▢▢ ▢▢ ▢▢ →        (sale price + savings)
New arrivals  grid 2 col
Best sellers  rail
Recently viewed rail
Trust strip: COD · Delivery · WhatsApp
```

### 9.3 Shop
- Compact: search field, sort chip, **Filters** button (opens glass bottom sheet), active-filter chips, product grid, Load more.
- Expanded: left sidebar filters (flat), toolbar with sort and grid/list toggle, grid, pagination.

### 9.4 Product detail
```
┌──────────────────────────────┐
│ Gallery (swipe)  [g]1/5  [g]♥ │
├──────────────────────────────┤
│ Breadcrumb                   │
│ Name                         │
│ ★★★★☆ 4.3 (28)  · 120 sold   │
│ Rs. 1,490   Rs. 1,990  -25%  │
│ ● In stock · Delivery Rs.100 │
│ Description / details tabs   │
│ Reviews (summary + list)     │
│ Related, Recently viewed     │
├──────────────────────────────┤
│ [g] − 1 +   [ Add to cart ]  │  sticky buy bar
└──────────────────────────────┘
```
Expanded: two columns, gallery left (sticky), info right, buy box inside the info column (no sticky bar).

### 9.5 Cart
Flat line items with 96 px images, stepper, remove-with-undo. Summary is a glass bottom sheet peek on compact (total + Checkout button), a sticky flat card on expanded. Coupon field inside the summary.

### 9.6 Checkout
```
Contact ──● Delivery ──○ Payment ──○ Review
┌──────────────────────────────┐
│ step content (flat cards)    │
└──────────────────────────────┘
[g] Total Rs. 3,290  [ Continue ]   sticky
```
Address cards, zone cards with fee, payment cards with instructions. Review step shows the quote, the price-changed notice if relevant, and **Place order**. The bottom nav is hidden throughout checkout.

### 9.7 Order success and tracking
Large check mark (flat, 200 ms draw), order number with copy button, what-happens-next list, Track order, Share, Install app, Enable notifications. Tracking is a vertical timeline with the current step highlighted and timestamps in the user's language.

### 9.8 Account
Profile header, tiles (Orders, Wishlist, Addresses, Appearance), recent orders with Buy again.

### 9.9 Admin
```
Expanded (≥840)
┌────────┬──────────────────────────────┐
│ Side   │ Orders      [Ctrl+K search]  │
│ bar    ├────────────┬─────────────────┤
│        │ queue list │ order detail    │
│        │ (tabs:     │ items, payment, │
│        │  New 4 ... │ timeline, acts) │
└────────┴────────────┴─────────────────┘
Compact: bottom nav (Orders, Products, Reports, More) and full-screen order detail.
```
Dashboard opens with a "Needs action" band (new orders, payments to verify, low stock, reviews to moderate), then KPIs with sparklines. Admin glass is limited to the top bar, command palette, dialogs and toasts so dense tables stay crisp.

## 10. Android specifics
- Bottom nav and sticky bars are inset for the gesture bar (`env(safe-area-inset-bottom)`).
- Sheets add a history entry so system Back dismisses them.
- Inputs use `inputmode`, `autocomplete` and `enterkeyhint`; Enter moves to the next field and the last field submits the step.
- Avoid hover-only affordances. Long-press is never required.
- Pull-to-refresh is left to the browser; `overscroll-behavior: contain` only inside sheets and carousels.
- Status bar colour follows the theme via two `theme-color` meta tags (light/dark) and updates with the brand colour.

## 11. Windows specifics
- Hover effects only under `@media (hover: hover) and (pointer: fine)`.
- Keyboard: `/` focuses search, `g` then `c` goes to cart, `?` opens shortcut help; admin adds Ctrl+K, `n` new product.
- Focus ring: 2 px `--brand` outline with 2 px offset plus a contrasting inner ring, visible on every interactive element.
- Thin custom scrollbars in admin panes; native elsewhere.
- Admin tables support column resize/visibility and keep a minimum width with horizontal scroll rather than collapsing columns.
- Installed PWA: `display_override: ["window-controls-overlay", "standalone"]` for the admin entry (P2).
- Layout is verified at 125% and 150% scaling.

## 12. Accessibility
- WCAG 2.2 AA. Contrast: 4.5:1 text, 3:1 large text and UI components, including text over glass.
- Visible focus, logical order, skip link, landmarks, `aria-live` for toasts and cart changes.
- Target size ≥ 24 px minimum (WCAG), ≥ 48 px as our standard.
- Colour is never the only signal (status chips carry icon or text).
- Reduced motion, reduced transparency, forced-colors, 200% zoom and 400% reflow supported.
- Dialogs trap focus and restore it; sheets are keyboard-dismissable.
- Images have meaningful alt text in the active language; decorative images are `alt=""`.

## 13. Imagery and performance
- Product images are served as responsive variants (`srcset` + `sizes`), WebP/AVIF, with intrinsic `width`/`height` and a blur-hash or dominant-colour placeholder.
- LCP image on Home and PDP is `fetchpriority="high"`, never lazy; everything else below the fold is lazy.
- Fonts self-hosted and subsetted. Icons imported individually.
- Budgets: see PRD section 5 and `ARCHITECTURE.md` section 9.

## 14. Design deliverables
1. Token file and Storybook (source of truth).
2. Figma (or equivalent) library mirroring tokens and components, if the team uses one.
3. Annotated screens for: Shell, Home, Shop, PDP, Cart, Checkout (4 steps), Success, Tracking, Account, Admin dashboard, Admin orders, Admin product editor, in EN and NE, light and dark, compact and expanded.
4. Empty/error/offline illustration set.
5. Motion spec sheet.
6. Contrast report for every token pair, including text over glass.
