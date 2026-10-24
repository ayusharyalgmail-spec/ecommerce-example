# SECURITY.md

Security, privacy and threat model. Status: Draft v0.1. Consistent with DATABASE.md, ARCHITECTURE.md, API_SPEC.md, PRD.md.

---

## 1. Threat model

### Attackers and threats

| Threat | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Customer PII exfiltration (account takeover, breach) | Customer data loss, privacy violation, brand damage | High | RLS, session security, break-glass audit, backups, encryption |
| Vendor data theft (sales, customer records) | Competitor intelligence, privacy violation, vendor churn | Medium | RLS per vendor, isolated Supabase projects, audit logs |
| Order fraud (fake orders, overselling, refunds) | Revenue loss, fulfillment cost, cash loss on COD | High | Risk flags, rate limiting, stock reservations, manual verification |
| Payment fraud (manipulating totals, duplicate charges) | Direct loss, chargeback disputes | High | Server-side computation, RPC transactions, idempotency keys |
| DDoS / rate limit abuse | Service unavailable, infra cost | Medium | Rate limiting, CloudFlare (future), request throttling |
| Malware / XSS | Customer data theft, session hijacking | Medium | CSP headers, input escaping, no `eval`, secure cookies |
| SQL injection | Database compromise | Low | Parameterized queries, RPC, no string concatenation |
| Privilege escalation | Staff reads/modifies customer data | Medium | RLS + permission checks, audit logs, no admin backdoor |
| Operator abuse (break-glass) | Vendor customer data accessed without audit | Low | Time limits, logged sessions, documented procedure, operator training |
| Backup compromise | Data loss recovery failure, data theft | Low | Encrypted backups, separate storage, access controls |
| Dependency vulnerabilities | Code execution, data theft | Medium | Dependency scanning, regular updates, vendor support |

---

## 2. Authentication

### Identity

- **Google OAuth:** customers and staff sign in with Google.
- **Email binding:** staff accounts are bound to verified email addresses. An email can have only one staff account per vendor.
- **Guest checkout:** customers can buy without an account, tracked via phone number and a secret token.
- **Service role:** used only for cron jobs, worker, and break-glass; credentials are vaulted and not in source control.

### Sessions

- **Session storage:** Supabase SSR middleware provides secure httpOnly cookies with `Secure`, `SameSite=Strict`.
- **Token expiry:** session cookies expire after 24 hours of inactivity. Persistent "remember me" is not offered.
- **Refresh:** middleware automatically refreshes tokens before expiry.
- **Logout:** explicitly clears session cookies and invalidates the client's JWT.

### Multi-factor authentication (MFA)

Not required for MVP. Google's 2FA is the only recommended protection for staff accounts. Operator enforces this when onboarding vendors (SOP to be documented).

---

## 3. Authorization

### Permission model

Permission keys (authoritative source): `products.view`, `products.manage`, `orders.view`, `orders.manage`, `orders.verify_payment`, `orders.override_confirmation`, `customers.view`, `coupons.manage`, `delivery.manage`, `reviews.moderate`, `reports.view`, `csv.manage`, `staff.manage`, `settings.manage`, `audit.view`.

**Role defaults:**
- **Owner:** all permissions.
- **Manager:** all except `staff.manage`, `settings.manage`, `orders.override_confirmation`.
- **Staff:** `products.view`, `orders.view`, `orders.manage`. Extra permissions assigned by owner via `staff_members.permissions` array.
- **Customer:** no staff permissions; own data only.

### Enforcement layers

1. **RLS (Row Level Security):** every table has default-deny RLS policies. Policies check `auth.uid()` and permission via `app_private.has_permission(p)`.
2. **API layer:** every sensitive endpoint checks permission server-side before processing. Hiding UI elements is cosmetic only.
3. **Database layer:** no direct update/insert/delete on money, stock, status or snapshot columns. All go through RPC functions that re-check permission.

### Row-level access

- **Customers:** see only their own orders, addresses, wishlists, reviews, payment records.
- **Staff:** see products/orders/customers based on their permission. A staff member with `orders.view` but not `orders.manage` can see but not modify orders.
- **Operator:** no row access by default. Break-glass grants service-role access with audit trail.
- **Cross-vendor isolation:** RLS ensures a staff member or customer in Vendor A cannot see any data from Vendor B. This is enforced at the database level and requires each vendor to have a separate Supabase project (D-001).

---

## 4. Data protection

### Input validation

- **Zod schemas:** all user-submitted data is validated against schemas on the server.
- **Phone numbers:** normalized to E.164 and validated for Nepal `+977` prefix. E.164 storage prevents direct disclosure of country.
- **Text inputs:** max length enforced, no HTML tags (stripped or escaped on display).
- **Prices and stock:** never trusted from the client. Always recomputed server-side.
- **File uploads:** MIME type, size, and magic bytes validated. No executable formats allowed.

### Escaping

- **XSS prevention:** all user-generated content (product descriptions, reviews, names) is escaped on display. React's default escaping is used; `dangerouslySetInnerHTML` is forbidden in code review.
- **CSRF protection:** form submissions use CSRF tokens if the framework provides them (Next.js and Supabase SSR handle this automatically).

### SQL injection prevention

- **RPC only:** no raw SQL strings in the app. All sensitive operations are Postgres RPC functions with parameterized inputs.
- **ORM:** Supabase client provides parameterization; no string concatenation.

### File upload security

Path: `POST /uploads/sign` (get URL) → client uploads to Supabase Storage → `POST /uploads/finalize` (verify and attach).

- **Allowed MIME types:** image/jpeg, image/png, image/webp.
- **Max size:** 5 MB per object.
- **Magic bytes:** file is verified to match its declared type before finalization.
- **Filenames:** server-generated UUIDs; user input is not used in paths.
- **Access control:** signed URLs expire after 1 hour. Storage bucket ACLs enforce read access (public or private).

---

## 5. Checkout and payment security

### Idempotency

Every order creation request includes an `idempotencyKey` and a `requestHash` (SHA-256 of the request body). Duplicate requests with the same key and hash return the cached order. Different request (same key, different hash) returns `IDEMPOTENCY_CONFLICT`.

### Price and total protection

- **Quote:** prices are computed on the server and returned as display-only information.
- **Placement:** prices are recomputed at placement time. If a price changed, `PRICE_CHANGED` error is returned and the customer is asked to re-quote and confirm.
- **Snapshot:** order totals are stored on the order (immutable after insert); later price changes don't affect past orders.
- **Constraint:** database constraint on `orders` verifies `total = items - item_discount - coupon_discount + delivery_fee`.

### Stock and overselling prevention

- **Atomic reservation:** when an order is placed, stock is reserved in a single conditional UPDATE: `update products set reserved_quantity = reserved_quantity + qty where id = ... and status = 'published' and stock_quantity - reserved_quantity >= qty; if NOT FOUND raise exception`.
- **Check constraint:** `reserved_quantity <= stock_quantity` (checked at every transaction boundary).
- **Reservation ledger:** every reservation and release is logged in `stock_movements` table for audit.
- **Auto-release:** unconfirmed orders auto-cancel after a configurable timeout (default 24 hours), releasing reservations.

### Coupon abuse prevention

- **Per-customer limit:** enforced with a per-customer lock to serialize redemptions and check `redemption_count < per_customer_limit`.
- **Global limit:** atomic global counter checks `max_redemptions is null or redemption_count < max_redemptions` in the update statement.
- **Active window:** coupon is valid only if `now() between starts_at and ends_at` and `min_subtotal_paisa` is met.
- **Release on cancel:** if an order is cancelled, the coupon redemption is marked `released` and `redemption_count` is decremented.

### Duplicate order prevention

**Rate limiting:** 10 orders per minute per IP, 3 per minute per phone (database-backed).

**Risk flags:** orders are marked with risk flags if:
- Placed from a new IP address (no previous orders from this IP).
- Placed with a phone number that has >3 open orders.
- Placed from a phone number with a different customer name than before.
- COD orders placed from a shared device (heuristic: same IP + phone, different names in <10 minutes).

Risk-flagged orders are highlighted in the vendor's dashboard for manual review. Vendors can confirm or reject them.

### Manual payment security

- **No auto-verification:** a customer-submitted payment proof (screenshot) creates a `payment_records(status='submitted')` entry. It never becomes `verified` automatically.
- **Staff verification only:** only staff with `orders.verify_payment` can approve a proof and set it to `verified`. This is an RPC call and is audited.
- **Refund only by staff:** refunds are recorded by staff only, never by customer.

---

## 6. Operator access and break-glass

### Privacy promise

The platform operator (you) has **no standing access** to customer data. You manage the infrastructure but do not browse vendor records. Break-glass access is time-limited, logged and audited.

### Procedure

1. **Initiate:** operator runs a script `scripts/break-glass.sh --vendor=vendor-id --reason="customer data recovery" --duration=1h --ticket=TICKET-123`.
2. **Vaulting:** the script retrieves temporary Supabase credentials (service role) from a secrets manager (AWS Secrets Manager, GitHub Secrets, etc.).
3. **Time limit:** credentials are valid for the specified duration only (default 1 hour, max 4 hours).
4. **Audit record:** an entry is inserted into `break_glass_sessions` with operator label, reason, start/end times, and ticket reference.
5. **Log all queries:** every query made during a session is logged (via pgAudit or application logging).
6. **Post-session:** the script rotates the service-role credentials and invalidates old ones.
7. **Review:** weekly, operator or a manager reviews `break_glass_sessions` and logs to a secure log (not in app logs).

### Credential rotation

Service-role credentials are rotated monthly or after any break-glass session. Supabase allows generating new credentials; old ones are invalidated and removed from the environment.

### Vendor transparency

Each vendor receives a dashboard view showing break-glass sessions initiated for their account (date, duration, operator). This lets vendors know you accessed their data and why.

---

## 7. Rate limiting

Implemented via `rate_limit_hits` table (Postgres-backed) and checked in route handlers. Keys are hashed (IP, phone, user ID plus action) and stored with a sliding window.

| Endpoint | Limit | Window | Key |
|---|---|---|---|
| Checkout / place order | 10 req, 3 per phone | 1 min, 1 min | IP, phone |
| Guest tracking | 20 per IP, 50 per phone | 1 hour, 1 day | IP, phone |
| Login / signup | 5 failed | 15 min | IP |
| File upload | 5 initiations | 1 min | user ID |
| Password reset (if added) | 5 resets | 1 hour | email |

Exceeded limits return `429 Too Many Requests` with `Retry-After` header. Cleanup: rate limit counters are purged hourly.

---

## 8. Data privacy

### Retention policies

| Data | Retention | Reason | Deletion method |
|---|---|---|---|
| Customer orders, items, payments | Indefinite (or by regulation) | Accounting records | Contact vendor; pseudonymize after regulatory period |
| Customer PII on orders | Indefinite | Order fulfillment | Snapshot is immutable; `user_id` set to null on account deletion |
| Guest carts | 30 days idle | Temporary checkout data | Cron purge |
| Push subscriptions | Until revoked or 410 | Notification delivery | Manual revoke, auto-revoke on failure |
| Notification events | 90 days | Delivery history | Cron delete |
| Rate limit counters | 24 hours | Sliding window | Cron purge |
| Audit logs | 2 years minimum | Compliance and investigation | Retained in cold storage after 1 year |
| Payment proof images | 90 days after order complete | Tax / dispute evidence | Cron delete (secure) |

Vendor can request a GDPR-style data export or deletion. Operator coordinates with the vendor on compliance.

### Vendor data isolation

- One Supabase project per vendor.
- Operator credentials (project owner) are vaulted.
- Customers and staff cannot access other vendors' data.
- Backups are per-vendor and restored in isolation.

### Encryption

- **In transit:** HTTPS only.
- **At rest:** Supabase encrypts data at rest (EBS, backup). Customer data is not encrypted with a vendor-specific key; the security model relies on RLS and access controls.
- **Backup:** additional operator-managed backups are encrypted with a key stored separately.
- **Payment proofs:** stored in a private bucket; signed URLs are used to share.

---

## 9. Audit logging

**What is logged:**
- Order creation, status changes, cancellations.
- Payment verification, refunds.
- Stock adjustments, CSV imports.
- Staff invites, role changes, deactivations.
- Settings changes.
- Review moderation.
- Break-glass sessions and queries.
- Permission-denied events (access denied, forbidden operation).

**Format:** JSON, with timestamp, actor (staff ID), action, entity type, entity ID, before/after state (fields only, PII redacted), request ID.

**Retention:** 2 years minimum. Logs are not deleted; older logs are moved to cold storage (S3 Glacier).

**Access:** staff with `audit.view` can search logs via the dashboard. Retention and access policies are documented in the vendor handbook.

---

## 10. Dependency security

- **Scanning:** `npm audit` and Dependabot run on every PR. Dependencies with high-severity vulnerabilities are updated immediately.
- **Vendoring:** critical dependencies (Supabase, Next.js) are pinned to specific versions and updated monthly.
- **Transitive dependencies:** all transitive dependencies are in `package-lock.json` and checked in.

---

## 11. Infrastructure security

### Supabase

- **Auth:** Google OAuth only. Email/password auth is disabled.
- **RLS:** default deny on all tables. Allow only what is explicitly needed.
- **Service role:** key is stored in environment variables, never in code. Rotated monthly.
- **Backups:** enabled on paid plans. Encrypted by Supabase and stored separately.
- **API rate limiting:** Supabase provides rate limiting; additional app-level rate limiting via Postgres.

### Vercel

- **Deployments:** Git-based only. No manual code uploads.
- **Environment variables:** secrets are stored in Vercel's vault and not visible in logs or the UI.
- **Redundancy:** Vercel's edge network provides DDoS protection and failover.
- **Monitoring:** Vercel dashboards track errors, performance, deployments.

### DNS and domain

- **HTTPS:** automatic with Vercel (free Let's Encrypt).
- **MX records:** if email is added, SPF, DKIM, DMARC are configured to prevent spoofing.

---

## 12. Deployment and configuration

### Secrets management

**Never commit:**
- Supabase project keys or database credentials.
- OAuth secrets.
- VAPID keys.
- Payment gateway API keys (future).
- Operator break-glass credentials.

**Store in:**
- Vercel environment variables (production, staging).
- `.env.local` (local development, in `.gitignore`).
- GitHub Secrets (for CI/CD).
- AWS Secrets Manager or HashiCorp Vault (operator backup credentials).

### Code review

- All changes require a PR review.
- Security-sensitive changes (auth, permissions, payments, backups) require a second reviewer.
- Dependency updates are reviewed for breaking changes.

### Access controls

- **GitHub:** repository is private. Only core team has write access.
- **Vercel:** only operator and core team can deploy to production.
- **Supabase:** operator is the project owner. Staff do not have direct database access.

---

## 13. Incident response

### Security incident procedure

1. **Detection:** automated alerts (error rate spike, failed login attempts, unexpected database queries).
2. **Triage:** operator assesses severity and whether data is affected.
3. **Mitigation:** isolate the issue (block IP, revoke credentials, rollback code).
4. **Investigation:** review logs, check backups, identify root cause.
5. **Communication:** notify affected vendors (transparency).
6. **Remediation:** apply a fix, test, deploy.
7. **Post-mortem:** document the incident, identify systemic fixes.

### Recovery from data loss

1. **Detect:** monitoring alerts or vendor report.
2. **Verify:** connect to the vendor's Supabase project and check data.
3. **Restore:** retrieve the latest backup from the encrypted backup store.
4. **Test:** restore to a new project, verify row counts and sample data.
5. **Activate:** repoint the vendor's environment variables to the restored project.
6. **Notify:** inform the vendor and confirm recovery.

---

## 14. Security testing

| Test | Phase | Frequency |
|---|---|---|
| Zod schema validation | Phase 2 | Every commit |
| RLS policies (anon vs user vs staff) | Phase 1 (database tests) | Every commit |
| Permission enforcement (API layer) | Phase 5 | Every commit |
| Rate limiting | Phase 4 | Every commit |
| OWASP top 10 (manual) | Phase 8 | Before go-live |
| Dependency audit | Ongoing | Weekly |
| Penetration test (optional) | Phase 8 | Before commercial launch |

---

## 15. Security checklist (pre-production)

- [ ] Google OAuth configured with verified redirect URLs (allow list).
- [ ] HTTPS enabled on all routes.
- [ ] Session cookies are httpOnly, Secure, SameSite=Strict.
- [ ] All tables have RLS policies (default deny).
- [ ] Permission checks are in every API endpoint.
- [ ] Prices, stock, totals are recomputed server-side.
- [ ] File uploads are validated (MIME, size, magic bytes).
- [ ] Rate limiting is configured and tested.
- [ ] Break-glass procedure is documented and tested.
- [ ] Audit logs are populated and queryable.
- [ ] Secrets are in environment variables, not in code.
- [ ] Backups are encrypted and restorable.
- [ ] Error messages do not leak PII or secrets.
- [ ] OWASP top 10 checklist is completed.
- [ ] Dependencies are up-to-date and have no high-severity vulns.
- [ ] Vendor handbook includes security policies (privacy, data retention, incident reporting).

---

## 16. Assumptions and open questions

1. **Penetration testing:** recommended before commercial launch but not included in MVP. Phase 8 evaluates necessity.
2. **Bug bounty program:** decided case-by-case based on vendor scale and risk appetite. Not planned for MVP.
3. **Security incident response team:** defined as operator + core developers. Escalation to external security firm if breach is suspected.
4. **Compliance (GDPR, local):** operator is responsible for compliance based on vendor location and vendor's own obligations. Vendor handbook documents data handling. Confirm with legal counsel before commercial use.
5. **Cyber insurance:** optional, to be evaluated based on business model and risk.


---

## 17. Multi-tenant isolation (migration `20261024150000_tenant_isolation`, NOT yet applied)

One Supabase project now serves the flagship store (`ecommerce`), vendor stores and the hub directory. Isolation is enforced in Postgres, never by hiding UI.

**Who may act for which store**

| Table / function | Meaning |
|---|---|
| `tenants` (+ `features jsonb`, `status`) | A store. Public read only while `status = 'active'`. Clients cannot insert or delete; owners edit content columns only (not `status`, `slug`, `custom_domain`, `owner_id`, `features`). |
| `tenant_members (tenant_id, user_id, role)` | Membership. Mirrored from `staff_members` by trigger; readable by the member, the tenant owner/manager and platform admins; **no client writes**. |
| `platform_admins` | No client access at all (grants revoked). Reached only through `is_platform_admin()` and the `platform_*` RPCs. |
| `public.is_platform_admin()`, `public.is_tenant_member(p_tenant_id, p_roles)` | `SECURITY DEFINER`, `SET search_path = public`, EXECUTE for `anon`/`authenticated` (they only answer about the caller). |
| `app_private.has_permission(p, tenant)` | Per-tenant staff permission. The one-argument form means "in the current tenant", so every existing policy and RPC became tenant-aware. |

**Which store is a request for?** `app_private.current_tenant_id()`: the transaction-local `app.tenant_id` pinned by `quote_checkout`/`place_order`, else the `x-tenant-id` header set by the browser client, else the flagship. An unknown or malformed id yields `NULL`, so every scoped table returns **no rows** (fail closed). The header only *selects* a tenant; permission is still checked against membership of that tenant, so a forged header grants nothing (tested).

**Every store table** has `tenant_id uuid NOT NULL` (FK to `tenants`, indexed, default `current_tenant_id()`) and a **RESTRICTIVE** policy `tenant_scope` that is ANDed with the existing policies: rows must belong to the current tenant, and the public sees only active tenants (members and platform admins also see their own draft or suspended ones). `profiles` (global identity) and `rate_limit_hits` (infrastructure) are intentionally not tenant-scoped. Uniqueness that was global is now per tenant (`categories.slug`, `coupons.code`, `products.slug/sku`, `orders.order_number`, ledger phone); `store_settings` is one row per tenant (PK `tenant_id`).

**Checkout.** `quote_checkout(p_tenant_id, ...)` and `place_order(p_tenant_id, ...)` reject an unknown or inactive tenant (`NOT_FOUND`), pin the tenant, then run the unchanged pricing code, which now only sees that tenant's products, zones, coupons and settings. A product, zone or coupon of another tenant is `NOT_FOUND` / `COUPON_UNAVAILABLE`; coupons require the `coupons` feature; `MIN_QUANTITY` applies only with the `min_order_qty` feature. Prices and totals stay server-side; idempotency keys and replay are untouched. The old signatures remain as internal cores with EXECUTE revoked from clients.

**Storage** (`product-images`, `store-assets`, `payment-proofs`): new objects must be under `<tenant_id>/...` and the uploader needs the matching permission **in that tenant**; payment proofs are accepted only for active tenants. Pre-existing un-prefixed objects stay readable and are deletable only by the flagship's staff. `tenant-assets` keeps its hardened `tenants/<tenant_id>/...` contract from the control-plane baseline.

**Admin guard.** `RequireStaff` (route) plus the per-tenant `staff_members` read in `AuthProvider`: a signed-in user who is not staff *of this store* sees "Unauthorized for this store". The database remains the authority.

**Tests.** `node supabase/tests/tenancy.mjs` (70 checks, all migrations applied in order, idempotent re-run) and `node supabase/tests/rls.mjs` (79 checks, tenant tables). Both need `npm i --no-save @electric-sql/pglite` and cover SQL, RLS and grants only, not PostgREST, Auth or Storage.

**Known gaps (close before onboarding a second REAL vendor)**
1. Messaging (`msg_*`) and ledger RPCs are tenant-scoped through RLS and `has_permission`, but some unique keys (`msg_preferences`, `msg_conversations`) are still per user. Keep `messaging` and `ledger` off for vendors until reviewed.
2. The `x-tenant-id` header must be allowed by the project's CORS config; verify on the live project.
3. Staff RPCs resolve the tenant from the header, not from the row they touch; the guard is the restrictive policy plus `has_permission` on the current tenant. A per-RPC row/tenant assertion would be defence in depth.
4. `staff_members` is still one row per user (one store per staff account).
