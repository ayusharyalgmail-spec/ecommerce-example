# DESIGN.md

Product design specification. Status: Draft v0.1. Consistent with PRD.md, DATABASE.md, ARCHITECTURE.md.

---

## 1. Design philosophy

- **Flat 2.0:** clean, layered geometric shapes; subtle depth via shadows and color rather than bevels or skeuomorphism.
- **Minimalism:** remove visual clutter; every element has a purpose.
- **Typography-first:** type hierarchy and spacing carry the design.
- **Mobile-first:** optimize for Android phones first; desktop layouts are extensions.
- **Accessibility:** WCAG 2.1 AA compliance; color contrast, keyboard navigation, alt text.
- **Performance:** no unnecessary CSS, SVG animations, or assets. Product images load lazily.
- **Localization:** typography and spacing accommodate Devanagari text without reflow.
- **Offline resilience:** fallback content when offline; no critical features depend on fancy visuals.

---

## 2. Color system

CSS variables (`:root`) are the single source of truth.

### Semantic tokens

```css
:root {
  /* Light mode */
  --color-bg-primary: #ffffff;           /* Page and card backgrounds */
  --color-bg-secondary: #f9fafb;         /* Subtle backgrounds, hover states */
  --color-bg-tertiary: #f3f4f6;          /* Lower-contrast backgrounds */
  --color-bg-interactive: #e5e7eb;       /* Button hover, form focus */
  
  --color-text-primary: #1f2937;         /* Body text, high contrast */
  --color-text-secondary: #6b7280;       /* Secondary text, labels */
  --color-text-tertiary: #9ca3af;        /* Hints, disabled text */
  --color-text-inverse: #ffffff;         /* Text on dark backgrounds */
  
  --color-border: #d1d5db;               /* Dividers, card borders */
  --color-border-subtle: #e5e7eb;        /* Subtle separation */
  
  /* Semantic colors */
  --color-success: #10b981;              /* Delivered, approved */
  --color-info: #3b82f6;                 /* New, loading */
  --color-warning: #f59e0b;              /* Low stock, pending */
  --color-error: #ef4444;                /* Cancelled, rejected, errors */
  
  --color-surface-success: #f0fdf4;      /* Success badges, alerts */
  --color-surface-info: #eff6ff;         /* Info backgrounds */
  --color-surface-warning: #fffbeb;      /* Warning backgrounds */
  --color-surface-error: #fef2f2;        /* Error backgrounds */
  
  --color-accent: #7c3aed;               /* Call-to-action buttons, brand accent */
  --color-accent-light: #f5f3ff;         /* Accent backgrounds */
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg-primary: #1f2937;
    --color-bg-secondary: #111827;
    --color-bg-tertiary: #0f172a;
    --color-bg-interactive: #374151;
    
    --color-text-primary: #f3f4f6;
    --color-text-secondary: #d1d5db;
    --color-text-tertiary: #9ca3af;
    --color-text-inverse: #1f2937;
    
    --color-border: #374151;
    --color-border-subtle: #4b5563;
    
    --color-success: #10b981;
    --color-info: #60a5fa;
    --color-warning: #fbbf24;
    --color-error: #f87171;
    
    --color-surface-success: #064e3b;
    --color-surface-info: #0c2d5c;
    --color-surface-warning: #78350f;
    --color-surface-error: #7f1d1d;
    
    --color-accent: #a78bfa;
    --color-accent-light: #3730a3;
  }
}
```

### Usage

- **Buttons:** backgrounds use `--color-accent` (primary), `--color-border` (secondary). Text uses `--color-text-inverse` on dark backgrounds, `--color-text-primary` on light.
- **Cards:** `background: var(--color-bg-primary); border: 1px solid var(--color-border)`.
- **Status badges:** `.badge-success { background: var(--color-surface-success); color: var(--color-success); }`. Apply to order statuses.
- **Errors:** error boundaries and form validation use `--color-error` for text and `--color-surface-error` for background.

No inline colors. All colors are CSS variables.

---

## 3. Typography

### Font stack

```css
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-nepali: "Noto Sans Devanagari", var(--font-sans);
}

html {
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.5;
}

/* Nepali text */
.nepali, [lang="ne"] {
  font-family: var(--font-nepali);
  line-height: 1.8; /* Extra height for Devanagari */
  letter-spacing: 0.3px;
}
```

**Font loading:** Noto Sans Devanagari is self-hosted in `/public/fonts/` (WOFF2 format, ~120 KB). Load with `font-display: swap` to avoid invisible text while loading.

### Scale

```css
:root {
  --text-xs: 0.75rem;    /* 12px, small labels, timestamps */
  --text-sm: 0.875rem;   /* 14px, secondary text, captions */
  --text-base: 1rem;     /* 16px, body text, regular copy */
  --text-lg: 1.125rem;   /* 18px, small headings, highlights */
  --text-xl: 1.25rem;    /* 20px, section headings */
  --text-2xl: 1.5rem;    /* 24px, page headings */
  --text-3xl: 1.875rem;  /* 30px, hero text */
  
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}

h1 { font-size: var(--text-3xl); font-weight: var(--font-bold); line-height: 1.2; }
h2 { font-size: var(--text-2xl); font-weight: var(--font-semibold); line-height: 1.3; }
h3 { font-size: var(--text-xl); font-weight: var(--font-semibold); }
h4 { font-size: var(--text-lg); font-weight: var(--font-medium); }
p { font-size: var(--text-base); font-weight: var(--font-normal); }
.label { font-size: var(--text-sm); font-weight: var(--font-medium); }
.caption { font-size: var(--text-xs); font-weight: var(--font-normal); color: var(--color-text-secondary); }
```

---

## 4. Spacing scale

```css
:root {
  --space-0: 0;
  --space-1: 0.25rem;    /* 4px, minimal padding */
  --space-2: 0.5rem;     /* 8px, compact */
  --space-3: 0.75rem;    /* 12px */
  --space-4: 1rem;       /* 16px, base unit */
  --space-5: 1.25rem;    /* 20px */
  --space-6: 1.5rem;     /* 24px */
  --space-8: 2rem;       /* 32px */
  --space-10: 2.5rem;    /* 40px */
  --space-12: 3rem;      /* 48px */
  --space-16: 4rem;      /* 64px */
  --space-20: 5rem;      /* 80px */
}
```

- **Padding:** cards use `var(--space-4)` (16px). Form fields use `var(--space-3)` top/bottom, `var(--space-4)` left/right.
- **Margins:** between sections use `var(--space-8)` (32px) on mobile, `var(--space-12)` (48px) on desktop.
- **Gap:** flexbox/grid gaps in product grids use `var(--space-4)`.

---

## 5. Border and shadow

```css
:root {
  --radius-sm: 0.375rem;   /* 6px, buttons, badges */
  --radius-md: 0.5rem;     /* 8px, form fields, small cards */
  --radius-lg: 0.75rem;    /* 12px, larger cards, dialogs */
  --radius-xl: 1rem;       /* 16px, product cards */
  --radius-full: 9999px;   /* Fully rounded (circles, pills) */
  
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15);
  
  --shadow-focus: 0 0 0 3px var(--color-accent-light);
  --shadow-error: 0 0 0 3px var(--color-surface-error);
}

button { border-radius: var(--radius-md); box-shadow: var(--shadow-sm); }
.card { border-radius: var(--radius-lg); box-shadow: var(--shadow-md); }
.product-card { border-radius: var(--radius-xl); box-shadow: var(--shadow-md); }
input:focus { box-shadow: var(--shadow-focus); }
input:invalid { box-shadow: var(--shadow-error); }
```

---

## 6. Interactive elements

### Buttons

**Primary button** (calls to action: "Add to cart", "Checkout", "Confirm order"):
```css
.btn-primary {
  background: var(--color-accent);
  color: var(--color-text-inverse);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  font-size: var(--text-base);
  border: none;
  cursor: pointer;
  transition: background 200ms ease;
}
.btn-primary:hover { background: var(--color-accent) opacity 0.9; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
```

**Secondary button** (less critical: "Cancel", "Skip", "View details"):
```css
.btn-secondary {
  background: transparent;
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 200ms ease;
}
.btn-secondary:hover { background: var(--color-bg-secondary); }
```

**Danger button** (destructive: "Delete", "Cancel order"):
```css
.btn-danger {
  background: var(--color-error);
  color: var(--color-text-inverse);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  cursor: pointer;
}
.btn-danger:hover { background: var(--color-error) opacity 0.9; }
```

### Form controls

**Text input and select:**
```css
input, select, textarea {
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  font-family: var(--font-sans);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  transition: border 200ms ease;
}
input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: var(--shadow-focus);
}
input::placeholder, textarea::placeholder {
  color: var(--color-text-tertiary);
}
```

**Checkbox and radio:**
```css
input[type="checkbox"], input[type="radio"] {
  width: 1.25rem;
  height: 1.25rem;
  accent-color: var(--color-accent);
  cursor: pointer;
}
```

**Phone input:** masked, normalized to E.164 on submit. Validation: `onChange` formats locally; `onBlur` validates server-side.

---

## 7. Cards and containers

### Product card (storefront)

```
┌─────────────────────┐
│   [Image hero]      │ 160px height, cover, aspect ratio maintained
├─────────────────────┤
│ [★★★★★] (3 reviews) │ Inline: stars, count
│ Product Name        │ Heading, truncate to 2 lines
│ Rs. 1,499           │ Price, bold
│ [Discount label]    │ If applicable, background color
│ [Add to cart button] │ Full width, primary
└─────────────────────┘
```

- Width: mobile 100% with 16px gutter; desktop 2-column (350px each) or 3-column depending on viewport.
- Padding inside card: `var(--space-4)`.
- Image aspect ratio: 1:1 (square). Lazy load with `loading="lazy"`.

### Order card (dashboard)

```
┌──────────────────────────────────────────┐
│ Order ORD-123456 | Rs. 2,499             │ Header
│ 5 items | 3 days ago                     │ Secondary
│ Status: [Dispatched] | Next: Delivery    │ Status badge
│ [View details →]                         │ Link
└──────────────────────────────────────────┘
```

---

## 8. Navigation

### Mobile (bottom navigation, fixed)

```
┌─────────────────────────────────┐
│  Content Area                   │
│                                 │
│                                 │
├─────────────────────────────────┤ (safe-area-bottom: padding)
│ 🏠 Home │ 🛒 Shop │ 🛍️ Cart │ 📦 Orders │ 👤 Account
└─────────────────────────────────┘
```

- 5 items: Home, Shop, Cart (with badge count), Orders, Account.
- Height: 60px (touch-friendly).
- Each icon + label centered vertically.
- Active: tinted with accent color.
- Safe area: add `padding-bottom: env(safe-area-inset-bottom)` to the container so it sits above system bars on notched phones.

### Desktop (sidebar)

Storefront: fixed left sidebar on large screens (>1024px) with the same 5 items vertically stacked, plus the store logo at top.

Dashboard: collapsible sidebar with sections (Orders, Products, Customers, Settings) and role-based visibility.

### Header bar

Logo, store name, and (on storefront) a search bar + notification bell.

---

## 9. Product detail layout

Mobile (full-width):
```
[Image carousel: swipe to next]
[★★★★★] 3 reviews | [Share button]
Product Name
Rs. 1,499 [Discount label if any]
"In stock: 5 left" [Low-stock label if <5]
[Add to cart button]
Description
[Read more / less]
Reviews section: [3 approved reviews shown, "View all →"]
Related products: [4 cards grid]
```

Desktop (two-column):
```
[Left] Image carousel (larger)
[Right] Name, price, description, add-to-cart, reviews inline
```

---

## 10. Checkout pages

**Cart page:**
```
┌─────────────────────────────────────────┐
│ Your cart (3 items)                     │
├─────────────────────────────────────────┤
│ [Product 1]  Qty: [- 1 +] Rs. 1,499     │
│ [Product 2]  Qty: [- 1 +] Rs. 2,999     │
├─────────────────────────────────────────┤
│ Subtotal: Rs. 4,498                     │
│ [Coupon code input]  [Apply]            │
│ Total: Rs. 4,498                        │
│ [Proceed to checkout button]             │
└─────────────────────────────────────────┘
```

**Checkout form (1 of 3 steps):**
Step 1: Contact
```
Name: [____________]
Phone: [____________] (placeholder: +977XXXXXXXXXX)
```

Step 2: Delivery address & zone
```
Address: [____________]
Landmark: [____________]
Municipality: [Dropdown]
Delivery zone: [Dropdown]
Delivery fee: Rs. 50
[Proceed button]
```

Step 3: Payment method
```
Payment method:
  [Radio] Cash on delivery
  [Radio] Manual payment
[Place order button]
```

**Order confirmation page:**
```
✓ Order placed!
Order number: ORD-123456
Total: Rs. 4,548
[View tracking →]
Share: [WhatsApp] [Copy link]
"Vendor will call to confirm. Check status anytime via [link]."
[Continue shopping]
```

---

## 11. Dashboard

### Order queue (staff)

```
┌─────────────────────────────────────┐
│ [Filter: Status] [Search: phone]    │ Header
├─────────────────────────────────────┤
│ [Pending confirmation] (2)          │ Group header
│  ORD-001234 | Rs. 3,499 | 9812345   │ Card, clickable
│  ORD-001235 | Rs. 999 | 9812346     │
│ [Confirmed] (5)                     │ Group header
│  ORD-001236 | Rs. 2,499 | 9812347   │
│  ...                                │
└─────────────────────────────────────┘
```

Clicking an order opens a detail view (modal or new page) with:
- Order number, date, total.
- Customer: name, phone, address.
- Items: names, images (small thumbnails), qty, unit price.
- Status timeline.
- [Confirm order] / [Mark processing] / [Mark dispatched] buttons (only if allowed).
- Risk flags (if any).

### Analytics dashboard

```
┌───────────────────────────────────────────────────┐
│ Dashboard | This month                            │
├───────────────────────────────────────────────────┤
│ Total orders: 47          Total sales: Rs. 2,34,900 │
│ Confirmed: 42   Delivered: 38   Avg order: Rs. 4,998 │
├───────────────────────────────────────────────────┤
│ [Sales chart: Rs. by week]                        │
│ [Top products: best-selling products table]       │
│ [Low stock: table of <5 quantity items]           │
└───────────────────────────────────────────────────┘
```

---

## 12. Empty and loading states

**Empty cart:**
```
🛒
Your cart is empty
[Continue shopping]
```

**No products (when filters return nothing):**
```
🔍
No products found
Try adjusting your filters or search
[Clear filters]
```

**Loading product list:**
```
[Skeleton card] [Skeleton card] [Skeleton card]
[Skeleton card] [Skeleton card] [Skeleton card]
```

Skeleton: a placeholder box with a light-gray background and a subtle pulse animation.

**Offline:**
```
⚠️
You're offline
Some features are unavailable. Check your connection.
[Retry]
```

---

## 13. Error states

**Form validation error (inline):**
```
Name: [____________] ❌
      This field is required
```

**Toast / alert:**
```
╭──────────────────────────╮
│ ❌ Order could not be placed │
│    Out of stock (Product 2)   │
│ [Dismiss]                     │
╰──────────────────────────╯
```

**Error page (500):**
```
⚠️
Something went wrong
We're looking into it. Check back soon.
[Contact support]
Ticket: req-12345678
```

---

## 14. Accessibility

- **Color contrast:** text is 4.5:1 on backgrounds (AA standard).
- **Focus indicators:** visible, at least 2px, color from `--shadow-focus`.
- **Form labels:** every input has a visible label or aria-label.
- **Alt text:** every product image has alt text (name + description in the user's language).
- **Keyboard navigation:** all interactive elements are reachable via Tab; modals trap focus.
- **Screen reader:** semantic HTML (`<button>`, `<form>`, `<nav>`); status updates announce via `aria-live`.
- **Text sizing:** base font size is 16px; users can zoom to 200% without content loss.

---

## 15. Mobile breakpoints and responsive rules

```css
:root {
  --breakpoint-xs: 320px;   /* Small phones */
  --breakpoint-sm: 640px;   /* Phones and small tablets */
  --breakpoint-md: 768px;   /* Tablets */
  --breakpoint-lg: 1024px;  /* Desktops */
  --breakpoint-xl: 1280px;  /* Large desktops */
}
```

**Mobile-first rules:**
- Base styles for mobile (full width, single column, bottom nav).
- `@media (min-width: 768px)` for tablet: 2-column layouts, sidebar navigation.
- `@media (min-width: 1024px)` for desktop: 3-column, wider containers.

**Container queries:** if supported, product grid uses `container-query` so it adapts to parent width, not viewport width.

---

## 16. Storefront specific

### Home page (mobile)

```
[Header: store name, logo, notifications bell]
[Search bar]
[Featured products carousel (swipe)]
────────────────────────────────────
[Categories section]
[Category 1] [Category 2] [Category 3]
────────────────────────────────────
[New products section]
[Product card] [Product card]
[Product card] [Product card]
────────────────────────────────────
[Bottom nav: Home | Shop | Cart | Orders | Account]
```

### Shop page (mobile)

```
[Filter: Category dropdown] [Sort: dropdown]
────────────────────────────────────
[Product cards, vertical list]
[Product 1]
[Product 2]
...
[Pagination / Load more]
────────────────────────────────────
[Bottom nav]
```

---

## 17. Admin dashboard specific

### Product upload interface

```
[Product name (EN)]  [Product name (NE)]
[Description (EN)]   [Description (NE)]
[Price input]        [Discount price input]
[Stock quantity]
[Category dropdown]
────────────────────────────────────
Images:
[Camera / file picker button]
[Thumbnail 1] [X] [↑↓ drag to reorder]
[Thumbnail 2] [X]
────────────────────────────────────
[Publish] [Save as draft]
```

### Order management interface

```
Order: ORD-123456
Status: [Pending confirmation ↓]
Customer: Priya | +977-981-234-5678
Items:
  - Product A × 2 : Rs. 1,499 each
  - Product B × 1 : Rs. 999
Total: Rs. 3,997
Delivery fee: Rs. 50
Address: Bhatbari, Kathmandu

[Confirm order (after verification call)]
[Mark processing]
[Mark dispatched]
────────────────────────────────────
Notes (internal):
[Text area]
[Save note]
```

---

## 18. PWA installation behavior

**On install (Android):**
- Browser prompts: "Install [Store name]?" with app icon.
- User taps "Install".
- App is added to home screen (launchable like a native app).
- On launch, `display: standalone` hides browser chrome; app feels native.

**Splash screen:**
- Loading screen shows store logo and "Loading..." while the app boots.

**Updates:**
- Service worker detects a new version.
- Toast appears: "New version available. [Reload]?"
- User taps, and the app reloads.

---

## 19. English and Nepali layouts

**Text direction:** both are left-to-right (no changes needed).

**Line height:** Nepali text uses `line-height: 1.8` (tighter for English, 1.5).

**Letter spacing:** Nepali uses `letter-spacing: 0.3px` to prevent character overlap on some devices.

**Font size:** Nepali text may appear slightly smaller due to glyph heights, so the base size is the same but the rendered size is visually balanced.

**Typography example:**
```nepali
तपाईंको अर्डर पहुँचे भयो
```
is rendered in Noto Sans Devanagari, with the same padding and spacing as English text.

---

## 20. Design tokens export for developers

At build time, design tokens are exported as:

1. **CSS custom properties** (for styling).
2. **TypeScript constants** (for conditional styling in React).
```typescript
export const COLORS = {
  bgPrimary: 'var(--color-bg-primary)',
  textPrimary: 'var(--color-text-primary)',
  // ...
} as const;

export const SPACING = {
  4: 'var(--space-4)',
  8: 'var(--space-8)',
  // ...
} as const;
```

3. **Tailwind config extensions** (if Tailwind is used).
```javascript
theme: {
  colors: {
    'bg-primary': 'var(--color-bg-primary)',
    // ...
  },
  spacing: {
    4: 'var(--space-4)',
    // ...
  }
}
```

---

## 21. Component specifications (UI primitives from shadcn/ui)

Use shadcn/ui for: Button, Input, Select, Dialog, Toast, Badge, Tabs, Dropdown Menu, Form components.

Custom components: Product card, Order card, Navigation (bottom bar and sidebar), Dashboard charts.

---

## 22. Assumptions and open questions

1. **Nepali font loading:** current plan uses Noto Sans Devanagari from Google Fonts. If bandwidth is a concern, evaluate subset loading or system fonts.
2. **Dark mode:** CSS variables support dark mode via `@media (prefers-color-scheme: dark)`. Full dark-mode testing is optional for MVP but included in the design.
3. **Animations:** the spec includes CSS transitions (200ms). More complex animations (Framer Motion) are not assumed; if performance is a concern, simplify or remove.
4. **Chart library:** dashboard analytics use a charting library (for example Recharts). Details are in ARCHITECTURE.md.
5. **Image optimization:** WebP generation and responsive images are built into the upload flow (ARCHITECTURE.md file upload section).
