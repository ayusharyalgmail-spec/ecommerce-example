# Phase 5 report: Cart and checkout (20 Oct 2026)

Branch `ux/phase-5`, tag `v0.7.0`. Behind `ui_v2`. No database change, no change to RPCs.

## Summary
- Cart v2: 96 px images, 48 px steppers, remove with Undo, stock and quantity conflicts explained in place with a "Fix automatically" action, free-delivery progress from `free_delivery_threshold_paisa`, sticky summary (expanded) or glass summary bar (compact).
- Checkout v2: four steps (Contact, Delivery, Payment, Review) with native per-step validation, saved addresses and delivery zones as cards (fee shown), payment cards with the vendor's manual-payment instructions, Review with edit links, coupon, prominent price-changed warning, sticky glass total bar, draft kept in sessionStorage so a refresh keeps input.
- Security-relevant logic was copied unchanged: `quoteCheckout`, `lastTotal` price-change check, idempotency key (rotated on every failure except `IDEMPOTENCY_CONFLICT`), `placeOrder`. A `busy` guard prevents double submit. `npm run check` passes, initial JS 178.8 kB. Browser pane (375 px): cart, step 1 to step 2 transition and totals (1,299 + 100 delivery = 1,399) verified. **I did not place an order through v2**, so the final submit, error mapping on the Review step and the success hand-off to `/track` are untested in the browser.

## Deviations from PHASES.md
- No react-hook-form/zod: native constraint validation per step (saves about 30 kB; same rules as v1: name 2+, phone `^(\+?977)?9\d{9}$`, address 3+).
- Success screen, install prompt and notification opt-in live in Phase 6 (they belong to `/track?new=1`).
- Coupon is applied on the Review step, not the cart (quotes need a zone).
- Usability test with 5 shoppers and the offline-submit regression test: not run.

## Risks and manual tasks
- Place a COD order and a manual-payment order on v2; try a stale price (change a product price in admin mid-checkout), an out-of-stock item, a bad coupon, a double tap, and airplane mode on submit.
- Nepali copy for `cart.*`, `checkout.*` additions needs native review.
