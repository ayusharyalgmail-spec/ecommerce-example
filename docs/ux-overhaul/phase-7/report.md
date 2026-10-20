# Phase 7 report: Vendor admin workspace, partial (20 Oct 2026)

Branch `ux/phase-7`, tag `v0.9.0-partial`. Behind `ui_v2`. No database change.

## Done
- Dashboard v2: "Needs your action" band (orders to confirm, payments to verify, reviews to moderate, low stock; "all clear" state), KPI cards with SVG sparklines (sales and orders, 14 days), recent orders.
- Orders v2: queue tabs with counts (All, To confirm, Payment check, Confirmed, Processing, On the way, Delivered, Cancelled), search, URL-synced tab and query, risk and payment badges, empty state.
- Command palette (Ctrl+K / Cmd+K) in the admin shell: jump to any page the staff member may open.
- From Phase 3: Storefront screen (banners, category pictures). Shell and sidebar from Phase 2.
- `npm run check` passes (initial JS 176.7 kB; admin code stays in lazy chunks). **Not verified in a browser**: I have no staff session, and I will not enter credentials. Only typecheck, lint, build and unit tests ran.

## Not done (still on the legacy screens inside the v2 shell)
Order detail redesign (payment verification, refund, COD collection dialogs), split view, bulk actions, print queue, Realtime new-order toast (needs the `realtime-real` lazy chunk, ADR UX-D021), product table with column visibility and inline stock, image drag-reorder editor with live preview and autosave, brand settings with live preview and contrast warnings, reviews/coupons/zones/staff/audit/settings/import migrated to new components, reports with charts and date ranges, keyboard table navigation, Windows forced-colors and PWA title-bar pass, vendor usability sessions, RLS negative tests per screen (existing RLS is unchanged and still enforces everything).

## Manual tasks
Sign in as staff with `?ui=v2` and check dashboard, orders tabs, Ctrl+K; Nepali review of `admin.*` additions.
