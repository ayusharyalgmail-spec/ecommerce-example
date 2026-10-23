# Claude Instructions — E-commerce Production Repair

## Mission
Repair this existing React + TypeScript + Vite + Supabase store into a reliable, secure, fast, accessible, mobile-first production website. Prefer small, tested fixes over rewrites. Preserve working features, data, routes, design tokens, English/Nepali support, and current architecture unless evidence proves a change is needed.

## Work rules (low-token)
- Inspect before editing. Read `README.md`, `PRD.md`, `ARCHITECTURE.md`, `DATABASE.md`, `API_SPEC.md`, `DESIGN.md`, `SECURITY.md`, `TASKS.md`, `package.json`, relevant source, and all relevant Supabase migrations.
- Build a short evidence-based issue list: severity, reproduction, root cause, files, fix, test. Do not guess at backend causes.
- Work in small batches. Fix P0 blockers first; avoid unrelated refactors, new dependencies, duplicated documentation, and broad rewrites.
- Never claim a test, migration, upload, order, or deployment succeeded unless you actually verified it. If blocked by missing credentials/live access, state exactly what needs the owner to check.
- Never print, commit, or expose secrets. Do not read out `.env.local` values. Keep local env files ignored. Never put service-role keys in browser code.
- Preserve server-side validation, RLS, least privilege, audit logging, transactional stock/price calculation, and idempotency. Never solve authorization by hiding UI only.
- User-facing errors must be clear and translated; technical diagnostics must be safe, structured, and useful. Never show raw SQL, stack traces, tokens, or private customer data to shoppers.
- Use existing libraries and design primitives first. Keep code readable and avoid unnecessary abstractions.

## Required UX defaults
- Fresh installs start in **Lite** effects mode. Respect a saved explicit Full/Lite preference; Lite removes expensive blur and decorative motion. Honor `prefers-reduced-motion`, low-data settings, and device constraints.
- Product sharing uses `navigator.share({title, text, url})` where supported. If unavailable, offer copy-link with feedback; do not force WhatsApp. Treat user cancellation as normal.
- Mobile-first responsive UI for 320px+ screens, tablet, and desktop. No horizontal overflow, clipped text, jumpy layout, dead controls, or inaccessible dialogs. Touch targets should be comfortable; keyboard focus and screen-reader labels must work.
- Prioritize clear navigation, readable hierarchy, restrained visual effects, fast image loading, stable skeletons, helpful empty/error/success states, and consistent components.

## P0 acceptance criteria
1. Product images: validate file type/size, safely convert supported formats, handle unsupported browser/image decode/canvas errors, upload to the correct bucket/path, verify storage RLS, insert metadata only after successful upload, show progress/errors, and clean up orphaned files on metadata failure where safe. Verify primary-image and reorder operations handle errors.
2. Orders: compare frontend RPC payloads with deployed SQL function signatures and migrations; verify grants, RLS, constraints, required fields, delivery zones, coupons, stock/reservations, and payment settings. Totals must be server-calculated and order creation transactional. Preserve idempotency and handle retries without duplicate orders. Return useful safe error codes.
3. Test full customer journeys: browse/search/product, add/update/remove cart, guest and signed-in checkout if supported, quote, place order, tracking, account, admin product CRUD, image upload, and permission denial.
4. Audit every route and both legacy/V2 variants. Confirm feature flags cannot silently expose broken or stale screens. Remove old code only after proving it is unused and tests/build pass.
5. Security: verify RLS on every sensitive table and storage bucket; confirm anon/customer/staff roles; check privileged RPC `SECURITY DEFINER` search paths and execute grants; verify no secret leakage, open redirects, unsafe file handling, or client-trusted price/role.
6. Quality gate: run `npm run check` (or each constituent script if needed), add focused regression tests, fix all new failures, and report any baseline failures separately. Run production build and inspect bundle budget.
7. Accessibility/performance: check keyboard-only flows, labels, focus, contrast, reduced motion, mobile overflow, loading/error states, image dimensions/alt text, and layout stability. Test at 320/360/390/768/1024/1366px and English/Nepali.

## Execution protocol
1. Establish baseline and report current checks before editing.
2. Trace each reported error end-to-end (UI → client API → Supabase RPC/storage → SQL policy/function). Use real error codes/logs; do not mask unknown failures as generic success or retry blindly.
3. Implement the smallest coherent fix and regression tests.
4. Run relevant tests after each batch; run the full quality gate at the end.
5. Finish with: fixed items, root causes, changed files, commands/tests and actual results, unresolved items, live Supabase steps still required, and a short manual test checklist.

## Never do
- Do not rebuild from scratch, change schema destructively, delete user data, reset production databases, or apply migrations to production without explicit approval.
- Do not invent environment values, pretend to access live Supabase, disable RLS, bypass validation, swallow errors, or remove idempotency.
- Do not add features just because they seem useful. Fix reliability and UX first.
