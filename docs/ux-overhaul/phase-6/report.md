# Phase 6 report: Account, tracking, PWA (20 Oct 2026)

Branch `ux/phase-6`, tag `v0.8.0`. Behind `ui_v2`. No database change.

## Summary
- Tracking v2: status chips with icons, icon timeline with timestamps, success card after ordering (order number, next steps, copy and share link, install prompt), guided payment-proof card (3 steps), WhatsApp "Ask the vendor". Tracking data is fetched with `gcTime: 0` so private data is not retained.
- Account v2: tiles (wishlist, addresses, track), orders as cards with status chips, **Buy again**, invoice link, cancel, review form on delivered items, notification history.
- PWA: install prompt hook (captured `beforeinstallprompt`, 30-day dismissal), manifest gains `id`, `lang`, `scope`, `description`, shortcuts (Shop, Track, Cart) and a maskable icon entry. Test that the existing service worker deny-list covers all private routes (D-010).
- `npm run check` passes (initial JS 176.3 kB). Not exercised in a browser this phase: tracking page, account page (account needs a signed-in customer), install prompt.

## Deferred (decisions or infrastructure needed)
- **Service worker rebuild with vite-plugin-pwa** (precache, image runtime cache, offline page, update toast, kill switch): the browser pane rejects service workers, so it cannot be tested here, and a faulty SW can break the live site. Left as is (deny-list tested). Recommend doing it with a real device and a staging deploy.
- **PNG 192/512 and maskable PNG icons:** no raster tooling here; manifest still points to the SVG icon. Chrome installs with SVG only on newer versions; supply PNGs per vendor (needs the vendor logo).
- Wishlist and Addresses pages still use the legacy look; wishlist grid and address cards are not rebuilt.
- Push opt-in "moved to the post-order moment": the toggle remains on the tracking page (it already is the post-order screen) and account.
- Per-vendor manifest generation and invoice print re-verification not done.

## Manual tasks
Place an order on v2 and review the success card; install on Android Chrome; native Nepali review of `track.*`, `install.*`, `account.*` additions.
