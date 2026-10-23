---
name: safe-change
description: Guide for making minimal, safe, regression-free changes in the codebase.
---

# Safe-Change Workflow

Execute this workflow whenever modifying existing features, refactoring logic, or updating core flows.

## 1. Discovery & Contract Check
- Locate existing implementations using exact search (grep/ripgrep).
- Identify dependencies: callers, imports, downstream consumers.
- Check database / API schema:
  - If touching queries or RPCs, inspect `supabase/migrations/` and database types.
  - Never assume payload structure; check both frontend caller and backend SQL function.

## 2. Minimal Modification Rule
- Change only the lines required to satisfy the goal.
- Avoid formatting unrelated code blocks.
- Do not add external libraries when standard browser APIs or existing workspace utilities suffice.
- Keep components focused and maintain backwards compatibility where applicable.

## 3. Local Verification
Run quick targeted verification:
```powershell
npm run typecheck
npm test
```
If errors appear, fix them immediately before proceeding.

## 4. Diff Review
Inspect git diff locally to ensure:
- No debug `console.log` statements remain.
- No secrets, tokens, or local credentials are included.
- No unintended whitespace or formatting churn.
