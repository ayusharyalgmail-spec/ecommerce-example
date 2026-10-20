# Legacy classes and `!` utilities (baseline)

These are re-mapped to tokens in Phase 1 and replaced by `src/ui` primitives afterwards. A lint rule forbids new uses after Phase 2.

## `!` important utilities: 20 uses in 10 files

| Utility | Count | Files |
|---|---|---|
| `!py-1` | 11 | components/Chrome.tsx, pages/Account.tsx, pages/Addresses.tsx, pages/admin/AdminLayout.tsx, pages/admin/OrderDetail.tsx |
| `!px-4` | 2 | pages/admin/Coupons.tsx, pages/admin/Staff.tsx |
| `!px-3` | 2 | pages/Cart.tsx |
| `!py-3` | 1 | components/Chrome.tsx |
| `!min-h-0` | 1 | components/Chrome.tsx |
| `!w-20` | 1 | components/Product.tsx |
| `!p-0` | 1 | components/Product.tsx |
| `!w-32` | 1 | pages/admin/OrderDetail.tsx |

## Legacy component classes (defined in `index.css`)

| Class | Uses | Files |
|---|---|---|
| `.btn` | 56 | 25 |
| `.field` | 56 | 8 |
| `.muted` | 55 | 24 |
| `.card` | 47 | 20 |
| `.btn-secondary` | 32 | 17 |
| `.badge` | 28 | 16 |
| `.btn-primary` | 24 | 18 |
| `.container-page` | 21 | 16 |
| `.badge-ok` | 11 | 9 |
| `.badge-err` | 8 | 8 |
| `.badge-info` | 6 | 5 |
| `.badge-warn` | 6 | 6 |
| `.no-print` | 4 | 2 |
| `.alert` | 3 | 2 |
| `.btn-danger` | 2 | 1 |

### Heaviest files (legacy class uses)

| File | Uses |
|---|---|
| `pages/admin/OrderDetail.tsx` | 34 |
| `pages/admin/ProductEdit.tsx` | 24 |
| `pages/Account.tsx` | 22 |
| `pages/Cart.tsx` | 21 |
| `pages/Checkout.tsx` | 21 |
| `pages/ProductPage.tsx` | 21 |
| `pages/Addresses.tsx` | 18 |
| `pages/Track.tsx` | 18 |
| `pages/admin/Settings.tsx` | 17 |
| `pages/admin/Coupons.tsx` | 16 |
| `pages/Login.tsx` | 13 |
| `pages/admin/Staff.tsx` | 13 |

## Other audit drivers

| Check | Count |
|---|---|
| Emoji used as icons or image placeholders | 0 |
| Text-glyph hearts (♥ ♡) | 0 |
| Text-glyph stars (★ ☆) | 0 |
| letter-spacing rules | 2 |
| "Loading" text placeholders (common.loading) | 2 |
| Native select elements | 13 |
| window.print() calls | 1 |
