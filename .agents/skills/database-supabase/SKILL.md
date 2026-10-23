---
name: database-supabase
description: Safe database inspection, migrations, RPC validation, and RLS audit for Supabase.
---

# Supabase Database & Security Guide

## 1. Schema Inspection Over Assumptions
Before writing queries or mutating DB functions:
- Read existing migrations under `supabase/migrations/` and `DATABASE.md`.
- Never guess column names, types, or foreign key constraints.
- Inspect the exact table schema using tools or migration definitions.

## 2. Row Level Security (RLS) Rules
- Every table MUST have RLS enabled:
  ```sql
  ALTER TABLE public.your_table ENABLE ROW LEVEL SECURITY;
  ```
- Always define explicit policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
- Distinguish anon users, authenticated customers, and admin/staff roles:
  - Anon: read-only access to public catalog / active items.
  - Authenticated: access scoped strictly to `auth.uid() = customer_id` or tenant permissions.
  - Admin/Staff: authorized via claims or verified role table.

## 3. Safe Migrations
- Write migrations sequentially with standard timestamps in `supabase/migrations/`.
- Ensure migrations are idempotent (`IF EXISTS`, `IF NOT EXISTS`, `ON CONFLICT`).
- Never perform destructive schema drops (`DROP TABLE`, `DROP COLUMN`) without migration scripts that handle data backfill or explicit approval.
- Privileged RPC functions must set `SECURITY DEFINER` and an explicit `SET search_path = public, pg_temp;`.

## 4. Frontend Integration
- Use `@supabase/supabase-js` client typed against database interfaces.
- Validate RPC input parameters and verify transactional consistency for sensitive operations (e.g. order creation, stock decrements, balance updates).
