# Store (React + Vite + Supabase)

White-label e-commerce storefront and vendor dashboard for Nepal. Specs live in the `*.md` files
(PRD, ARCHITECTURE, DATABASE, API_SPEC, SECURITY, DESIGN, DECISIONS).

## Stack
- React 19, React Router, Tailwind CSS 4, built with Vite (single-page app, no server framework)
- Supabase (Postgres + RLS + RPC functions, Auth, Storage). The browser talks to Supabase directly;
  Postgres enforces who may do what.
- `server/worker.mjs`: a tiny Node script that sends Web Push notifications.

## Run
```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3001 (also on your LAN for phones)
npm run build                # type-check + production build into dist/
npm run worker               # push notifications (needs the VAPID keys + WORKER_SECRET)
```

## Notes
- Sign in: Google (enable the provider in Supabase) or email/password / email link.
- The email in `staff_invites` becomes the owner on first sign-in.
- Deploy `dist/` to any static host and add a fallback rule that serves `index.html` for unknown paths.

## Multi-tenant: hub, flagship store, vendor stores

One app serves three things, chosen per page load (see ARCHITECTURE.md section 22):

| You open | You get |
|---|---|
| `http://localhost:3001/` (or `?tenant=hub`) | **Hub**: the vendor directory `/network`, public business pages `/b/:slug`, the vendor `/dashboard`, and `/platform-admin` |
| `http://localhost:3001/?tenant=ecommerce` | The **flagship demo store**, every feature on. Falls back to the bundled demo catalogue in dev if the database has no `ecommerce` row |
| `http://localhost:3001/?tenant=family-mart` | A **vendor store** with a feature subset (no ledger, messaging, campaigns or POS export) |
| `http://localhost:3001/s/family-mart/shop` | The same vendor store addressed by path (works on any host) |

`?tenant=` is remembered for the browser tab (sessionStorage); `?tenant=hub` clears it. In production set `VITE_ROOT_DOMAIN` (for example `dumarwana.com`): `www.` and the bare root are the hub, `ecommerce.<root>` is the flagship, any other `<slug>.<root>` is a vendor store, and an unrelated host is looked up as a vendor's `custom_domain` (and falls back to the flagship if nothing matches, so `*.vercel.app` previews keep working).

### Try it locally
```bash
npm run dev
# development data (optional, local database only): psql ... -f supabase/seed.sql
```
1. Open `/` for the hub, `/?tenant=ecommerce`, `/?tenant=family-mart`.
2. Sign in, then make yourself a platform admin once (SQL editor, service role): `insert into public.platform_admins (user_id) select id from auth.users where email = 'you@example.com';`
3. Open `/platform-admin?tenant=hub`.

### Onboard a vendor
1. `/platform-admin` -> **Create vendor store**: name, address (slug), optional owner email, custom domain, brand colour, logo URL, feature toggles. The store starts as a **draft**.
2. If the owner already has an account they become its owner; otherwise an owner invite is created and is claimed when they first sign in on that store.
3. Add the store's delivery zone, products and payment settings from its `/admin`, then press **Activate** in the platform admin. Only active stores are visible to the public.
4. Subdomain: add `<slug>.<root>` to the hosting project. Custom domain: add it to the hosting project, set it on the store, point DNS.

### Checks
```bash
npm run check                                   # typecheck, lint, tests, i18n, contrast, build, bundle budget
npm i --no-save @electric-sql/pglite
node supabase/tests/rls.mjs                     # tenant tables (79 checks)
node supabase/tests/tenancy.mjs                 # every migration + tenant isolation + seed (73 checks)
```
Migrations in `supabase/migrations/` are **not applied automatically**. `20261024140000` and `20261024150000` are pending; see SECURITY.md section 17 and DATABASE.md section 14 before applying them to a real project.
