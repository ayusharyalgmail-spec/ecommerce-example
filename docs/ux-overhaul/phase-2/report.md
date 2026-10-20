# Phase 2 report: App shell and navigation (20 Oct 2026)

Branch `ux/phase-2`, tag `v0.3.0`. Everything is behind `ui_v2` (off by default); use `?ui=v2` to preview, `?ui=reset` to clear.

## Summary
- The new shell exists: glass top bar that slides away on scroll (compact), floating glass bottom nav, desktop header with category menu and account menu, flat footer, route skeletons, global error screen, 404, appearance switchers, keyboard shortcuts, skip link, view transitions, and an admin shell (sidebar at 840 px and wider, bottom nav and More sheet below that).
- `npm run check` passes: 41 tests, 274 i18n keys, 74 contrast checks. Initial JS is **180.1 kB of 200 kB (90%)** after a Realtime stub recovered about 16 kB.
- Not verified here: real Android phone (Back, keyboard, gesture bar), TalkBack and NVDA, the admin shell with a real staff login, desktop visuals (the browser pane scaled the emulated 1366 px view too small to inspect by eye).

## What changed (files)
- `src/shell/`: `AppLayout`, `Header`, `HeaderMenus` (lazy), `BottomNav`, `Footer` (lazy), `AppearancePanel`, `ShortcutsDialog` (lazy), `RouteError`, `NotFound`, `Illustration`, `PageSkeleton`, `AdminShell`, hooks `useUiV2`, `useHideOnScroll`, `useShortcuts`, plus tests and 8 stories.
- `src/ui/`: new `SegmentedControl`, `IconLink`; `iconButtonStyles` exported; `Popover` accepts `open/onOpenChange`; 15 more icons.
- Wiring: `App.tsx` (`Shell` switch, `errorElement`), `AdminLayout.tsx` (v2 switch), `components/ui.tsx` (`Loading` now renders the skeleton), `Shop.tsx` (focus search from the header), `index.html` (`interactive-widget=resizes-content`), `main.tsx` (`?ui=` override), `src/styles/ui.css` (view-transition rules).
- Data: `useStoreSettings` also reads public contact fields and policies. No database change this phase.
- Build: `vite.config.ts` aliases `@supabase/realtime-js` to `src/lib/realtime-stub.ts` (ADR UX-D021); the real package is kept as `realtime-real` for Phase 7.
- Dev-only: `/_ui/shells/admin` and `/_ui/shells/throw` previews (`MockAuthProvider`).
- Docs: `DECISIONS.md` (UX-D021), `TASKS.md` (Phase 2 status).

## Verification (commands run, real results)
| Check | Result |
|---|---|
| `npm run check` | typecheck 0 errors; ESLint 0 problems (new files are under the class-hygiene and layering rules); 41 tests pass; 274 keys; 74 contrast checks; build OK; budget below |
| `npm run size` | Initial JS 180.1 kB / 200 (90%); CSS 9.5 kB / 40; 30 lazy chunks, largest 10.1 kB |
| Storybook build | OK, 8 shell stories added |
| Unit tests (new, 10) | axe on header, bottom nav, footer, appearance, 404 (no critical/serious); bottom nav hidden on `/checkout` and while a text field is focused; `g c`, `g h`, `?` shortcuts, ignored while typing or with a modifier; flag resolution (database flag, `?ui=v1` override, `?ui=reset`) |
| Browser pane, compact 375 px | v2 renders with header, 5-item pill nav, footer; header hides on scroll down, returns on scroll up and near the top, stays while focus is inside; bottom nav hides while typing and returns; hidden on checkout; shortcuts navigate and open the help dialog; More sheet lists all 11 admin links plus the appearance panel and Back closes it; 3 glass surfaces maximum; error screen and 404 render; flag off gives the old shell |
| Browser pane, 1366 px | header contains logo, Categories, Home, Shop, Track, search field, language, cart, account; bottom nav hidden; footer present (measured, not viewed) |
| Realtime stub | app loads, queries, auth session and checkout RPC unaffected; bundle shows no `phoenix`/`RealtimeChannel` code |

## Phase 2 exit criteria (PHASES.md)
| Criterion | Result |
|---|---|
| Back closes sheets before navigating | Verified in the browser pane (sheet and More sheet). **Real Android not tested** |
| Shell passes TalkBack and NVDA smoke tests | **Not done: manual** (structure passes axe; labelled landmarks, skip link, focus moved to content on route change) |
| No layout shift when bars hide/show | By construction (transform on a sticky bar, no height change). **CLS not measured** |
| Bottom nav respects the gesture bar | Uses `env(safe-area-inset-bottom)`; **needs a gesture-nav phone to confirm** |

## Decisions I made (please confirm)
1. **Budget:** kept 200 kB as you said. Phase 2 cost 5.8 kB; I recovered it and more by stubbing Realtime now (ADR UX-D021) instead of waiting for Phase 3. Router trimming remains an option (react-router is about 47 kB gzip).
2. **Flag semantics:** the flag is read from the database and cached in localStorage so repeat visitors do not flash the old shell; the first visit after a vendor is switched may flash once. `?ui=v2` is a QA override that persists in that browser until `?ui=reset`.
3. **Appearance** lives in the footer (every screen) and the desktop account menu; on phones there is no header button for it (the header holds search, language, cart). Say if you want a header entry.
4. **Admin shell** replaces the old pill row only under the flag; page content inside is unchanged until Phase 7.
5. Nepali strings for the shell were written by me; they need native review (list below).
6. The `design:ux-copy` and `design:design-critique` skills are not available here; copy and critique were a manual pass (e.g. the footer heading "Shop" duplicated the link "Shop", now "Explore").

## Risks and open questions
- Phase 7 admin Realtime must use the `realtime-real` alias from a lazy chunk; `supabase.channel()` throws in the storefront bundle.
- The storefront shortcuts (`/`, `g c`, `?`) also stay active on admin routes because `AppLayout` still mounts; `g c` there jumps to the storefront cart. Harmless, but Phase 7 should scope them when the Ctrl+K palette arrives.
- `RouteError` replaces the whole screen (no chrome) so a crash in the shell itself still shows something.
- View transitions are enabled on shell links; visual behaviour was not inspected (the pane may not support the API).
- Desktop header at 840 to 1199 px shows an icon search and hides the inline field (field from 1200 px); check at 1024 px on a real laptop.

## Manual tasks for you
1. Real Android phone: scroll Home (header hide/show), open/close the More sheet and the footer appearance sheet with system Back, focus a text field (bottom nav should vanish), check the gesture-bar spacing.
2. Windows laptop at 125% and 1366x768: header at 840, 1024 and 1366 px, account menu, category menu, `/` and `g c` shortcuts, Tab order and visible focus.
3. A staff login on the dev store (or set `?ui=v2` and sign in): admin sidebar collapse, More sheet, Orders and Products still render inside the new shell.
4. Native Nepali review of the 42 new keys: `shell.*`, `footer.*`, `appearance.*`, `shortcuts.*`, `error.*`, `notfound.*`, `admin.more`.
5. TalkBack and NVDA walk-through: skip link, landmarks, bottom nav, More sheet, error screen.
6. To switch the dev store over for real: `update public.store_settings set ui_v2 = true where id = 1;`

## Next step
Stop here. Phase 3 (Home, search, shop; banners and category images migrations) starts when you reply **"approved phase 2"**.
