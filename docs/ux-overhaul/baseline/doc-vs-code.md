# Documents vs code: contradictions found (Phase 0, step 1)

All seven root specs (PRD, ARCHITECTURE, DATABASE, API_SPEC, SECURITY, DESIGN, DECISIONS) and the five `docs/ux-overhaul` documents were read in full, plus `src/`, `public/sw.js`, `index.html`, `package.json`, `vite.config.ts` and the SQL actually applied to Supabase. Rule used: the code is the truth for current behaviour; the ux-overhaul docs are the truth for target behaviour. Nothing was silently resolved; each item says what is true today.

Legend: **S** = security-relevant, **B** = blocks or reshapes a planned phase, **D** = documentation drift only.

## A. Items you asked me to check

| # | Contradiction | Evidence | Class |
|---|---|---|---|
| A1 | The service worker precaches/caches `/_next/static/`, a path Vite never emits (it emits `/assets/`). Hashed JS/CSS are therefore never cached by the SW. | `public/sw.js:62` | B (PW-3) |
| A2 | `DESIGN.md` section 21 (root) says UI primitives come from shadcn/ui. There is no shadcn or Radix dependency. | `package.json`, root `DESIGN.md` section 21 | D (resolved by ADR D-015 proposal) |
| A3 | Docs describe Next.js, App Router, Server Components, Route Handlers, `next-intl`, `@supabase/ssr`, `/api/v1/*` endpoints and an `app/api/worker` route. The code is a Vite SPA, a hand-written i18n context, direct Supabase calls from the browser, and a Node script worker. | Root `DECISIONS.md` D-004 and D-009, `ARCHITECTURE.md` sections 2, 3, 5, 9, 13, `API_SPEC.md` (whole file), `SECURITY.md` section 2 | D (ADR D-014 proposal) |

## B. Additional contradictions found

| # | Contradiction | Evidence | Class |
|---|---|---|---|
| B1 | **Session storage.** SECURITY.md and ARCHITECTURE.md require httpOnly, Secure, SameSite=Strict cookies and say tokens are never placed in `localStorage` (`SECURE-002`). The SPA uses supabase-js with `persistSession: true`, which stores tokens in `localStorage`. This is inherent to a pure SPA with no server. | `src/lib/supabase.ts`, `SECURITY.md` section 2, PRD `SECURE-002` | **S** |
| B2 | **`store_settings` is readable in full by everyone.** DATABASE.md says anon reads a safe column view only. The applied RLS policy is `select using (true)`, so `business_info` (PAN/VAT), `payment_settings`, `max_pending_orders_per_phone`, `unconfirmed_expiry_hours`, `deployed_version` and any future `brand`/`ui_v2` columns are public. The storefront does need name, theme, contact, WhatsApp, payment instructions and policies, but not all columns. | `rls_and_rpc` migration, `DATABASE.md` section 4 | **S** |
| B3 | PRD section 10 (ux-overhaul) lists `store_settings.free_delivery_threshold_paisa` as a new column. It already exists and the checkout uses it. | `core_schema` migration | D |
| B4 | ARCHITECTURE.md (ux) says product images need `width/height/blur_hash` and that the upload "already converts to WebP for payment proofs". Product image upload also already resizes to 1600 px WebP; what is missing is dimensions, placeholders and smaller variants. | `ProductEdit.tsx` `toWebp`, `product_images` table | D |
| B5 | ux-overhaul targets WCAG 2.2 AA. Root PRD and SECURITY target WCAG 2.1 AA. | PRD section 9, ux PRD section 5 | D |
| B6 | Tailwind breakpoints. DESIGN.md (ux) sets `sm 600 / md 840 / lg 1200 / xl 1600`. The app uses Tailwind defaults (`sm 640 / md 768 / lg 1024`) across many pages (`sm:`, `md:`, `lg:` appear throughout). Changing the tokens silently moves layouts. | `src/**/*.tsx`, ux DESIGN section 2.4 | B (Phase 1 audit task) |
| B7 | ARCHITECTURE.md (ux) section 7.6 plans Realtime in admin. Root DECISIONS.md D-017 marks "realtime order updates" as *deferred to Phase 8*. | root `DECISIONS.md` | D |
| B8 | ID collision: root DECISIONS.md already uses **D-014 to D-020** for the deferred questions (SMS/OTP, payment gateway, daily_metrics, realtime, languages beyond en/ne, POS sync, custom domains). ux ARCHITECTURE.md section 15 reuses the same IDs for new ADRs. | root `DECISIONS.md` lines 467-475 | B (decision needed) |
| B9 | Notification delivery. Docs: `pg_cron` calls a Vercel worker route every minute (D-008). Reality: a Node script (`server/worker.mjs`) that must be run by a scheduler; `pg_cron` only runs expiry and purge SQL. `/api/health` and `/api/health/worker` routes do not exist in the SPA. | `server/worker.mjs`, `cron_maintenance` migration | D |
| B10 | Hosting. D-011 says Vercel. The SPA is a static bundle and works on any static host. No host is chosen; PD-7 (share previews) depends on it. | `DECISIONS.md` D-011 | B (PRD decision 1) |
| B11 | PRD `AUTH-006` requires sessions to expire after 24 h idle. supabase-js refreshes tokens indefinitely; no idle timeout is implemented. | `src/lib/supabase.ts` | **S** (low) |
| B12 | The existing PRD and ARCHITECTURE describe a server-side cart (`carts`, `cart_items`, guest token cookie). The shipped cart is localStorage only; tables exist but are unused. | `src/lib/cart.tsx` | D |
| B13 | `package.json` lists `web-push` and `@types/web-push` as production dependencies of the SPA. They are only used by `server/worker.mjs`. Harmless for the bundle (not imported by `src/`) but misleading. | `package.json` | D |
| B14 | ux PRD finding A14 says product images are served from the Supabase origin, so the SW never caches them. Confirmed. It also means the SW `PRIVATE` list and rules in `sw.js` treat `/track`, `/cart` etc. as private, which stays correct for PW-3. | `public/sw.js` | confirms finding |
| B15 | The in-app Browser pane cannot register service workers (tested), so SW behaviour has never been verified in this environment, including push handlers written earlier. | spike | process risk |

## C. ux-overhaul findings verified against code

A1 to A22 in `docs/ux-overhaul/PRD.md` section 3 were spot-checked against `src/`. All checked items match the code (emoji icons, text-glyph stars, no toasts, `Loading` text, native selects, `.btn`/`.card` classes with `!` overrides, `letter-spacing` on `[lang="ne"]`, Google Fonts `<link>`, `useQuery` without cache, single SVG manifest icon, generic `index.html` meta). Counts are in `legacy-classes.md` and `hardcoded-styles.md`. The exceptions are B3 and B4 above.
