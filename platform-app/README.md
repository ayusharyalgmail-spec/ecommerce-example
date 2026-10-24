# platform-app (control plane)

Vendor directory (`/network`), public vendor pages (`/b/:slug`) and the owner dashboard (`/dashboard`).
Its own Supabase project, separate from every shop. See `DECISIONS.md` UX-D022.

- Dev: `npm run dev:platform` (port 3002). Needs `platform-app/.env.local` (copy `.env.example`; public values only).
- Checks: `npm run typecheck:platform`, `npm run test:platform`, `npm run build:platform` (output `dist-platform/`).
- Database: `supabase/migrations/` (apply to a NEW, empty project only), `supabase/seed.sql` (dev only). RLS test: `npm i --no-save @electric-sql/pglite && node platform-app/supabase/tests/rls.mjs` (policies only; repeat on a real project).
- First platform admin: insert your auth user id into `platform_admins` with the SQL editor (service role), then use
  the `platform_create_tenant`, `platform_assign_owner`, `platform_set_tenant_status` RPCs.
- Deploy: a separate Vercel project built from the repo root with `npm run build:platform`, output `dist-platform`.
- Known: the main chunk is 599 kB (174 kB gzip) because the shared i18n dictionary ships whole; no budget gate yet.
