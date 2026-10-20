# Hard-coded colours, radii and shadows (baseline)

Scan of `src/**/*.{ts,tsx,css}`. Rows counted as **token declarations** are the `--color-*` palette lines in `index.css` (the intended single source of truth). Everything else is a literal that bypasses tokens.

## Colour: 8 literals (34 token declarations excluded)

| Value | Count | Where (first 6) |
|---|---|---|
| `#fff` | 3 | index.css:43, index.css:62, pages/Invoice.tsx:33 |
| `#111` | 3 | pages/Invoice.tsx:33, pages/Invoice.tsx:53, pages/Invoice.tsx:65 |
| `rgba(0,0,0,.06)` | 1 | index.css:44 |
| `#ddd` | 1 | pages/Invoice.tsx:56 |

## Radius: 13 literals (0 token declarations excluded)

| Value | Count | Where (first 6) |
|---|---|---|
| `rounded-lg` | 6 | pages/admin/OrderDetail.tsx:55, pages/admin/OrderDetail.tsx:89, pages/admin/ProductEdit.tsx:101, pages/Cart.tsx:40, pages/Cart.tsx:40, pages/ProductPage.tsx:51 |
| `border-radius:.5rem` | 2 | index.css:37, index.css:50 |
| `border-radius: .5rem` | 1 | index.css:34 |
| `border-radius:.75rem` | 1 | index.css:44 |
| `border-radius:9999px` | 1 | index.css:45 |
| `rounded-t` | 1 | pages/admin/AdminHome.tsx:49 |
| `rounded-xl` | 1 | pages/ProductPage.tsx:45 |

## Shadow: 2 literals (0 token declarations excluded)

| Value | Count | Where (first 6) |
|---|---|---|
| `box-shadow: 0 0 0 3px var(--color-accent-light)` | 1 | index.css:35 |
| `box-shadow:0 1px 3px rgba(0,0,0,.06)` | 1 | index.css:44 |

