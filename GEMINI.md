# GEMINI.md — Engineering Discipline & Operating Guardrails

## Core Principles
1. **Preserve working functionality.** Never rewrite existing systems unless explicitly requested. Never make unrelated modifications or "opportunistic refactors."
2. **Understand before modifying.** Trace data flows and contracts completely before making any file changes.
3. **Minimum Viable Changes.** Make the smallest, highest-fidelity modification required to solve the task.
4. **Zero Secret Leakage.** Never expose `.env.local` contents, Supabase service-role keys, or JWT tokens in client code, logs, or chat outputs.

---

## Pre-Coding Protocol
Before modifying any files:
1. **Inspect Existing Architecture**: Check relevant documentation (`ARCHITECTURE.md`, `DATABASE.md`, `API_SPEC.md`, `SECURITY.md`, `package.json`).
2. **Search for Existing Implementations**: Avoid recreating helpers, hooks, design components, or utilities that already exist in `src/`.
3. **Trace Contracts**:
   - Check TypeScript definitions in `src/types/`.
   - Verify Supabase RPC function signatures and database schema in `supabase/migrations/`.
   - Ensure RLS policies and server-side constraints are respected.
4. **Formulate a Concise Plan**: State root cause, affected files, proposed minimal diff, and verification plan.

---

## Change Discipline
- **DO NOT** randomly update dependencies or install redundant packages.
- **DO NOT** rewrite working components to match generic boilerplate.
- **DO NOT** remove existing internationalization (English/Nepali) or accessibility attributes (`aria-*`, keyboard focus, contrast standards).
- **DO NOT** invent mock or fake data when actual database/API contracts exist.
- **DO NOT** bypass Supabase Row Level Security (RLS) or client-side RPC validation.

---

## UI & Styling Standards
- Respect the existing design system tokens and Tailwind v4 configuration.
- Support **Lite** effects mode for constrained devices and honor `prefers-reduced-motion`.
- Ensure mobile-first responsiveness (down to 320px screen width) without horizontal overflow.
- Ensure all interactive elements have comfortable touch targets and visible focus rings.

---

## Verification & Quality Gates
After implementing changes, run the appropriate workspace verification scripts:
- **Typecheck**: `npm run typecheck`
- **Lint**: `npm run lint`
- **Unit/Integration Tests**: `npm test`
- **Full Quality Suite** (prior to PR/production): `npm run check` (runs typecheck, lint, test, i18n, contrast, build, size)

---

## Standard Final Response Format
Always conclude implementation tasks with:
```markdown
### Changed
- [List modified files and concise summary of changes]

### Tested
- [Commands executed and their exact outcomes, e.g. `npm run typecheck` passed]

### Risks & Edge Cases
- [Any remaining dependencies, missing migrations, or environment prerequisites]

### Unchanged
- [Key related systems/files explicitly preserved without modification]
```
