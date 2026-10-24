// Shared PGlite harness: Supabase stubs (roles, auth, storage, pgcrypto) + "apply every migration in order".
// Covers SQL, policies and grants only. It does NOT test Supabase Auth, real storage, PostgREST headers or realtime.
import path from "node:path";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";

export const MIGRATIONS = path.resolve(import.meta.dirname, "../migrations");

export async function freshDb() {
  const db = new PGlite({ extensions: { citext, pg_trgm } });
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid(), auth.role() to anon, authenticated;

    create schema extensions;
    create function extensions.digest(d bytea, algo text) returns bytea language sql immutable as $$ select sha256(d) $$;
    create function extensions.digest(d text, algo text) returns bytea language sql immutable as $$ select sha256(convert_to(d, 'utf8')) $$;
    create function extensions.gen_random_bytes(n int) returns bytea language sql volatile as $$ select decode(substr(md5(random()::text || clock_timestamp()::text), 1, n * 2), 'hex') $$;
    create function public.gen_random_bytes(n int) returns bytea language sql volatile as $$ select extensions.gen_random_bytes(n) $$;
    create function public.digest(d bytea, algo text) returns bytea language sql immutable as $$ select sha256(d) $$;
    create function public.digest(d text, algo text) returns bytea language sql immutable as $$ select sha256(convert_to(d, 'utf8')) $$;
    grant usage on schema extensions to anon, authenticated;
    create schema cron;
    create function cron.schedule(a text, b text, c text) returns bigint language sql as $$ select 1::bigint $$;
    create function cron.schedule(b text, c text) returns bigint language sql as $$ select 1::bigint $$;
    create function cron.unschedule(a text) returns boolean language sql as $$ select true $$;

    create schema storage;
    create table storage.buckets (id text primary key, name text not null, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid default auth.uid());
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as $$
      select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)] $$;
    grant usage on schema storage to anon, authenticated;
    grant all on storage.objects, storage.buckets to anon, authenticated;

    grant usage on schema public to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on sequences to anon, authenticated;
    alter default privileges in schema public grant execute on functions to anon, authenticated;
  `);
  return db;
}

export const listMigrations = () => fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();

/** Applies migrations in order; returns the list of {file, error} for any that failed (it keeps going so one stub gap shows everything). */
export async function applyAll(db, { upTo } = {}) {
  const failed = [];
  for (const f of listMigrations()) {
    if (upTo && f > upTo) break;
    try { await db.exec(fs.readFileSync(path.join(MIGRATIONS, f), "utf8").replace(/^s*create extension if not exists (pgcrypto|pg_cron)[^;]*;/gim, "-- (stubbed extension)")); }
    catch (e) { failed.push({ file: f, error: String(e.message).slice(0, 300) }); }
  }
  return failed;
}
