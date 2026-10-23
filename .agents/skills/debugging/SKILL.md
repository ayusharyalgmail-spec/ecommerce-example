---
name: debugging
description: Systematic root-cause debugging workflow. Prevents blind component rewrites.
---

# Systematic Debugging Protocol

When diagnosing a bug, failure, or unexpected behavior:

## 1. Do Not Rewrite
- **Rule**: Never immediately rewrite the suspected component or file.
- Blind rewrites introduce secondary regressions, alter subtle styling tokens, or strip edge-case handlers.

## 2. Trace the End-to-End Pipeline
Follow the issue from origin to surface:
```
User Interaction / Route
       ↓
Component State & Hooks
       ↓
API / Client Service Call
       ↓
Supabase RPC / Storage / Table Query
       ↓
Postgres Function / RLS Policy / DB Constraint
       ↓
Return Payload & Error Handling
       ↓
UI State Update & Toast / Notification
```

## 3. Identify the First Broken Invariant
- Pinpoint where expected data diverges from actual data.
- Check browser console logs, network response codes (e.g. 401, 403, 409, 422, 500), and Supabase PostgREST error messages.
- Common failure vectors:
  - Missing column or type mismatch between client payload and Postgres RPC parameter.
  - RLS policy denying SELECT or INSERT because role / auth UID doesn't match.
  - Storage bucket path mismatch or file size / mime-type limitation.

## 4. Targeted Root-Cause Fix
- Fix the specific invalid condition.
- Add guarded fallbacks or descriptive client-side warnings where appropriate.
- Verify that valid cases continue to function alongside edge cases.
