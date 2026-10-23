---
name: production-review
description: Comprehensive pre-deployment quality and production readiness review.
---

# Production Readiness Review Checklist

Run through this checklist prior to staging, shipping, or submitting pull requests:

## 1. Code Integrity & Automated Quality Gate
Execute the full quality suite:
```powershell
npm run check
```
This runs:
- `npm run typecheck` (TypeScript strict mode)
- `npm run lint` (ESLint rules)
- `npm test` (Vitest suites)
- `npm run i18n` (Translation key verification)
- `npm run contrast` (Color contrast / WCAG accessibility check)
- `npm run build` (Vite production bundle compilation)
- `npm run size` (Bundle budget checks)

## 2. Security & Data Protection
- [ ] No hardcoded secrets, API keys, or service-role keys in frontend source.
- [ ] Supabase RLS enabled on all newly introduced tables.
- [ ] Sensitive operations handled via `SECURITY DEFINER` functions with fixed `search_path`.
- [ ] Input sanitized and validated both client-side and database-side.

## 3. UX, Accessibility & Mobile Responsiveness
- [ ] Tested at mobile viewports (320px, 375px, 414px) with no horizontal overflow.
- [ ] Keyboard navigation and visible focus rings function on all interactive elements.
- [ ] ARIA attributes present for modals, drawers, tooltips, and dynamic notices.
- [ ] Contrast meets WCAG AA standards.
- [ ] Lite mode / `prefers-reduced-motion` respected (animations disable cleanly).

## 4. Error Handling & State Resilience
- [ ] Loading skeletons / indicators during asynchronous data fetches.
- [ ] Graceful empty states when lists/tables contain no records.
- [ ] User-friendly error messages (no raw SQL traces or unhandled promises shown).
- [ ] Idempotent RPC / mutations that handle retries safely without duplicates.
