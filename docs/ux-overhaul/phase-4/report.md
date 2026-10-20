# Phase 4 report: Product detail and media (20 Oct 2026)

Branch `ux/phase-4`, tag `v0.5.0`. Behind `ui_v2`.

## Summary
- New product page: swipeable gallery with working thumbnails, position status, zoom lightbox (arrow keys), breadcrumbs, price and stock block, inline buy box on 840 px and wider, sticky glass buy bar on compact, rating summary with distribution, Web Share with WhatsApp fallback, "Ask on WhatsApp", related products.
- Migration: `product_images.width/height/blur_color` (applied); admin upload now records them.
- `npm run check` passes; initial JS 180.3 kB of 200 kB. Verified at 375 px in the browser pane only (dev product has no photo).

## Deferred (need your input or infrastructure)
- **Share previews** (edge function for crawlers, og tags, JSON-LD, sitemap): needs a deployed edge function and a production domain. Not done; deploying is outward-facing.
- **Responsive srcset / image transforms:** Supabase image transformations are a paid-plan feature; not assumed. Cards and gallery use explicit width/height and a colour placeholder instead. **Blur hash** was replaced by an average colour (no library needed).
- **Backfill of existing images:** none exist on the dev store; a backfill script is not written.
- Delivery ETA by zone (needs new zone columns), pinch-zoom (uses native browser pinch inside the lightbox), 5-shopper usability test.
- Legacy page still uses the old gallery; the thumbnail bug is fixed in v2 only.

## Manual tasks
Upload product photos in admin and check the gallery on a phone; native Nepali review of `pdp.*`.
