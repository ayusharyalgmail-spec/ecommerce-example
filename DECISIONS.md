# DECISIONS.md

Architecture Decision Record. Status: Draft v0.1.

---

## D-001: One Supabase project per vendor

**Status:** Decided (Q1=A, your choice).

**Context:**
- You need to manage 5–50 vendor deployments from one codebase.
- Vendors expect strong data isolation (customer data, sales records).
- Supabase offers free tier (limit 2 projects, auto-pause after 7 days) and paid tier ($25/month per org, ~$10 per additional project).

**Options:**
1. One shared Supabase project for all vendors, with `store_id` column on every table.
2. One Supabase project per vendor (separate database, auth, storage).
3. Per-vendor Postgres schemas in a shared project.

**Decision:** Option 2 (one project per vendor).

**Rationale:**
- Strong isolation: a bug or breach in vendor A's code does not touch vendor B's data.
- Simple restores: restoring one vendor's backup does not risk others.
- Simple backup story: each vendor's backups are independent.
- Simpler permission model: RLS enforces cross-vendor isolation at the database layer.
- Operator break-glass is safer: limited to one vendor at a time.

**Consequences:**
- Higher cost: each vendor adds Supabase base fee ($25/month) plus compute.
- More moving parts: release script must migrate and deploy each vendor.
- N times the maintenance overhead (backups, upgrades, monitoring).

**Trade-off accepted:** the cost is justified by data isolation and the operator's ability to manage deployments independently.

**Revisit condition:** if cost becomes prohibitive (>50 vendors) or backup/restore becomes a bottleneck, revisit for a shared project with strong RLS.

---

## D-002: PostgreSQL on Supabase

**Status:** Decided (Q1=A, your preference for Supabase).

**Context:**
- Need a reliable relational database with transactions and RLS.
- PostgreSQL is open-source, well-tested, and battle-proven.
- Supabase provides managed Postgres with built-in auth, storage, and serverless functions.

**Options:**
1. Supabase (managed Postgres, Auth, Storage, Realtime, Edge Functions).
2. Self-managed Postgres on a VPS.
3. AWS RDS + Lambda + S3.
4. Firebase (no-SQL, limited transactions).

**Decision:** Supabase.

**Rationale:**
- Zero ops: managed backups, scaling, replication.
- Row-level security (RLS) built in.
- Supabase Auth integrates with the same database.
- Storage and edge functions (future extensions).
- Pricing is predictable and low for this scale.

**Consequences:**
- Vendor lock-in to Supabase (but PostgreSQL is portable).
- Pricing increases with storage and egress (verify at each vendor go-live).
- Limited control over infrastructure (for example, custom indexes).

**Revisit condition:** if Supabase pricing changes significantly or a vendor needs custom infrastructure (e.g., for compliance), evaluate self-managed Postgres.

---

## D-003: Supabase client + RLS + SQL migrations + RPC functions (no Prisma)

**Status:** Decided (Q3=A, your choice to use RLS-first approach).

**Context:**
- You need server-side authorization that can't be bypassed by the app.
- Prisma uses a privileged database role that bypasses RLS.
- Using both RLS and Prisma means two security models (hard to reason about, easier to bypass).

**Options:**
1. Prisma for all data access (ignore RLS or use it only as backup).
2. Supabase client with RLS as the primary control; no Prisma.
3. Mixed: Prisma for some, Supabase client for others (too confusing).

**Decision:** Option 2 (Supabase client + RLS + RPC + SQL migrations).

**Rationale:**
- Single security model: RLS is the truth.
- Transactions are atomic: checkout, status changes, and coupon redemptions are single Postgres transactions (RPC functions).
- Testable: RLS policies can be tested in isolation.
- Type safety: generated TypeScript types from the schema.
- Auditable: all sensitive operations go through RPC, which are easy to audit.

**Consequences:**
- Less ergonomic migrations: SQL migrations are powerful but require more manual work than Prisma's `prisma migrate`.
- Business logic is split between TypeScript (service layer) and SQL (RPC functions).
- Need SQL expertise to write complex RPC functions.

**Trade-off accepted:** the security and consistency benefits outweigh the learning curve.

**Mitigation:**
- Provide RPC function templates and examples.
- Document the checkout and status-transition RPCs thoroughly.
- Test RPC functions separately from the app layer.

**Revisit condition:** if the split between TS and SQL becomes too much cognitive load, revisit using Prisma with careful permission enforcement in the service layer (not as secure, but simpler).

---

## D-004: Next.js as the application and API layer

**Status:** Decided (your preference; Q2 context suggests Next.js).

**Context:**
- You need a full-stack framework for server-side rendering, API routes, and static generation.
- Next.js with the App Router is modern, stable, and widely adopted.
- Server Components reduce the amount of JavaScript sent to the browser.

**Options:**
1. Next.js (App Router, Server Components, Route Handlers).
2. Next.js (Pages Router, older API routes).
3. Separate backend (Express, NestJS) + frontend (React SPA).
4. Django/Python backend + React frontend.

**Decision:** Next.js App Router.

**Rationale:**
- One codebase for server and client.
- Server Components by default reduce JavaScript.
- API routes are co-located with features.
- Streaming and progressive rendering out of the box.
- Static generation (next.js) for public pages.
- Vercel's first-class support and optimizations.

**Consequences:**
- Next.js is evolving rapidly; App Router is newer than Pages Router.
- One developer needs to understand both server and client patterns.

**Revisit condition:** if deployment constraints require a different runtime (for example, non-Vercel host), separate backend/frontend might be necessary.

---

## D-005: Google OAuth + guest checkout with token tracking

**Status:** Decided (Q5=A, your choice).

**Context:**
- Customers are diverse: some tech-savvy, some not. Many are on mobile.
- Simple logins reduce friction. Many Nepal customers may not want Google login, but it's the MVP starting point.
- Guest checkout must be secure (no account needed).

**Options:**
1. Google OAuth only, no guest checkout.
2. Email/password + Google OAuth + guest checkout.
3. Phone OTP + guest checkout (needs SMS provider, cost, latency).
4. Google OAuth + guest checkout (MVP start), add SMS/OTP later.

**Decision:** Option 4 (Google OAuth + guest checkout for MVP, SMS later if needed).

**Rationale:**
- Google OAuth reduces friction for returning customers.
- Guest checkout allows customers without a Google account to shop.
- Token-based tracking is secure (unguessable token + order number + phone verification).
- MVP is clean; SMS is an enhancement if analytics show demand.

**Consequences:**
- Some customers may bounce if they don't have a Google account and don't want one. Mitigated by guest checkout.
- SMS is not available initially (affects fraud prevention, OTP verification).

**Revisit condition:** if vendors report low conversion due to Google-only login, add SMS OTP in Phase X.

---

## D-006: Inventory reservation (reserve at placement, release on cancel/reject/expire)

**Status:** Decided (Q7=A, your choice).

**Context:**
- Inventory can sell out fast. Overselling hurts vendors (unfulfillable orders).
- Manual phone confirmation means some orders may stay pending for hours.
- Unconfirmed orders should not lock inventory forever.

**Options:**
1. Reserve at placement; release on cancel/reject/expiry (after 24 hours).
2. Reserve at confirmation only (high risk of sell-out between placement and confirmation).
3. No reservation; decrement at dispatch (high risk of overselling).
4. No reservation; rely on heuristics (fragile).

**Decision:** Option 1 (reserve at placement, auto-release after 24 hours).

**Rationale:**
- Protects vendors from overselling.
- Honest stock display (available = stock - reserved).
- Atomic reservation in one SQL statement prevents race conditions.
- Auto-release prevents stale reservations from locked inventory.
- Customer experience: stock is held while they check out.

**Consequences:**
- Customers see a changing available count if reservations expire or are released. This is honest, not a bug.
- Vendors must confirm orders within 24 hours or they auto-cancel.

**Mitigation:**
- 24 hours is a reasonable default; vendor can configure it in `store_settings`.
- Vendor gets a notification of pending orders, reminding them to confirm.

**Revisit condition:** if vendors report that 24 hours is too short, increase it (36 or 48 hours). Too long hurts repeat sales.

---

## D-007: Manual payments (vendor verification), gateway later

**Status:** Decided (Q8=A, your choice).

**Context:**
- Payment gateways (eSewa, Khalti) have integration overhead and transaction fees.
- Many Nepal vendors prefer cash or bank transfer.
- No MVP need for real-time gateway integration.

**Options:**
1. Manual instructions only; vendor marks payment verified manually.
2. Integrate eSewa/Khalti gateway (complex, vendor setup required).
3. Combination: manual + gateway (scope creep, too much for MVP).

**Decision:** Option 1 (manual, with option to extend later).

**Rationale:**
- Simple: vendor sets instructions (bank account, QR, eSewa, etc.) in settings.
- Customer uploads a receipt screenshot.
- Vendor reviews the screenshot and approves or rejects (with a note).
- No transaction fees or gateway integration.
- Easy to extend: add a payment-provider adapter layer later.

**Consequences:**
- Higher vendor workload (manual verification).
- Longer payment confirmation time.
- No chargeback protection or dispute resolution (vendor's responsibility).

**Mitigation:**
- Vendor handbook clearly explains the manual process.
- Future phases can add gateways behind a provider-agnostic interface.

**Revisit condition:** if vendors report high chargeback rates or manual verification becomes a bottleneck, integrate eSewa/Khalti in Phase X. The database schema is designed to support it.

---

## D-008: Notification outbox + pg_cron + pg_net (scheduled worker)

**Status:** Decided (Q4=A, your choice).

**Context:**
- Notifications must be reliable (no loss of events).
- Web Push is asynchronous; retries and failure handling are complex.
- Running a separate notification service adds operational overhead.

**Options:**
1. Immediate push (try once, no retries).
2. Outbox table + scheduled job (pg_cron/pg_net, or external scheduler).
3. Message queue (Redis, SQS) + separate worker.
4. Serverless queue (Google Pub/Sub, AWS SQS).

**Decision:** Option 2 (outbox table + pg_cron/pg_net, or external scheduler as fallback).

**Rationale:**
- Durable: events are stored in a table, processed atomically.
- Simple: no separate service. Cron is built into Postgres.
- Scalable: batching and rate limiting are easy.
- Monitorable: query the outbox table to see pending, failed, and dead events.
- Cost: minimal (no extra infrastructure).

**Consequences:**
- Notification latency: up to ~1 minute (cron checks every minute). This is acceptable for order statuses.
- Depends on `pg_cron` and `pg_net` availability (to be verified in Phase 6).
- If Vercel Hobby is used for the demo, pg_cron is not available; fallback to an external scheduler hitting the worker route.

**Mitigation:**
- Document the notification delay in the vendor handbook.
- Provide an external scheduler (e.g., crontap.com) as a backup if pg_cron is unavailable.
- Monitor the oldest pending event; alert if it exceeds 5 minutes.

**Revisit condition:** if `pg_cron` is unavailable on the chosen Supabase plan, use an external scheduler (Vercel Cron Pro, crontap, or EasyCron).

---

## D-009: next-intl for internationalization

**Status:** Decided (your preference for a stable i18n library).

**Context:**
- App must support English and Nepali.
- No hardcoded strings in components.
- Translations must be reviewable and maintainable.

**Options:**
1. next-intl (Next.js plugin, routing, message catalogs).
2. react-i18next (React library, flexible).
3. Tolgee (SaaS translation platform).
4. Manual JSON files + a simple hook.

**Decision:** next-intl (or equivalent stable library; exact choice deferred to Phase 2).

**Rationale:**
- Built for Next.js App Router.
- Supports nested messages, pluralization, formatting.
- Can integrate with Vercel locale prefix routing (optional).
- Large community, good documentation.

**Consequences:**
- Learning curve for the library.
- Translation files must be kept in sync.

**Mitigation:**
- Use a simple message structure (nested JSON, keyed by feature).
- Automate translation testing (keys present in all locales).

**Revisit condition:** if next-intl is not compatible with the chosen Next.js version, switch to an alternative with similar features.

---

## D-010: Installable PWA with restricted caching

**Status:** Decided (your preference for PWA).

**Context:**
- Storefront must work on Android phones with slow networks.
- PWA reduces dependency on app stores.
- Caching must not hide sensitive data.

**Options:**
1. No PWA, responsive web only.
2. Installable PWA with service worker.
3. Full offline-first app (complex, out of scope).

**Decision:** Option 2 (installable PWA, selective caching).

**Rationale:**
- Android home screen icon improves repeat visits.
- Service worker caches static assets (fast loads).
- Offline shell (empty page) shows graceful degradation.
- Push notifications are easier with a PWA.

**Consequences:**
- Service worker bugs are hard to debug (caching side effects).
- Need a clear cache invalidation strategy.

**Mitigation:**
- Never cache private data (`/account`, `/checkout`, API responses with auth cookies).
- Implement a version-check on app startup; prompt user to refresh if a new version is deployed.
- Test service worker on real devices (Lighthouse PWA audit).

**Revisit condition:** if Android users report significant caching issues, simplify or remove the PWA. Responsive web-only is a fallback.

---

## D-011: Vercel for hosting (with Render as documented alternative)

**Status:** Decided (Q2=B; you chose free for demo, paid at go-live).

**Context:**
- You need simple deployment, no ops overhead, and cost-effectiveness.
- Vercel integrates with Next.js and Git.
- Vercel's Hobby plan is free but limited to non-commercial use.
- Vercel Pro is $20/user/month, with higher limits and commercial rights.

**Options:**
1. Vercel (Hobby for demo, Pro for production).
2. Render (pay-as-you-go, auto-scaling, ~$7/month base).
3. Self-managed VPS (Digital Ocean, Linode).
4. AWS Lambda + API Gateway + RDS.

**Decision:** Option 1 (Vercel, with Render as a documented alternative).

**Rationale:**
- Vercel Hobby is free and sufficient for a demo.
- Vercel Pro supports commercial use and per-user billing.
- Git deployments are automatic.
- Zero ops: database handled by Supabase, app by Vercel.
- Good developer experience (local development, preview deployments).

**Consequences:**
- Cost: $20/user/month on Pro, plus usage overages. At 5–50 vendors, total hosting cost is significant.
- Vendor lock-in to Vercel (mitigated by Next.js being framework-agnostic).
- Cron jobs limited to daily on Hobby, minute-level on Pro (documented in D-008).

**Mitigation:**
- Release script checks that all vendors are on a paid plan (no Hobby in production).
- Document Render as an alternative for users who prefer pay-as-you-go pricing.

**Revisit condition:** if Vercel pricing becomes prohibitive, switch to Render or a self-managed VPS. The Next.js app is portable.

---

## D-012: Operator break-glass access (time-limited, logged)

**Status:** Decided (Q9=A, your choice to avoid standing access).

**Context:**
- You (the operator) need to support vendors (restore data, debug issues).
- Vendors expect their customer data to be private; you should not browse it casually.
- Audit trails build trust.

**Options:**
1. No operator access (impossible; you manage the infrastructure).
2. Standing access (operator is admin everywhere; risky).
3. Break-glass (time-limited, logged, audited).

**Decision:** Option 3 (break-glass).

**Rationale:**
- Protects vendor trust: you can't accidentally (or deliberately) browse customer data.
- Audited: every access is logged with reason and duration.
- Transparent: vendor can see when break-glass was used.
- Bounded: credentials expire after 1–4 hours.

**Consequences:**
- Slightly slower support (need to initiate a session vs. logging in).
- Requires a secrets manager and a well-documented procedure.

**Mitigation:**
- Automate the break-glass script so support is still fast.
- Rotate service-role credentials monthly.
- Weekly audit review to catch abuse.

**Revisit condition:** if break-glass becomes a bottleneck, consider a tiers-of-support model (level 1 = user support, level 2 = require break-glass).

---

## D-013: Semantic versioning + scripted per-vendor deployments

**Status:** Decided (Q12=A, your choice).

**Context:**
- You need to deploy updates to 5–50 vendors with confidence.
- Upgrading vendors one-by-one is safer than all-at-once.
- Rollbacks must be possible if a vendor reports issues.

**Options:**
1. Manual per-vendor deployment (slow, error-prone).
2. Automated all-vendors-at-once (fast, risky; one bad release breaks everyone).
3. Scripted per-vendor, sequential, with staging check first.

**Decision:** Option 3 (scripted sequential rollout with staging).

**Rationale:**
- Safer: if vendor A deployment fails, vendors B–Z are not touched.
- Faster: script handles migration + deploy + health checks.
- Staged: deploy to staging first, verify, then roll out to vendors.
- Rollback: record deployed version; revert if needed.

**Consequences:**
- Release takes longer (5 vendors × ~5 min each = 25 min).
- Release script is critical; bugs in the script affect all vendors.

**Mitigation:**
- Release script is well-tested and code-reviewed.
- Document the rollback procedure and test it monthly.
- Implement health checks in the script (database reachable, app responds, migrations pass).

**Revisit condition:** if releases are too slow at 50+ vendors, implement a rolling deployment with a progress tracker and parallel stages.

---

## Open design questions (deferred)

| ID | Decision | Status | Impact |
|---|---|---|---|
| D-014 | SMS/OTP for customer verification | Deferred to Phase X | Fraud prevention, customer experience |
| D-015 | Payment gateway integration (eSewa/Khalti) | Deferred to Phase X | Vendor revenue, transaction fees |
| D-016 | Separate `daily_metrics` table vs. RPC views | Deferred to Phase 7 | Reporting performance |
| D-017 | Realtime order updates (WebSocket vs. polling) | Deferred to Phase 8 | Vendor experience |
| D-018 | Multi-language support beyond English/Nepali | Deferred to Phase X | Broader market |
| D-019 | Inventory sync with offline POS | Deferred to Phase X | Complex, low priority |
| D-020 | Custom vendor domains | Deferred to Phase X | Vendor branding |

---

Each decision includes:
- **Status:** Decided, Deferred, or Revisit-Needed.
- **Context:** business and technical factors.
- **Options:** alternatives considered.
- **Decision:** chosen option.
- **Rationale:** why this option.
- **Consequences:** trade-offs.
- **Mitigation:** how to reduce downsides.
- **Revisit condition:** when to reconsider.

Decisions are revisited quarterly or when new information arises.

---

# UX overhaul ("Bazaar Glass"): proposed ADRs

Status of every entry below: **Proposed** (drafted in Phase 0, 20 Oct 2026, awaiting approval).

**ID note.** `docs/ux-overhaul/ARCHITECTURE.md` section 15 names these decisions D-014 to D-020, but those IDs are already used above for the deferred questions (SMS/OTP, payment gateway, `daily_metrics`, realtime, languages, POS sync, custom domains). To avoid a silent collision they are written here as **UX-D014 to UX-D020**. Recommended: renumber to **D-021 to D-027** on approval and update the ux documents. Related existing item: root D-017 (realtime, deferred) overlaps requirement AD-6 and should be marked superseded when Phase 7 starts.

---

## UX-D014: Frontend is a Vite single-page app (Next.js text is superseded)

**Status:** Proposed. Supersedes D-004 and D-009 as written.

**Context:** The code is React 19 + Vite 8 + React Router 7, hand-written i18n, direct Supabase calls under RLS and RPC, and a Node push worker. D-004 (Next.js App Router), D-009 (next-intl), and large parts of ARCHITECTURE.md, API_SPEC.md and SECURITY.md describe a Next.js server that does not exist.

**Options:** (1) Keep the SPA and fix the documents. (2) Migrate back to Next.js. (3) Keep the SPA and add one small edge function for crawlers.

**Decision:** Option 3. Mark D-004 and D-009 superseded; add a "current architecture" section; mark `API_SPEC.md` as the logical contract (RPC and table access), not HTTP routes.

**Consequences:** Session tokens live in `localStorage` (contradicts SECURITY.md `SECURE-002`); there is no server to set cookies, CSRF tokens or edge caching; SEO and link previews need the UX-D019 function.

**Mitigation:** Document the `localStorage` session trade-off explicitly in SECURITY.md with compensating controls (strict CSP, no `dangerouslySetInnerHTML`, short token life, RLS on everything).

**Revisit:** If a vendor requires server-set cookies, or SEO outweighs simplicity.

---

## UX-D015: Radix primitives + Tailwind tokens + local `src/ui` library

**Status:** Proposed. Supersedes the shadcn/ui statement in root DESIGN.md section 21.

**Context:** No shadcn or Radix dependency exists. The spike (`docs/ux-overhaul/baseline/library-spike.md`) confirms Radix 1.x, Vaul 1.1, Sonner 2, Embla 8 and Lucide 1 all work with React 19 and Vite 8.

**Options:** (1) Radix + local components. (2) A themed kit (MUI, Chakra). (3) Keep hand-rolled `.btn/.card` classes.

**Decision:** Option 1, with overlays and carousels loaded on demand.

**Rationale:** Accessible behaviour without a visual opinion; fits the glass/flat language.

**Consequences:** Measured cost: Radix (6 primitives) about 58 kB gzip, Vaul 11.5, Sonner 11.6, Embla 11.5 when loaded eagerly, against 24 kB of entry headroom today. **Overlays and carousels must not be in the entry chunk.**

**Mitigation:** Dynamic `import()` per overlay; `size-limit` gate; `tailwind-merge` (11 kB) kept inside `src/ui` or dropped.

**Revisit:** If entry cost cannot be held under 200 kB gzip.

---

## UX-D016: TanStack Query replaces the custom `useQuery`

**Status:** Proposed.

**Context:** `lib/useQuery.ts` has no cache, de-duplication or revalidation (audit A20). Spike: TanStack Query 5.104 works and reads Supabase fine; cost 19.5 kB gzip.

**Decision:** Adopt it behind a shim so pages migrate one by one. Checkout stays a single idempotent RPC with no optimistic UI.

**Consequences:** +19.5 kB gzip in the entry unless the data layer is loaded per route.

**Revisit:** If the entry budget cannot absorb it; fallback is a 60-line cache inside `useQuery`.

---

## UX-D017: Glass only on floating surfaces, with mandatory fallbacks and effect tiers

**Status:** Proposed (needs contrast amendments, see below).

**Decision:** Per ux DESIGN.md section 3: glass on header, bottom nav, sheets, dialogs, toasts, sticky bars and small image chips only; at most 3 visible; no animated blur; fallbacks for no `backdrop-filter`, reduced transparency, forced colours and `data-fx="lite"`.

**Amendment found in Phase 0:** The specified glass tint fails contrast: `--text-muted` fails on 6 of 12 theme/backdrop combinations and `--ink` fails in dark mode over a white photo (3.77:1). Required: dark glass alpha at least 0.64, light glass 0.84 if any muted text sits on glass, otherwise ink-only on glass (`docs/ux-overhaul/baseline/contrast.md`).

**Revisit:** After on-device glass profiling in Phase 1.

---

## UX-D018: Service worker rebuilt with Workbox (`injectManifest`); D-010 rules preserved

**Status:** Proposed.

**Context:** `public/sw.js` caches `/_next/static/` (never produced by Vite) and skips cross-origin images. `vite-plugin-pwa` 2.0 accepts Vite 8 and generated a working precache list in the spike; runtime registration could not be tested in the in-app browser.

**Decision:** Replace with `injectManifest`, keep custom push and notification-click handlers, precache `/assets/*`, runtime-cache Supabase public product images (stale-while-revalidate, expiry), never cache API, auth, account, admin, checkout, track, cart or orders. Remove the legacy `public/sw.js`. Add a test that private routes are never cached.

**Consequences:** Needs a real-Chrome verification pass (Android and Windows) before release; update toast and a kill-switch are required.

**Revisit:** If SW staleness incidents occur.

---

## UX-D019: Edge function for share previews (read-only, public data)

**Status:** Proposed, **blocked on the hosting decision** (PRD section 12, item 1).

**Decision:** A crawler-only function returns `og:*` tags and JSON-LD for `/product/:slug` from public columns using the anon key; browsers get the SPA unchanged. Implementation depends on the host (Vercel middleware, or a Supabase Edge Function behind a host rewrite or Cloudflare Worker).

**Risks:** New server surface; keep it read-only, allow-listed fields, rate-limited.

---

## UX-D020: `ui_v2` flag and strangler migration

**Status:** Proposed.

**Decision:** Add `store_settings.ui_v2 boolean default false` (additive migration), map legacy classes to new tokens first, build `src/ui` alongside, migrate pages in `PHASES.md` order, delete legacy classes and the flag after one stable release.

**Phase 0 finding:** `store_settings` is currently readable in full by anon (policy `using (true)`), which contradicts DATABASE.md ("safe column view only"). Before adding `brand` and `ui_v2`, replace direct table reads with a public view or RPC exposing only intended columns, and keep `business_info` PAN/VAT out of anon reads (the invoice reads it as the signed-in owner of the order).

**Consequences:** Two style systems coexist for roughly 5 months; the class-hygiene lint rule (after Phase 2) limits drift.

---

## UX ADR amendments from Phase 1 (20 Oct 2026, still Proposed)

- **UX-D015:** Overlay libraries are lazy chunks, confirmed by build: Sheet (Vaul) 9.0 kB, Toaster (Sonner) 9.7 kB, Tooltip 3.3 kB, Popover 2.1 kB, Dialog 0.7 kB gzip, none in the entry. `tailwind-merge` is **not** adopted. `motion` is **not** adopted for Phase 1: motion is CSS (transform and opacity); `motion/mini` (about 10 kB) stays the fallback if a spring is needed. This amends ux ARCHITECTURE.md section 4 (which lists `LazyMotion` `motion`, about 78 kB gzip measured).
- **UX-D016:** TanStack Query is live behind the `useQuery` shim (+19.5 kB gzip in the entry). Shared keys exist for categories and store settings.
- **UX-D017:** Glass alpha raised after the contrast review: light `.84`, dark `.72`; text on glass is ink only. `scripts/contrast.mjs` (74 checks) is the gate.
- **UX-D020:** The rollout flag column and `BrandLoader` exist, but the token re-map itself is global (no per-vendor switch), because no production vendor is live yet. From Phase 2 on, new shell and page layouts are gated by `data-ui="v2"`.
- **Budget gate:** `size-limit` is replaced by `scripts/check-budget.mjs`, because the bundler splits the initial JS across several chunks and the real budget is "everything index.html loads". Initial JS is **190.7 kB gzip of 200 kB (95%)**.

---

## UX-D021: Supabase Realtime is stubbed out of the storefront bundle

**Status:** Proposed (Phase 2, 20 Oct 2026).

**Context:** `@supabase/supabase-js` 2.118 always constructs a `RealtimeClient`, so `realtime-js` and `phoenix` (about 16 kB gzip measured) ship in the entry although the storefront never opens a socket. After Phase 2 the shell brought the initial JS to 196.3 kB of the 200 kB budget.

**Decision:** `vite.config.ts` aliases `@supabase/realtime-js` to `src/lib/realtime-stub.ts`, which implements only the calls supabase-js makes (`setAuth`, `channel`, `getChannels`, `removeChannel`, `removeAllChannels`). `channel()` throws a clear error. The real package stays reachable through the `realtime-real` alias for the admin live-orders toast (AD-6, Phase 7), which must load it from a lazy admin chunk.

**Result:** initial JS 196.3 kB to 180.1 kB (90% of budget). Auth, queries, RPC and Storage verified unchanged in the browser.

**Risks:** A supabase-js upgrade could call a new Realtime method (the stub would throw or no-op); mitigated by the `npm run build` and unit/e2e checks and by pinning supabase-js minor versions. Phase 7 must not use `supabase.channel()` from the shared client.

**Revisit:** If supabase-js makes Realtime lazy or optional.

---

## UX-D022: The vendor directory is a separate control-plane app with its own database

**Status:** Accepted by the owner (24 Oct 2026). Implements D-001 for the directory.

**Context:** `multi_tenant_platform` put `tenants`, `tenant_*` and `platform_settings` into each shop database and `/network`, `/b/:slug`, `/dashboard` into the shop bundle. That mixed a shared-database tenant model with the per-vendor-database shop (audit P1-3) and carried the P0-2, P1-1 and P1-2 security defects.

**Decision:** The directory lives in `platform-app/` (own Vite config, `.env`, Supabase project and migrations in `platform-app/supabase/`). It imports only design-system, i18n and theme code from `src/`; auth is its own `platform-app/src/auth.tsx`. Creating, activating and assigning businesses is done only by `platform_*` RPCs that check `platform_admins`. The shop keeps one vendor per Supabase project and no longer contains directory code or routes.

**Result:** shop initial JS 201.4 to 188.9 kB gzip; `npm run check` also typechecks, tests and builds the platform app.

**Open:** the shop database still holds the old `tenants` tables (2 seed rows) from an applied migration. Dropping them is destructive and needs owner approval after the control-plane project exists. The platform app has no live Supabase project yet, so it has not been run against data.

---

## UX-D023: One app and one database for hub, flagship and vendor stores

**Status:** Accepted by the owner (24 Oct 2026). **Supersedes UX-D022** (separate control-plane app and database).

**Context:** Running a second app and Supabase project for the directory doubled deploys and made the hub, the flagship and vendors impossible to preview together. The owner chose a single unified runtime.

**Decision:** The directory code returned to `src/`; `platform-app/` was removed. Tenancy is data: `tenants.features`, `tenant_members`, `tenant_id` on every store table, and a request-scoped tenant (`x-tenant-id` header, or `p_tenant_id` on checkout RPCs). The hardening from the control-plane baseline (no client INSERT/DELETE on `tenants`, content-column UPDATE only, tenant-scoped storage, SECURITY DEFINER helpers) was merged into `20261024140000`, which also drops the weak policies the applied `multi_tenant_platform` migration created. That applied migration was left untouched.

**Result:** see ARCHITECTURE.md section 22, SECURITY.md section 17, DATABASE.md section 14.

**Open:** migrations `20261024140000` and `20261024150000` are not applied anywhere; messaging and ledger multi-tenancy needs a review before a second real vendor uses them (SECURITY.md section 17, known gaps).
