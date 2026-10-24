# Master audit — 24 Oct 2026 (Phase 0 of `prompt.md`)

Scope: read-only audit before any implementation. Nothing in `src/` or `supabase/` was changed.
Evidence sources: repository source and migrations, the live Supabase project `ecommerce-nepal`
(`lhbcpftjmwchnynkqjbf`, read-only SQL + security advisors), the live site
https://ecommerce-dumarwana.vercel.app/ (unauthenticated browser), and the local dev server on
http://localhost:3000.

Backup taken first: `E:\!my_new_world\ecommerce_main_backups\20261024-034202` (everything except
`node_modules` and `dist`, `.git` included).

Legend for "Verified": **live** = reproduced on the deployed site or the live database;
**source** = found in code/migrations only; **both**.

---

## 1. Baseline quality gates (before any change)

| Check | Command | Result |
|---|---|---|
| Typecheck | `tsc --noEmit` | PASS |
| Lint | `eslint .` | **FAIL — 38 errors**, all in `src/network/*`, `src/business/*`, `src/dashboard/*` (raw `lucide-react` imports, unused vars, setState-in-effect, click handlers without keyboard support). The core shop/admin code is lint-clean. |
| Unit tests | `vitest run` | PASS — 12 files, 96 tests |
| i18n parity | `scripts/check-i18n.mjs` | PASS — 925 keys |
| Contrast | `scripts/contrast.mjs` | PASS — 74 checks |
| Build | `vite build` | PASS |
| Bundle budget | `scripts/check-budget.mjs` | PASS but tight — initial JS 201.6 / 205 kB gzip (98%) |

So `npm run check` fails today at the lint step. That failure predates this audit.

---

## 2. Findings by severity

### P0 — critical

**P0-1 Demo catalogue is ON in production; real inventory is hidden and checkout is blocked** (live)
- Where: `src/catalog/demoMode.ts`; unguarded call sites in `catalog/data.ts`, `lib/api.ts`,
  `lib/queries.ts`, `checkout/CheckoutV2.tsx:97,204,345`, `shell/AppLayout.tsx:56`, product card/page.
- What: `demoOn()` returns `true` unless the browser has `demo-catalog=0` saved. The comment says every
  call site is wrapped in `import.meta.env.DEV &&`, but none of them are. Commit `16b7d62`
  ("rich demo catalog") removed the guard.
- Effect on the live site: it shows a "Demo catalogue" strip, 83 fixture products (the database holds 3),
  fake "On offer" prices, and step 3 of checkout is disabled. Real customers cannot order. Demo data is
  presented as a real store (prompt §18).
- Fix: `demoOn()` must return `false` unless `import.meta.env.DEV` (or an explicit
  `VITE_DEMO_CATALOG=1` build flag), and default to off. Add a unit test that the production
  build path returns `false`.
- **Status: fixed in code (24 Oct), not yet deployed.** `DEMO_ALLOWED = DEV || VITE_DEMO_CATALOG === "1"`
  gates `demoOn()`, and the three fixture imports are written as `DEMO_ALLOWED && demoOn()`. The
  default is off; `?demo=1/0` works only where it is allowed. Test: `src/catalog/demoMode.test.ts`
  (production build always off, even with `?demo=1` or a saved preference; dev off by default and
  toggleable; an explicit demo build is on by default). Verified on localhost:3000: `/shop` shows the
  3 real products, and `?demo=1` shows the 83 fixtures. In the production build no code references the
  fixture chunk (Rollup still emits the orphan file). The live site keeps the bug until a redeploy.

**P0-2 `tenant-assets` bucket: any signed-in user can upload, overwrite or delete any file** (live)
- Where: migration `multi_tenant_platform`, storage policies `tenant_assets_auth_*`.
- What: the policies check only `auth.uid() IS NOT NULL`. The bucket is public and has no size limit or
  MIME allow-list. Anyone who signs up (open email sign-up) can replace another business's
  logo or cover. They can also upload arbitrary files, including HTML or SVG, served from the Supabase
  origin, and fill the storage quota.
- Fix: scope paths to `<tenant_id>/...` and check tenant ownership/staff in the policy; set
  `file_size_limit` and `allowed_mime_types` (jpeg/png/webp) like the other buckets.

**P0-3 Repository migrations cannot rebuild the database; a new vendor cannot be provisioned from the repo** (both)
- Live has 17 migrations; the repo has 7. Missing from the repo: `core_schema`, `rls_and_rpc`,
  `harden_functions`, `staff_invites_reviews_storage`, `review_author_name`,
  `fix_place_order_coupon_record`, `payments_push_worker`, `track_order_payment_method`,
  `keep_one_owner_and_csv_import`, `cron_maintenance`, `revoke_anon_staff_notifs`,
  `product_images_dimensions`.
- 16 of the 28 tables and 18 of the 24 RPCs the frontend calls (`place_order`, `quote_checkout`,
  `transition_order`, `adjust_stock`, `products`, `orders`, `staff_members`, `store_settings`, etc.)
  exist only in the live database.
- The 7 repo files also use **different version numbers** from live (e.g. repo `20261020210000`
  vs live `20261021100516` for `multi_tenant_platform`). `supabase db push` would treat them as
  unapplied and re-run them.
- Why P0: the core requirement (one codebase, a separate database per vendor) is impossible until the
  full schema is versioned. Disaster recovery of the current store also depends only on Supabase backups.
- **Status: versioned (24 Oct); clean-apply test still open.** All 17 live migrations were read from
  `supabase_migrations.schema_migrations` (read-only) and written to `supabase/migrations/` under their live
  version numbers. Every file's md5 equals the live md5. The 5 files that already existed were checked
  first: they match live statement-for-statement (only comments, order and one seed-string newline differ),
  so they were renamed with `git mv` and given the live bytes. Two repo-only migrations had **never been applied**
  and were moved after the latest live version as pending: `20261024100000_orders_payment_method_enabled`,
  `20261024100100_products_min_purchase_qty` (see P1-6b). Still open: apply the full set to an empty database
  (local `supabase start` needs Docker running, or a throwaway project).

**P1-6b Product create/edit fails on live: the client writes a column that does not exist** (source + live schema)
- `lib/api.ts` `saveProduct` sends `min_purchase_qty` on every insert/update; live `products` has no such column,
  because migration `products_min_purchase_qty` was never applied. PostgREST rejects unknown columns, so admins
  cannot save products. Inferred from schema plus code; not reproduced with a staff login.
- Fix: apply `products_min_purchase_qty` (additive, default 1).
- **Status: fixed on live (24 Oct, owner-approved).** Applied as live version `20261023220853`; the repo file was
  renamed to match and its md5 equals the live record. Verified with a rolled-back transaction: as the owner
  account under RLS, `update products set min_purchase_qty = 3` affects 1 row; after rollback all 3 products are
  still 1. The storefront product page still loads. Follow-up: `min_purchase_qty` is not enforced by the cart or
  by `place_order`, although the column comment says it is. Server-side enforcement belongs in `quote_checkout`.
- **Enforcement (24 Oct): written and tested, not applied.** Migration `20261024120000_quote_checkout_min_purchase_qty`
  adds two checks to the live `quote_checkout` body (a diff against `rls_and_rpc` shows only those two lines).
  `place_order` calls `quote_checkout` before any insert, so a rejected line aborts the whole order. The migration
  also closes a gap found while testing: the old function accepted quantity 0, a negative quantity (a quote total of
  −Rs 140 for −2 items) or a missing quantity. PGlite test with old and new functions on the same data: 3 valid carts
  give identical quotes; 7 invalid cases are rejected with the expected codes.
  Client: `src/lib/minQty.ts` (rules matching the server), cart badge plus "Fix automatically" raise to the
  minimum or remove the line, product page and card start at the minimum, `QtyStepper` gets a `floor`, and
  `err.MIN_QUANTITY` exists in EN and NE (Nepali needs native review). The legacy v1 cart shows the server error
  only. Tests: `minQty.test.ts`, `QtyStepper.test.tsx`.
  The payment-method trigger migration stays pending by owner decision.

**P1-6 Applied migrations seed one vendor's identity into every database built from them** (source)
- `staff_invites_reviews_storage` inserts a fixed owner email into `staff_invites`, so whoever owns that
  email becomes owner of any new vendor database. `rls_and_rpc` seeds demo zones, categories and a sample
  book. `multi_tenant_platform` seeds Dumarwana and Royal Bakery.
- These are applied history and must not be edited. Provisioning needs a vendor-specific owner-invite step,
  plus a cleanup migration (or a provisioning baseline) that removes demo seeds from new vendors.
- Fix: pull the live schema into the repo (`supabase db pull` or `supabase migration fetch`), rename the 7
  files to their live versions, and verify by applying everything to a fresh, disposable project.

### P1 — broken workflows / serious security

**P1-1 `/network` directory fails: infinite RLS recursion on `tenants`** (live)
- `tenants_staff_read` queries `tenant_staff`, and `tenant_staff.staff_owner_all` queries `tenants`.
  Postgres raises "infinite recursion detected in policy for relation tenants", so anon reads return HTTP
  500 (4× per page load on `/network`). `/b/:slug` still works because it goes through the
  SECURITY DEFINER RPC `get_tenant_by_slug`. The owner dashboard (`/dashboard`) also reads `tenants`
  directly and is very likely broken. Not verified while signed in.
- Fix: move the membership checks into `SECURITY DEFINER` helper functions in `app_private`, the same
  pattern as `has_permission`.

**P1-2 Any signed-in user can create a public "business" and self-activate it** (source + live policy)
- `tenants_owner_all` is `FOR ALL USING (owner_id = auth.uid())` with no separate `WITH CHECK`, and
  `authenticated` has UPDATE on every column, including `status`, `owner_id` and `custom_domain`.
  Any account can INSERT a tenant with `status='active'`, so it appears under the platform brand,
  and can claim any unused `custom_domain`.
- `tenants_staff_update` lets an `editor` change `owner_id` to themselves, which takes over ownership.
- Fix: tenant creation and status changes go through a platform-admin RPC; restrict column grants
  (`status`, `owner_id`, `custom_domain`, `slug` are not client-writable).

**P1-3 Architecture contradiction: a shared-database tenant model has been added next to the
per-vendor-database shop** (source)
- `ARCHITECTURE.md` D-001 and `prompt.md` §3 require a separate Supabase project per vendor. The
  `multi_tenant_platform` migration plus `src/network`, `src/business` and `src/dashboard` put many
  businesses (`tenants`, `tenant_*`) in the shop's database. The shop itself is single-tenant per
  database (no `tenant_id` on products or orders).
- So the repo contains two incompatible products: a single-vendor shop and a shared-DB business
  directory, and the directory carries the P0-2, P1-1 and P1-2 issues.
- Decision needed (see §4).

**P1-4 Hard-coded vendor identity in shared code and migrations** (source)
- "Dumarwana" and "Royal Bakery & Cafe" appear in `network/*`, `business/BusinessLayout.tsx`,
  `dashboard/SettingsEditor.tsx`, and as **seed data inside a schema migration**, which would be seeded
  into every vendor database.
- Fix: move the seed to `supabase/seed.sql` (dev only); read names from config/DB.

**P1-5 Local development runs against the production database** (both)
- `.env.local` points at the live project. There is no staging or local Supabase. Every dev or test
  order is written to production (4 orders and 3 products exist live). It also blocks safe E2E and RLS
  testing (prompt §24 Journey E).
- Fix: a staging Supabase project (or `supabase start` locally) plus a guard that refuses to run seeds
  or destructive tests against a production URL.

### P2 — major UX / reliability / hardening

| # | Finding | Verified | Fix |
|---|---|---|---|
| P2-1 | 38 lint errors (all in network/business/dashboard), so `npm run check` is red | source | fix in place |
| P2-2 | Two full UI generations (legacy `pages/*` and V2) switched by `ui_v2`. Any visitor can force either with `?ui=v1/v2`, which exposes stale legacy screens. ~20 duplicate screens to maintain | source | decide V2 as default, delete legacy after route-by-route parity check |
| P2-3 | `tenant_analytics` accepts anon `INSERT … WITH CHECK (true)`, so analytics can be spammed | live policy | rate-limited RPC instead of direct insert |
| P2-4 | `set_tenant_updated_at` has a mutable `search_path`; `get_tenant_by_slug` uses `search_path = public` (not `''`) | advisor | pin search_path |
| P2-5 | Leaked-password protection is off in Supabase Auth | advisor | enable in dashboard (owner action) |
| P2-6 | Store name renders as the default "My Store" on the live site. No vendor branding has been configured | live | onboarding flow |
| P2-7 | Initial JS is at 98% of budget, so any new storefront feature will breach it | build | lazy-load more of the shell |
| P2-8 | `AuthCallback` ignores the `claim_staff_invite` error, so a failed owner claim is silent | source | surface the error |
| P2-9 | No E2E tests. Unit tests do not cover RLS, checkout or provisioning | source | add Playwright journeys against a staging DB |
| P2-10 | Docs describe Next.js / Route Handlers / next-intl / httpOnly cookies. The app is a Vite SPA with localStorage sessions (already logged in `baseline/doc-vs-code.md`, still unresolved in root docs) | source | update ARCHITECTURE/SECURITY/API_SPEC |
| P2-11 | No platform-admin role, provisioning flow, storefront presets or storefront editor with draft/publish exist yet (prompt §3.2, §4, §14) | source | Phases 1, 6, 7 |

### P3 — polish

- Anon can read `store_settings.payment_settings`. This is probably intended (payment instructions at
  checkout). Confirm it holds no private account data.
- `payment-proofs` allows anon INSERT under `proofs/%`. Upload spam is possible; consider a token-bound path.
- `web-push` is listed as a production dependency but is used only by the worker.
- 11 tables have RLS with no policy. This is intentional (RPC-only access), but should be documented in DATABASE.md.

---

## 3. What is in good shape (keep)

- `place_order` is SECURITY DEFINER with an idempotency key and row locks (`FOR UPDATE`), and reads
  prices from the DB (`price_paisa`). The client sends ids and quantities only. The client
  distinguishes network ambiguity (`retryable`) from definite failures.
- Money is integer paisa end to end.
- Core shop RLS uses `app_private.has_permission(...)` consistently; customers see only their own
  orders and addresses; product, image and store-asset storage writes are permission-gated with 5 MB
  and image-MIME limits.
- `store_settings` sensitive columns are hidden from anon via column grants; staff read them via
  `admin_store_settings()`.
- OAuth uses PKCE, and the `next` redirect is restricted to same-origin paths.
- No secrets are committed anywhere in git history; `.env.local` is ignored; the frontend uses only
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`, `VITE_DEMO_CATALOG`.
- There is a solid design-system base: tokens, CVA primitives, Storybook, axe tests, contrast script,
  i18n parity, self-hosted Mukta, Lite effects tier, and reduced motion.
- No horizontal overflow at 375 px on `/`, `/shop`, `/b/royal-bakery`, `/network` (live).

---

## 4. Decision needed before Phase 1

The prompt requires **one codebase, a separate database per vendor**. The repo currently contains a
**shared-database tenant directory** as well. Options:

1. **Recommended:** keep the shop as the per-vendor product (one Supabase project per vendor).
   Make the directory (`/network`, `/b/:slug`) a separate *platform/control-plane* app with its own
   database, holding only the vendor registry, provisioning status and public listing. Fix P0-2 and P1-1/2 there.
2. Keep the shared `tenants` tables inside each vendor DB. Not recommended: it duplicates the
   registry in every vendor database and mixes the platform with vendor data.
3. Drop per-vendor databases and go fully multi-tenant. This contradicts prompt §3 and would need
   `tenant_id` + RLS on every shop table.

---

## 5. Proposed order of work (next steps)

1. P0-1: turn the demo catalogue off in production (small code fix + test). Needs a redeploy to take effect live.
2. P0-3: version the full live schema in the repo and verify it on a fresh project (needs your OK to create a
   throwaway Supabase project, which may incur cost).
3. P1-5: staging database for development and E2E.
4. P0-2, P1-1, P1-2: new migrations for tenant storage/RLS. **Apply to live only with your explicit approval.**
5. Lint to green, then Phase 2 (security) → Phase 3+ as in `prompt.md` §26.

## 6. Environment notes

- Local dev now runs on **http://localhost:3000** via the Claude preview config "ecommerce"
  (`vite "E:/!my_new_world/ecommerce main" --port 3000`); `vite.config.ts` still defaults to 3001.
- The local server uses the same live Supabase project as production (see P1-5).

## 7. Implementation log (24 Oct, session 2)

- **P2-1 lint: fixed.** The 38 errors in `network/`, `business/`, `dashboard/` are gone: icons now come from
  `@/ui/icons` (added ArrowRight, Zap, HeartHandshake, Save, Copy, Building2, Camera, MessageSquare, ImageIcon),
  unused imports/vars removed, three set-state-in-effect cases replaced by derived-state-from-props, lightbox
  and drawer backdrops get `role="presentation"`. Result: `tsc` 0 errors, `eslint` 0, vitest 113/113,
  i18n 926 keys, contrast 74/74, build OK, budget 201.4/205 kB. `npm run check` is green for the first time.
- **P0-2, P1-1, P1-2, P2-4: migration written, NOT applied, NOT tested.**
  `supabase/migrations/20261024130000_tenant_security_hardening.sql` (helpers in `app_private`, non-recursive
  tenant/tenant_staff policies, no client INSERT/DELETE on `tenants`, column-limited UPDATE, tenant-scoped
  `tenant-assets` write policies, 5 MB + image MIME limits, pinned search_path). Client code was checked: it never
  inserts tenants or writes status/owner_id/slug/custom_domain, and uploads already use `tenants/<id>/...`.
  Needs a throwaway database to test (RLS as owner / editor / stranger) before applying to live.
  Side effect to accept: nobody can activate a tenant from the client until a platform-admin RPC exists (Phase 7).
- **Not started:** P1-3 architecture decision (option 1 recommended), P1-5 staging DB, P2-2 legacy UI removal,
  presets/editor/provisioning/platform admin (Phases 1, 3-7 of `prompt.md`), E2E tests.

## 8. Architecture decision applied (24 Oct, session 2): option 1
- Directory code moved with `git mv` to `platform-app/` (own Vite config, env, Supabase migrations, auth, login, tests); the shop no longer
  contains `/network`, `/b/:slug`, `/dashboard`. Record: `DECISIONS.md` UX-D022. P1-3 and P1-4 (shop side) resolved in code.
- Supersedes §7's shop migration: `20261024130000_tenant_security_hardening.sql` was deleted (never applied). The same fixes
  (P0-2, P1-1, P1-2, P2-3, P2-4) plus `platform_admins` and `platform_*` RPCs are in
  `platform-app/supabase/migrations/20261024140000_control_plane_baseline.sql` (**not applied, not tested** against any database).
- Results: shop initial JS 188.9/205 kB (was 201.4); tsc (both apps), eslint, vitest 113 + 7, i18n, contrast, builds pass.
- Not verified: platform app at runtime (no control-plane Supabase project exists), the migration's RLS, Google OAuth for the platform.
- Still open: drop old `tenants*` tables from the shop DB (destructive, needs approval), create the control-plane project, staging DB for the shop.

## 9. Control-plane migration tested locally (24 Oct, session 2)
- Supabase project creation was refused (free plan: 2 active projects already used), so nothing was created or applied remotely.
- `platform-app/supabase/tests/rls.mjs` applies the baseline migration in in-memory PGlite (stubbed `auth.uid()`, `storage`, anon/authenticated roles
  with Supabase-style default grants) and tests as anon, stranger, viewer, editor, owner and platform admin: **79 passed, 0 failed**
  (tenant read/write incl. protected columns, platform_* RPCs, content tables, inquiries, staff, analytics, settings, `tenant-assets` paths, bucket limits).
  The first run showed 3 failures that were a harness counting bug (SELECT row counts), fixed and re-run.
- Not covered: real Supabase Auth/JWT plumbing, real storage service (upload API, MIME enforcement), grants Supabase adds on a real project,
  security advisors. Repeat on a real project once a slot is free; then run `get_advisors`.
