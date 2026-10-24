// Tenant-isolation regression test: applies EVERY migration (stubbed Supabase, in-memory PGlite) and then exercises
// 20261024150000_tenant_isolation.sql as anon / customer / staff of two stores / platform admin.
// Run: npm i --no-save @electric-sql/pglite && node supabase/tests/tenancy.mjs
// Covers SQL, RLS, grants and the RPC contracts. NOT covered: PostgREST header plumbing, real Auth, real Storage.
import fs from "node:fs";
import path from "node:path";
import { freshDb, applyAll, MIGRATIONS } from "./harness.mjs";

const db = await freshDb();
const failed = await applyAll(db);
let pass = 0, fail = 0;
const check = (label, cond, detail = "") => {
  if (cond) { pass++; console.log("  ok   " + label); } else { fail++; console.log("  FAIL " + label + (detail ? "  -> " + String(detail).slice(0, 220) : "")); }
};
check("every migration applies in order", failed.length === 0, JSON.stringify(failed));
const rerun = [];
try { await db.exec(fs.readFileSync(path.join(MIGRATIONS, "20261024150000_tenant_isolation.sql"), "utf8")); } catch (e) { rerun.push(e.message); }
check("tenant_isolation migration is idempotent (second run)", rerun.length === 0, rerun[0]);

const q = async (sql, p = []) => (await db.query(sql, p)).rows;
const FLAG = (await q("select id from public.tenants where slug='ecommerce'"))[0].id;
const U = {
  flagOwner: "00000000-0000-0000-0000-0000000000b1", fmOwner: "00000000-0000-0000-0000-0000000000b2", customer: "00000000-0000-0000-0000-0000000000b3",
  admin: "00000000-0000-0000-0000-0000000000b4", stranger: "00000000-0000-0000-0000-0000000000b5",
};
for (const [k, id] of Object.entries(U)) await q("insert into auth.users(id,email) values ($1,$2)", [id, k.toLowerCase() + "@t.test"]);
const FM = "20000000-0000-0000-0000-000000000001", DRAFT = "20000000-0000-0000-0000-000000000002";
await db.exec(`
  insert into public.tenants (id, slug, business_name, status, features) values
    ('${FM}', 'family-mart', 'Family Mart', 'active', '{"reviews":true}'),
    ('${DRAFT}', 'draft-shop', 'Draft Shop', 'draft', '{}');
  insert into public.platform_admins values ('${U.admin}');
  insert into public.staff_members (user_id, role, tenant_id) values ('${U.flagOwner}', 'owner', '${FLAG}'), ('${U.fmOwner}', 'owner', '${FM}');
  insert into public.store_settings (tenant_id, store_name, slug) values ('${FM}', 'Family Mart', 'family-mart'), ('${DRAFT}', 'Draft', 'draft');
  insert into public.categories (tenant_id, slug, name_en) values ('${FLAG}','groceries','G'), ('${FM}','groceries','G'), ('${DRAFT}','groceries','G');
  insert into public.products (id, tenant_id, slug, sku, name_en, price_paisa, stock_quantity, status, min_purchase_qty) values
    ('30000000-0000-0000-0000-000000000001','${FLAG}','rice','RICE','Rice A',10000,50,'published',1),
    ('30000000-0000-0000-0000-000000000002','${FM}','rice','RICE','Rice B',20000,50,'published',3),
    ('30000000-0000-0000-0000-000000000003','${DRAFT}','rice','RICE','Rice D',30000,50,'published',1);
  insert into public.delivery_zones (id, tenant_id, name_en, fee_paisa) values
    ('40000000-0000-0000-0000-000000000001','${FLAG}','Town',5000), ('40000000-0000-0000-0000-000000000002','${FM}','Town',1000);
  insert into public.coupons (tenant_id, code, type, value) values ('${FLAG}','SAVE10','percent',10), ('${FM}','FMONLY','percent',50);
`);
const PID = { A: "30000000-0000-0000-0000-000000000001", B: "30000000-0000-0000-0000-000000000002" };
const ZONE = { A: "40000000-0000-0000-0000-000000000001", B: "40000000-0000-0000-0000-000000000002" };

/** Runs one statement as a role with a given x-tenant-id header (undefined = no header) and rolls back. */
async function as(who, header, sql, params = []) {
  await db.exec("begin");
  try {
    await db.exec(who === "anon" ? "set local role anon" : "set local role authenticated");
    await db.query("select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', $2, true), set_config('request.headers', $3, true)",
      [who === "anon" ? "" : U[who], who === "anon" ? "anon" : "authenticated", header === undefined ? "{}" : JSON.stringify({ "x-tenant-id": header })]);
    const r = await db.query(sql, params);
    return { ok: true, rows: r.rows, n: /^\s*select/i.test(sql) || /returning/i.test(sql) ? r.rows.length : (r.affectedRows ?? r.rows.length) };
  } catch (e) { return { ok: false, err: String(e.message) }; } finally { await db.exec("rollback"); }
}
const names = (r) => (r.ok ? r.rows.map((x) => x.name_en).sort().join(",") : "ERR " + r.err);
const denied = (r, re = /permission denied|row-level security|FORBIDDEN|NOT_FOUND|violates/i) => !r.ok && re.test(r.err);

console.log("scope: reads follow the x-tenant-id header");
{ const x = await as("anon", undefined, "select name_en from public.products"); check("no header = flagship only", names(x).split(",").includes("Rice A") && !names(x).includes("Rice B"), names(x)); }
check("header = family-mart sees only its own", names(await as("anon", FM, "select name_en from public.products")) === "Rice B");
check("draft tenant is invisible to the public", names(await as("anon", DRAFT, "select name_en from public.products")) === "");
check("unknown tenant id = no rows", names(await as("anon", "99999999-9999-9999-9999-999999999999", "select name_en from public.products")) === "");
check("garbage header = no rows (fail closed)", names(await as("anon", "not-a-uuid", "select name_en from public.products")) === "");
check("store_settings is one row per tenant (.single() safe)", (await as("anon", FM, "select store_name from public.store_settings")).n === 1);
check("categories with the same slug coexist", (await q("select count(*)::int c from public.categories where slug='groceries'"))[0].c === 3);

console.log("staff: permissions are per tenant");
check("flagship owner updates a flagship product", (await as("flagOwner", undefined, `update public.products set price_paisa=10100 where id='${PID.A}'`)).n === 1);
check("flagship owner with fm header cannot update fm product", (await as("flagOwner", FM, `update public.products set price_paisa=1 where id='${PID.B}'`)).n === 0);
check("flagship owner with fm header cannot update flagship product either", (await as("flagOwner", FM, `update public.products set price_paisa=1 where id='${PID.A}'`)).n === 0);
check("fm owner updates fm product", (await as("fmOwner", FM, `update public.products set price_paisa=20100 where id='${PID.B}'`)).n === 1);
check("fm owner cannot update flagship product (header spoof)", (await as("fmOwner", undefined, `update public.products set price_paisa=1 where id='${PID.A}'`)).n === 0);
check("fm owner inserts a product: tenant_id defaults to fm", (await as("fmOwner", FM, "insert into public.products (slug,name_en,price_paisa) values ('milk','Milk',500) returning tenant_id")).rows?.[0]?.tenant_id === FM);
check("fm owner cannot insert a product for the flagship", denied(await as("fmOwner", FM, `insert into public.products (tenant_id,slug,name_en,price_paisa) values ('${FLAG}','x','X',500)`)));
check("fm owner reads no flagship orders", (await as("fmOwner", FM, "select * from public.orders")).n === 0);
check("customer cannot write products", denied(await as("customer", FM, "insert into public.products (slug,name_en,price_paisa) values ('z','Z',5)")));
check("anon cannot read staff_members", (await as("anon", FM, "select * from public.staff_members")).n === 0);
check("staff row of another store is invisible in this context", (await as("fmOwner", undefined, "select * from public.staff_members")).n === 0);

console.log("membership helpers");
check("is_tenant_member true for its own store", (await as("fmOwner", FM, `select public.is_tenant_member('${FM}') m`)).rows[0].m === true);
check("is_tenant_member false for another store", (await as("fmOwner", FM, `select public.is_tenant_member('${FLAG}') m`)).rows[0].m === false);
check("is_tenant_member respects roles", (await as("fmOwner", FM, `select public.is_tenant_member('${FM}', array['viewer']) m`)).rows[0].m === false);
check("is_platform_admin", (await as("admin", FM, "select public.is_platform_admin() m")).rows[0].m === true && (await as("fmOwner", FM, "select public.is_platform_admin() m")).rows[0].m === false);
check("staff_members is mirrored into tenant_members", (await q(`select count(*)::int c from public.tenant_members where tenant_id='${FM}' and user_id='${U.fmOwner}' and role='owner'`))[0].c === 1);
check("clients cannot write tenant_members", denied(await as("stranger", FM, `insert into public.tenant_members values ('${FM}','${U.stranger}','owner')`)));
check("clients cannot see platform_admins", denied(await as("stranger", FM, "select * from public.platform_admins")));

console.log("checkout RPCs");
const item = (id, quantity) => JSON.stringify([{ productId: id, quantity }]);
const quote = (tenant, id, qty, zone, coupon = null, header = tenant) =>
  as("customer", header, "select public.quote_checkout($1,$2::jsonb,$3,$4) j", [tenant, item(id, qty), zone, coupon]);
let r = await quote(FLAG, PID.A, 2, ZONE.A);
check("quote for the flagship: server total", r.ok && r.rows[0].j.total_paisa === 10000 * 2 + 5000, JSON.stringify(r.rows ?? r.err));
r = await quote(FM, PID.B, 3, ZONE.B);
check("quote for family-mart", r.ok && r.rows[0].j.total_paisa === 20000 * 3 + 1000, r.err);
check("a product of another tenant is NOT_FOUND", denied(await quote(FM, PID.A, 1, ZONE.B), /NOT_FOUND/));
check("a delivery zone of another tenant is NOT_FOUND", denied(await quote(FM, PID.B, 3, ZONE.A), /NOT_FOUND/));
check("header cannot override the p_tenant_id", denied(await quote(FM, PID.A, 1, ZONE.B, null, FLAG), /NOT_FOUND/));
check("draft tenant rejects checkout", denied(await quote(DRAFT, "30000000-0000-0000-0000-000000000003", 1, ZONE.B), /NOT_FOUND/));
check("unknown tenant rejects checkout", denied(await quote("99999999-9999-9999-9999-999999999999", PID.A, 1, ZONE.A), /NOT_FOUND/));
check("coupon of another tenant is unavailable", denied(await quote(FM, PID.B, 3, ZONE.B, "SAVE10"), /COUPON_UNAVAILABLE/));
check("coupon refused when the coupons feature is off (even its own code)", denied(await quote(FM, PID.B, 3, ZONE.B, "FMONLY"), /COUPON_UNAVAILABLE/));
r = await quote(FLAG, PID.A, 2, ZONE.A, "SAVE10");
check("flagship coupon works (feature on)", r.ok && r.rows[0].j.couponDiscount_paisa === 2000, JSON.stringify(r.rows ?? r.err));
check("min quantity is skipped when the feature is off", (await quote(FM, PID.B, 1, ZONE.B)).ok === true);
await q(`update public.tenants set features = features || '{"min_order_qty":true}' where id='${FM}'`);
check("min quantity enforced when the feature is on", denied(await quote(FM, PID.B, 1, ZONE.B), /MIN_QUANTITY/));
await q(`update public.tenants set features = features - 'min_order_qty' where id='${FM}'`);
check("old 3-arg quote_checkout is not callable by clients", denied(await as("customer", FM, "select public.quote_checkout($1::jsonb,$2,null)", [item(PID.B, 3), ZONE.B]), /permission denied/));

const place = (tenant, key, id, qty, zone, coupon = null, header = tenant) => as("customer", header,
  "select public.place_order($1,$2,$3::jsonb,$4,$5,'cod','Ram','+9779812345678',null,'Ram','+9779812345678','Main road',null,'Bara','Bara','en') j",
  [tenant, key, item(id, qty), zone, coupon]);
r = await place(FM, "idem-fm-1", PID.B, 3, ZONE.B);
check("place_order creates an order with the server total", r.ok && r.rows[0].j.total_paisa === 20000 * 3 + 1000 && !!r.rows[0].j.trackingToken, r.err);
check("place_order for a product of another tenant fails", denied(await place(FM, "idem-fm-2", PID.A, 1, ZONE.B), /NOT_FOUND/));
check("place_order with another tenant's coupon fails", denied(await place(FM, "idem-fm-3", PID.B, 3, ZONE.B, "SAVE10"), /COUPON_UNAVAILABLE/));
// persist one real order (committed, as the table owner) to test the stored tenant and the idempotent replay
await q("select set_config('request.jwt.claim.sub', $1, false)", [U.customer]);
const call = "select public.place_order($1,'idem-persist',$2::jsonb,$3,null,'cod','Ram','+9779800000001',null,'Ram','+9779800000001','Main',null,'Bara','Bara','en') j";
const first = (await q(call, [FM, item(PID.B, 3), ZONE.B]))[0].j;
await q("select set_config('app.tenant_id', '', false)");
const replay = (await q(call, [FM, item(PID.B, 3), ZONE.B]))[0].j;
check("retry with the same key returns the same order (no duplicate)", replay.replayed === true && replay.id === first.id);
const ord = (await q("select tenant_id, (select count(*)::int from public.order_items i where i.order_id=o.id) items from public.orders o where id=$1", [first.id]))[0];
check("order and its rows are stored under the right tenant", ord.tenant_id === FM && ord.items === 1);
check("stock reserved on the family-mart product only",
  (await q(`select reserved_quantity r from public.products where id='${PID.B}'`))[0].r === 3 && (await q(`select reserved_quantity r from public.products where id='${PID.A}'`))[0].r === 0);
check("a flagship customer cannot see the fm order", (await as("customer", undefined, "select * from public.orders")).n === 0);
check("fm staff sees it in fm context", (await as("fmOwner", FM, "select * from public.orders")).n === 1);
check("flagship staff does not see it", (await as("flagOwner", undefined, "select * from public.orders")).n === 0);
check("flagship staff cannot transition it (header = fm)", denied(await as("flagOwner", FM, `select public.transition_order('${first.id}','confirmed','pending_confirmation')`)));
check("fm staff can transition it", (await as("fmOwner", FM, `select public.transition_order('${first.id}','confirmed','pending_confirmation')`)).ok);
check("old 15-arg place_order is not callable by clients",
  denied(await as("customer", FM, "select public.place_order('k',$1::jsonb,$2,null,'cod','R','+9779800000002',null,'R','+9779800000002','x',null,'B','B','en')", [item(PID.B, 3), ZONE.B]), /permission denied/));

check("submit_payment_proof accepts the tenant-prefixed proof path", (await q("select pg_get_functiondef(p.oid) d from pg_proc p where proname='submit_payment_proof'"))[0].d.includes("([0-9a-f-]{36}/)?proofs/"));

console.log("platform admin");
check("non-admin cannot create a store", denied(await as("fmOwner", FM, "select public.platform_create_store('new-shop','New Shop')"), /FORBIDDEN/));
r = await as("admin", FM, "select public.platform_create_store('new-shop','New Shop','stranger@t.test',null,'#112233','https://x.test/l.png','{\"coupons\":true,\"bogus\":true}') id");
check("platform admin creates a store", r.ok && !!r.rows[0].id, r.err);
check("rejects a bad brand colour", denied(await as("admin", FM, "select public.platform_create_store('bad-shop','Bad',null,null,'red')"), /VALIDATION_FAILED/));
check("rejects a non-http logo", denied(await as("admin", FM, "select public.platform_create_store('bad-logo','Bad',null,null,null,'javascript:alert(1)')"), /VALIDATION_FAILED/));
check("non-admin cannot set features", denied(await as("fmOwner", FM, `select public.platform_set_tenant_features('${FM}','{"coupons":true}')`), /FORBIDDEN/));
check("tenant owner cannot edit own features column", denied(await as("fmOwner", FM, `update public.tenants set features='{"coupons":true}' where id='${FM}'`), /permission denied/));
check("get_tenant_by_slug exposes features and hides drafts",
  (await as("anon", undefined, "select public.get_tenant_by_slug('family-mart') j")).rows[0].j.features.reviews === true
  && (await as("anon", undefined, "select public.get_tenant_by_slug('draft-shop') j")).rows[0].j === null);
check("the flagship always reports every feature", (await as("anon", undefined, "select public.get_tenant_by_slug('ecommerce') j")).rows[0].j.features.ledger === true);

console.log("storage: writes under <tenant_id>/");
const put = (who, header, bucket, p) => as(who, header, "insert into storage.objects(bucket_id,name) values ($1,$2)", [bucket, p]);
await db.exec("insert into storage.buckets (id,name,public) values ('product-images','product-images',true),('store-assets','store-assets',true),('payment-proofs','payment-proofs',false) on conflict do nothing");
check("fm owner uploads under its own tenant folder", (await put("fmOwner", FM, "product-images", `${FM}/p1/a.webp`)).n === 1);
check("fm owner cannot upload under another tenant", denied(await put("fmOwner", FM, "product-images", `${FLAG}/p1/a.webp`)));
check("un-prefixed uploads are refused", denied(await put("fmOwner", FM, "product-images", "p1/a.webp")));
check("customer cannot upload product images", denied(await put("customer", FM, "product-images", `${FM}/p1/a.webp`)));
check("banner upload needs settings.manage on that tenant",
  (await put("fmOwner", FM, "store-assets", `${FM}/banners/b.webp`)).n === 1 && denied(await put("fmOwner", FM, "store-assets", `${FLAG}/banners/b.webp`)));
check("payment proofs: active tenant only, prefixed only",
  (await put("anon", FM, "payment-proofs", `${FM}/proofs/x.webp`)).n === 1 && denied(await put("anon", FM, "payment-proofs", `${DRAFT}/proofs/x.webp`)) && denied(await put("anon", FM, "payment-proofs", "proofs/x.webp")));
await db.exec(`insert into storage.objects(bucket_id,name) values ('product-images','legacy/old.webp'),('product-images','${FM}/p1/mine.webp')`);
{ const x = await as("flagOwner", undefined, "delete from storage.objects where name='legacy/old.webp'"); check("flagship staff can delete a legacy un-prefixed object", x.n === 1, JSON.stringify(x)); }
check("fm staff cannot delete a legacy object", (await as("fmOwner", FM, "delete from storage.objects where name='legacy/old.webp'")).n === 0);
check("flagship staff cannot delete fm objects", (await as("flagOwner", undefined, `delete from storage.objects where name='${FM}/p1/mine.webp'`)).n === 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
