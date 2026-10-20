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
