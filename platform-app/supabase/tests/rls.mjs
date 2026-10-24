// RLS regression test for the control-plane baseline migration, run in-memory with PGlite and stubbed auth/storage.
// Run: npm i --no-save @electric-sql/pglite && node platform-app/supabase/tests/rls.mjs
// Covers policies and grants only. It does NOT test Supabase Auth, real storage, or realtime: repeat on a real project.
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";

const MIG = path.resolve(import.meta.dirname, "../migrations/20261024140000_control_plane_baseline.sql");
const db = new PGlite();

// ---- Supabase stubs (auth, storage, roles, default grants) -------------------------------------------------
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;

  create schema storage;
  create table storage.buckets (id text primary key, name text not null, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id),
    name text, owner uuid default auth.uid());
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

// ---- apply the real migration -----------------------------------------------------------------------------
await db.exec(fs.readFileSync(MIG, "utf8"));
console.log("migration applied without error\n");

// ---- fixtures (superuser) ---------------------------------------------------------------------------------
const U = { owner: "00000000-0000-0000-0000-0000000000a1", editor: "00000000-0000-0000-0000-0000000000a2",
  viewer: "00000000-0000-0000-0000-0000000000a3", stranger: "00000000-0000-0000-0000-0000000000a4",
  admin: "00000000-0000-0000-0000-0000000000a5", other: "00000000-0000-0000-0000-0000000000a6" };
const T = { active: "10000000-0000-0000-0000-000000000001", other: "10000000-0000-0000-0000-000000000002", draft: "10000000-0000-0000-0000-000000000003" };
for (const [k, id] of Object.entries(U)) await db.query("insert into auth.users(id,email) values ($1,$2)", [id, k + "@t.test"]);
await db.exec(`
  insert into public.tenants (id, slug, business_name, status, owner_id) values
    ('${T.active}', 'active-biz', 'Active Biz', 'active', '${U.owner}'),
    ('${T.other}',  'other-biz',  'Other Biz',  'active', '${U.other}'),
    ('${T.draft}',  'draft-biz',  'Draft Biz',  'draft',  '${U.owner}');
  insert into public.tenant_staff values ('${T.active}', '${U.editor}', 'editor'), ('${T.active}', '${U.viewer}', 'viewer');
  insert into public.platform_admins values ('${U.admin}');
  insert into public.tenant_hours (tenant_id, day_of_week) values ('${T.active}', 1), ('${T.draft}', 1);
  insert into public.tenant_services (tenant_id, name_en) values ('${T.active}', 'svc-active'), ('${T.draft}', 'svc-draft');
  insert into public.tenant_inquiries (tenant_id, name, message) values ('${T.active}', 'n', 'hello');
  insert into public.tenant_analytics (tenant_id) values ('${T.active}');
  insert into storage.objects (bucket_id, name) values ('tenant-assets', 'tenants/${T.active}/existing.png');
`);

// ---- harness ----------------------------------------------------------------------------------------------
let pass = 0, fail = 0;
async function as(who, sql, params = []) {
  await db.exec("begin");
  try {
    await db.exec(who === "anon" ? "set local role anon" : "set local role authenticated");
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [who === "anon" ? "" : U[who]]);
    const r = await db.query(sql, params);
    return { ok: true, rows: r.rows, n: /^\s*select/i.test(sql) ? r.rows.length : (r.affectedRows ?? r.rows.length) };
  } catch (e) {
    return { ok: false, err: String(e.message) };
  } finally {
    await db.exec("rollback");
  }
}
function check(label, cond, detail = "") {
  if (cond) { pass++; console.log("  ok   " + label); } else { fail++; console.log("  FAIL " + label + (detail ? "  -> " + detail : "")); }
}
const rows = (r, n) => r.ok && r.n === n;
const denied = (r, re = /permission denied|row-level security|FORBIDDEN|violates|invalid input/i) => !r.ok && re.test(r.err);
const show = (r) => JSON.stringify(r).slice(0, 160);

// ---- tests ------------------------------------------------------------------------------------------------
console.log("tenants: read");
let r = await as("anon", "select slug from public.tenants order by slug");
check("anon sees the 2 active tenants only (no draft, no recursion error)", r.ok && r.rows.length === 2 && !r.rows.some((x) => x.slug === "draft-biz"), show(r));
r = await as("stranger", "select slug from public.tenants");
check("stranger sees active only", r.ok && r.rows.length === 2, show(r));
r = await as("owner", "select slug from public.tenants");
check("owner also sees own draft (3)", r.ok && r.rows.length === 3, show(r));
r = await as("editor", "select slug from public.tenants");
check("editor sees active + (no draft of someone else) = 2", r.ok && r.rows.length === 2, show(r));
r = await as("admin", "select slug from public.tenants");
check("platform admin sees all (3)", r.ok && r.rows.length === 3, show(r));

console.log("tenants: write");
r = await as("owner", `update public.tenants set tagline='x' where id='${T.active}'`);
check("owner updates content", rows(r, 1), show(r));
r = await as("editor", `update public.tenants set tagline='x' where id='${T.active}'`);
check("editor updates content", rows(r, 1), show(r));
r = await as("viewer", `update public.tenants set tagline='x' where id='${T.active}'`);
check("viewer cannot update (0 rows)", rows(r, 0), show(r));
r = await as("stranger", `update public.tenants set tagline='x' where id='${T.active}'`);
check("stranger cannot update (0 rows)", rows(r, 0), show(r));
r = await as("owner", `update public.tenants set tagline='x' where id='${T.other}'`);
check("owner cannot update another tenant (0 rows)", rows(r, 0), show(r));
for (const col of ["status='suspended'", `owner_id='${U.owner}'`, "slug='hijack'", "custom_domain='x.example'"]) {
  r = await as("owner", `update public.tenants set ${col} where id='${T.active}'`);
  check(`owner cannot change protected column (${col.split("=")[0]})`, denied(r, /permission denied/), show(r));
  r = await as("editor", `update public.tenants set ${col} where id='${T.active}'`);
  check(`editor cannot change protected column (${col.split("=")[0]})`, denied(r, /permission denied/), show(r));
}
r = await as("stranger", `insert into public.tenants(slug,business_name,status,owner_id) values ('my-biz','x','active','${U.stranger}')`);
check("signed-in user cannot self-create an active tenant", denied(r, /permission denied/), show(r));
r = await as("owner", `delete from public.tenants where id='${T.active}'`);
check("owner cannot delete tenant", denied(r, /permission denied/), show(r));
r = await as("anon", `update public.tenants set tagline='x'`);
check("anon cannot update", denied(r, /permission denied/), show(r));

console.log("platform operations");
r = await as("anon", "select public.platform_create_tenant('anon-biz','x')");
check("anon cannot call platform_create_tenant", denied(r, /permission denied/), show(r));
r = await as("stranger", "select public.platform_create_tenant('str-biz','x')");
check("non-admin gets FORBIDDEN", denied(r, /FORBIDDEN/), show(r));
r = await as("owner", `select public.platform_set_tenant_status('${T.draft}','active')`);
check("tenant owner cannot self-activate (FORBIDDEN)", denied(r, /FORBIDDEN/), show(r));
r = await as("admin", "select public.platform_create_tenant('new-biz','New Biz', null)");
check("platform admin creates a draft tenant", r.ok && r.rows.length === 1, show(r));
r = await as("admin", `select public.platform_set_tenant_status('${T.draft}','active')`);
check("platform admin activates", r.ok, show(r));
r = await as("admin", `select public.platform_set_tenant_status('${T.draft}','bogus')`);
check("invalid status rejected", denied(r, /VALIDATION_FAILED|violates/), show(r));
r = await as("anon", "select * from public.platform_admins");
check("anon cannot read platform_admins", denied(r, /permission denied/), show(r));
r = await as("owner", "select * from public.platform_admins");
check("authenticated cannot read platform_admins", denied(r, /permission denied/), show(r));

console.log("content tables");
r = await as("anon", "select count(*)::int c from public.tenant_hours");
check("anon sees hours of active tenant only (1)", r.ok && r.rows[0].c === 1, show(r));
r = await as("anon", "select count(*)::int c from public.tenant_services");
check("anon sees services of active tenant only (1)", r.ok && r.rows[0].c === 1, show(r));
const ins = (t) => `insert into public.tenant_services(tenant_id,name_en) values ('${t}','new')`;
r = await as("editor", ins(T.active)); check("editor adds a service", rows(r, 1), show(r));
r = await as("owner", ins(T.active)); check("owner adds a service", rows(r, 1), show(r));
r = await as("viewer", ins(T.active)); check("viewer cannot add a service", denied(r), show(r));
r = await as("stranger", ins(T.active)); check("stranger cannot add a service", denied(r), show(r));
r = await as("editor", ins(T.other)); check("editor cannot add to another tenant", denied(r), show(r));
r = await as("anon", ins(T.active)); check("anon cannot add a service", denied(r), show(r));
r = await as("stranger", `delete from public.tenant_gallery where tenant_id='${T.active}'`);
check("stranger delete affects nothing", rows(r, 0), show(r));

console.log("inquiries");
const inq = (t, extra = "") => `insert into public.tenant_inquiries(tenant_id,name,message${extra ? ",is_read" : ""}) values ('${t}','a','b'${extra ? ",true" : ""})`;
r = await as("anon", inq(T.active)); check("anon sends an inquiry to an active business", rows(r, 1), show(r));
r = await as("anon", inq(T.draft)); check("anon cannot send to a draft business", denied(r), show(r));
r = await as("anon", inq(T.active, "x")); check("anon cannot pre-mark as read", denied(r), show(r));
r = await as("anon", `insert into public.tenant_inquiries(tenant_id,name,message) values ('${T.active}','','b')`);
check("empty name rejected", denied(r), show(r));
r = await as("anon", `insert into public.tenant_inquiries(tenant_id,name,message) values ('${T.active}','a','${"x".repeat(4001)}')`);
check("oversize message rejected", denied(r), show(r));
r = await as("anon", "select * from public.tenant_inquiries"); check("anon cannot read inquiries", rows(r, 0), show(r));
r = await as("stranger", "select * from public.tenant_inquiries"); check("stranger cannot read inquiries", rows(r, 0), show(r));
r = await as("viewer", "select * from public.tenant_inquiries"); check("viewer reads inquiries", rows(r, 1), show(r));
r = await as("editor", `update public.tenant_inquiries set is_read=true where tenant_id='${T.active}'`); check("editor marks read", rows(r, 1), show(r));
r = await as("viewer", `update public.tenant_inquiries set is_read=true where tenant_id='${T.active}'`); check("viewer cannot mark read", rows(r, 0), show(r));

console.log("tenant_staff");
const addStaff = (who) => `insert into public.tenant_staff values ('${T.active}','${U[who]}','owner')`;
r = await as("stranger", addStaff("stranger")); check("stranger cannot add self as owner", denied(r), show(r));
r = await as("editor", addStaff("editor")); check("editor cannot promote self", denied(r), show(r));
r = await as("owner", `insert into public.tenant_staff values ('${T.active}','${U.stranger}','editor')`); check("owner adds a member", rows(r, 1), show(r));
r = await as("owner", `insert into public.tenant_staff values ('${T.other}','${U.stranger}','editor')`); check("owner cannot add to another tenant", denied(r), show(r));
r = await as("viewer", "select user_id from public.tenant_staff"); check("viewer sees only own staff row", r.ok && r.rows.length === 1, show(r));
r = await as("owner", "select user_id from public.tenant_staff"); check("owner sees the tenant's staff (2)", r.ok && r.rows.length === 2, show(r));

console.log("analytics + settings + lookup");
r = await as("anon", `insert into public.tenant_analytics(tenant_id,page) values ('${T.active}','/')`); check("anon records a page view", rows(r, 1), show(r));
r = await as("anon", `insert into public.tenant_analytics(tenant_id,page) values ('${T.draft}','/')`); check("anon cannot record for a draft tenant", denied(r), show(r));
r = await as("anon", `insert into public.tenant_analytics(tenant_id,page) values ('${T.active}','${"p".repeat(301)}')`); check("oversize page rejected", denied(r), show(r));
r = await as("anon", "select * from public.tenant_analytics"); check("anon cannot read analytics", rows(r, 0), show(r));
r = await as("stranger", "select * from public.tenant_analytics"); check("stranger cannot read analytics", rows(r, 0), show(r));
r = await as("editor", "select * from public.tenant_analytics"); check("member reads analytics", rows(r, 1), show(r));
r = await as("anon", "select network_name from public.platform_settings"); check("anon reads platform settings", rows(r, 1), show(r));
r = await as("owner", "update public.platform_settings set network_name='x'"); check("tenant owner cannot edit platform settings", rows(r, 0), show(r));
r = await as("admin", "update public.platform_settings set network_name='x'"); check("platform admin edits platform settings", rows(r, 1), show(r));
r = await as("anon", "select public.get_tenant_by_slug('active-biz') j"); check("get_tenant_by_slug returns active tenant", r.ok && r.rows[0].j?.slug === "active-biz", show(r));
r = await as("anon", "select public.get_tenant_by_slug('draft-biz') j"); check("get_tenant_by_slug hides draft", r.ok && r.rows[0].j === null, show(r));

console.log("storage (tenant-assets)");
const put = (path) => `insert into storage.objects(bucket_id,name) values ('tenant-assets','${path}')`;
r = await as("owner", put(`tenants/${T.active}/logo.png`)); check("owner uploads to own tenant path", rows(r, 1), show(r));
r = await as("editor", put(`tenants/${T.active}/gallery/a.png`)); check("editor uploads to own tenant path", rows(r, 1), show(r));
r = await as("viewer", put(`tenants/${T.active}/logo.png`)); check("viewer cannot upload", denied(r), show(r));
r = await as("stranger", put(`tenants/${T.active}/logo.png`)); check("stranger cannot upload to someone's tenant", denied(r), show(r));
r = await as("owner", put(`tenants/${T.other}/logo.png`)); check("owner cannot upload to another tenant", denied(r), show(r));
r = await as("owner", put(`tenants/not-a-uuid/logo.png`)); check("non-uuid folder rejected", denied(r), show(r));
r = await as("owner", put(`other/${T.active}/logo.png`)); check("path outside tenants/ rejected", denied(r), show(r));
r = await as("owner", put(`logo.png`)); check("root-level file rejected", denied(r), show(r));
r = await as("anon", put(`tenants/${T.active}/logo.png`)); check("anon cannot upload", denied(r), show(r));
r = await as("anon", "select count(*)::int c from storage.objects"); check("anyone can read public objects", r.ok && r.rows[0].c === 1, show(r));
r = await as("stranger", `delete from storage.objects where name like 'tenants/${T.active}/%'`); check("stranger delete affects nothing", rows(r, 0), show(r));
r = await as("editor", `delete from storage.objects where name like 'tenants/${T.active}/%'`); check("editor deletes own tenant files", rows(r, 1), show(r));
r = await as("stranger", `update storage.objects set name='tenants/${T.active}/x.png' where name like 'tenants/${T.active}/%'`); check("stranger cannot rename/overwrite", rows(r, 0), show(r));
const b = (await db.query("select file_size_limit, allowed_mime_types, public from storage.buckets where id='tenant-assets'")).rows[0];
check("bucket: 5 MB limit + image-only MIME list", Number(b.file_size_limit) === 5242880 && b.allowed_mime_types.join() === "image/jpeg,image/png,image/webp", JSON.stringify(b));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
