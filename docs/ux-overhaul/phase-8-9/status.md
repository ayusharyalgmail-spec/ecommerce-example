# Phases 8 and 9: what remains and why I stopped

Phases 8 (hardening) and 9 (launch) are mostly work that needs real devices, people or production access. Nothing here was run.

## Needs a human or a device
- TalkBack and NVDA walkthroughs; frame-rate and LCP measurement on a low-end Android on Slow 4G; Nepali native review of all new strings (about 250 keys across phases 2 to 7); visual QA across EN/NE, light/dark, compact/expanded, Full/Lite; usability tests with shoppers and vendor staff.
- Pilot vendors, staged rollout, onboarding material, KPI comparison against the Phase 0 baseline, removing the `ui_v2` flag.

## Things I can do next if you want
- Finish Phase 7 remainder (order detail, products table and editor, brand settings, reports) in smaller steps.
- Rebuild the service worker (`vite-plugin-pwa`) once there is a staging URL and a phone to test it.
- Cleanup: delete legacy pages and CSS only after the flag is on for all vendors.
- Security checklist pass and axe tests over the new v2 pages.

## Verified state at the end of this session
`npm run check` passes on branch `ux/phase-7` (typecheck, lint, 43 tests, 404 i18n keys, 74 contrast checks, build, budget 176.7/200 kB).
