# Phase 3 report: Discovery, Home, search, shop (20 Oct 2026)

Branch `ux/phase-3`, tag `v0.4.0`. Behind `ui_v2` (`?ui=v2` to preview).

## Summary
- New Home (hero carousel, trust strip, category rail, Deals, New, Best sellers, Recently viewed, empty-catalogue state), ProductCard v2, search with recent searches and suggestions, and Shop with filters (sheet on compact, sidebar from 840 px), removable chips, URL-synced state, load-more on compact and pagination on expanded.
- Migration `banners` + audit triggers + store-assets staff policies applied to the dev project; minimal admin screen at `/admin/storefront` (banners, category pictures).
- `npm run check` passes; initial JS 182.5 kB of 200 kB. Not verified: real devices, Nepali IME typing on a phone, hero LCP on Slow 4G, admin screen with a real staff login.

## What changed
- `supabase/migrations/20261020170000_banners_and_asset_policies.sql` (applied), `DATABASE.md`.
- `src/catalog/`: `data.ts`, `ProductCardV2`, `SearchBox`, `HomeV2`, `ShopV2`, `layout.ts`. `src/pages/admin/Storefront.tsx`, `src/lib/image.ts`.
- `App.tsx`: Home and Shop are now lazy and chosen by the flag. `ProductPage` records recently viewed (local only).
- 8 icons; 70+ strings in en and ne.

## Verification
| Check | Result |
|---|---|
| `npm run check` | typecheck, lint, tests, i18n, contrast, build all pass; budget 182.5/200 kB |
| Browser pane 375 px | Home fallback hero, trust strip, categories, Shop card, filter sheet open and render |
| RLS | banners readable only when active and in window; writes need `settings.manage` |

## Fixed on the way
Heart button was mispositioned (IconButton's `relative` beat `absolute`); search icon overlapped text (legacy unlayered `input` rules beat utilities).

## Risks and open items
- Search is still `ilike`; Nepali works but is unranked (trigram RPC is Phase 5/6 per ARCHITECTURE.md).
- Legacy global `input` styles still win over utilities; v2 code uses inline padding where needed until the legacy CSS is removed.
- No banner artwork exists: the fallback hero shows until the vendor uploads some. The dev store has no banners.
- Product images have no blur-up data yet (Phase 4); cards fade in instead.
- Desktop (1366) and Nepali visuals not eyeballed; hero carousel has no autoplay by design.
- Nepali copy for ~70 strings needs native review.

## Manual tasks
1. Sign in as staff, open `/admin/storefront`, upload a banner and a category picture.
2. Check filters one-handed on a 360 px phone and Nepali typing in search.
3. Native Nepali review of keys: `home.*`, `trust.*`, `shop.*`, `card.*`, `search.*`, `admin.banner*`, `admin.storefront`.
