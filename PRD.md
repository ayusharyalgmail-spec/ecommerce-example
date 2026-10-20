# PRD.md

Product Requirements Document. Status: Draft v0.1. Consistent with DATABASE.md, ARCHITECTURE.md v0.1.

---

## 1. Product vision

A reusable, white-label e-commerce platform for local vendors in Nepal, deployed as separate instances with the same codebase. Customers shop on a mobile-first PWA; vendors manage inventory, orders and analytics from a dashboard; the operator hosts and maintains all deployments from one Git repository.

---

## 2. Problem statement

- **For vendors:** existing e-commerce platforms are expensive, slow, and built for global sellers. Local shopkeepers in Nepal need a simple, fast, offline-capable storefront, in Nepali, with COD payment, local delivery and phone-based customer support.
- **For customers:** shopping via WhatsApp or phone is slow and error-prone. They want product images, stock visibility, order tracking and a receipt.
- **For you (the platform operator):** building separate storefronts for each vendor is not scalable. You need one reusable codebase, simple deployment and low hosting cost.

---

## 3. Target customers

**Primary:** local retail vendors in Kathmandu Valley and surrounding districts. Bookstores, pharmacies, electronics shops, clothing stores, vegetable retailers. Annual revenue $5,000–$50,000. 1–3 staff. Limited tech fluency.

**Secondary:** vendors in other parts of Nepal and South Asia who speak Nepali.

---

## 4. User personas

| Persona | Goals | Pain points | Technical skill |
|---|---|---|---|
| **Vendor owner (Ramesh)** | Sell online, reduce phone orders, track sales | No time for tech support; fearful of losing money; wants to understand platform fees | Low |
| **Vendor manager (Asha)** | Run daily operations: approve orders, check stock, manage staff | Needs clear workflows; wary of mistakes; wants instant notifications | Low-moderate |
| **Vendor staff (Rajesh)** | Pick and pack orders correctly | Needs clear order details and printer-friendly invoices | Very low |
| **Customer (Priya)** | Browse, buy, get delivery, track order | Wants to use her phone (Android), see photos and prices, know when it arrives | Low-moderate |
| **Guest customer (Amit)** | Buy one item without signup | Wants to check out fast and track via phone number | Low |
| **You (platform operator)** | Manage up to 50 vendor deployments | Need one codebase, simple upgrades, clear audit trails, no silent access to vendor data | High |

---

## 5. Business model

- **Revenue:** monthly or yearly subscription per vendor (pricing in DEPLOYMENT.md worksheet).
- **Costs:** Supabase ($25–35/month per vendor), Vercel ($20–40/month per vendor), your time and hosting infrastructure.
- **Timeline:** demo and first 2–5 vendors in year 1; scale to 20–50 if demand and retention allow.
- **Risk:** vendors expect low cost and high reliability. A data loss or a major bug spreads quickly by word of mouth. You manage all backups and support requests.

---

## 6. Goals and success metrics

| Goal | Metric |
|---|---|
| Vendors adopt the platform | 5 signups in year 1; 20+ by year 2 (TBD based on cohort retention) |
| Reliability | 99.5% uptime per vendor; <1 minute mean time to customer-visible error |
| Speed | Storefront loads in <2s on 4G; checkout in 3 requests |
| Adoption | 10+ orders/week per vendor within 3 months of launch |
| Customer satisfaction | Order accurate, delivery on time, tracking clear |
| Operator time | One person can maintain 20–50 vendor deployments with monthly reviews and on-call support |
| Localization | All customer pages and dashboard in Nepali and English without hardcoded strings |
| Privacy | Vendors believe their customer data is private. No operator standing access to PII. Audited break-glass only. |

---

## 7. Non-goals

- Machine learning, recommendation engines, or sophisticated analytics (Phase 7 has simple charts; ML is a future enhancement).
- Video, live chat, or live notifications (Web Push is enough for MVP).
- Multi-vendor marketplace (one codebase, one vendor per deployment).
- Buyer protection or escrow (manual payment and COD mean no stored funds).
- Inventory sync with offline point-of-sale (possible future feature, not MVP).
- Shipping integration (vendor manages delivery; platform tracks status manually).
- Translation (English and Nepali only).
- Mobile app (PWA is installable).
- Internationalization beyond Nepal's timezone and currency (NPR, Gregorian dates, optional Nepali numerals).

---

## 8. Functional requirements

Organized by ID prefix. Each requirement is testable.

### AUTH: Authentication and authorization

| ID | Requirement | Acceptance |
|---|---|---|
| AUTH-001 | Google OAuth sign-in for customers | Customer can sign in via Google, receive a session and see their account. |
| AUTH-002 | Guest checkout without sign-in | A customer can add to cart and checkout with name, phone, address without creating an account. |
| AUTH-003 | Staff sign-in and role assignment | An owner can invite staff via email. Staff sign in with Google, receive a role (manager, staff) and see only permitted data. |
| AUTH-004 | Role-based permissions (customer, staff, owner) | Permissions are enforced server-side. A staff member with `products.view` but not `orders.manage` cannot modify orders even if they try to POST. |
| AUTH-005 | Admin password-protected override (deprecated) | Not used. Permissions from `staff_members` table only. |
| AUTH-006 | Logout and session expiry | Sessions expire after 24 hours idle or on logout. A vendor-specific `store_settings.deployed_version` and refresh-check prevent stale clients from using old versions. |

### PROD: Product catalog

| ID | Requirement |
|---|---|
| PROD-001 | Create, edit, archive products (owner/manager with `products.manage`). |
| PROD-002 | Product fields: English and Nepali names and descriptions, SKU, price, discount price, discount label, stock quantity. |
| PROD-003 | Organize products into categories (max 2 levels deep). |
| PROD-004 | Upload multiple images per product (up to 10). Support file picker and camera capture on compatible devices. |
| PROD-005 | Preview, reorder and remove product images. |
| PROD-006 | Publish and unpublish products. Only published products appear on the storefront. |
| PROD-007 | Product listing page with search, filtering by category, sorting by price and date added. Pagination. |
| PROD-008 | Product detail page with all images, full description, rating, review count, and related products. |
| PROD-009 | Stock indicators: show available quantity, low-stock warning label when stock - reserved < 5 (configurable). |
| PROD-010 | Purchase count shown on product card (units delivered in past 30 days). |
| PROD-011 | Full-text search in English and Nepali product names and descriptions. Fuzzy/typo-tolerant for English. |
| PROD-012 | Localization: all catalog text appears in the customer's chosen language; fall back to English if Nepali not provided. |
| PROD-013 | SEO and social sharing previews: `<meta>` tags for product title, description, image, price. |
| PROD-014 | CSV import: staff can upload a CSV to add/update products in bulk. |
| PROD-015 | CSV export: download all products in CSV format for backup or editing. |

### CART: Shopping cart

| ID | Requirement |
|---|---|
| CART-001 | Add to cart: customer selects quantity, item is added. |
| CART-002 | View cart: list all items with name, image, price, quantity, total. |
| CART-003 | Edit cart: change quantity, remove items. |
| CART-004 | Persistent cart: items are kept if the customer closes the browser and returns within a week. |
| CART-005 | Guest cart: persisted via a secure random token in a cookie, not tied to an account. |
| CART-006 | Cart is cleared after a successful order. |
| CART-007 | Clear entire cart: button to remove all items. |
| CART-008 | Price never shown as stale: cart display always refreshes product prices live. |

### WISH: Wishlist

| ID | Requirement |
|---|---|
| WISH-001 | Logged-in customers can save products to a wishlist. |
| WISH-002 | Wishlist is persistent and private. |
| WISH-003 | Move to cart from wishlist. Remove from wishlist. |
| WISH-004 | Share a wishlist link (read-only). |

### CHECKOUT: Checkout and orders

| ID | Requirement |
|---|---|
| CHECKOUT-001 | Quote endpoint: given cart items, delivery zone and coupon, return calculated prices (display only). Recomputed at placement. |
| CHECKOUT-002 | Order placement: customer provides contact (name, phone), shipping address, payment method (COD or manual). |
| CHECKOUT-003 | Delivery zones: vendor defines named zones (e.g., "Kathmandu Valley") with fees and free-delivery thresholds. |
| CHECKOUT-004 | Delivery fee logic: free if subtotal (after discounts) exceeds zone threshold; else zone fee. Thresholds are zone-specific or store default. |
| CHECKOUT-005 | Coupon validation: valid period, minimum subtotal, per-customer limit, global limit, available uses. |
| CHECKOUT-006 | Discount application: percent or fixed coupon applied after item discounts, capped at a maximum. |
| CHECKOUT-007 | Order totals are calculated server-side and never trusted from the browser. |
| CHECKOUT-008 | Idempotency: repeating the same checkout request returns the same order; a different request is rejected as a conflict. |
| CHECKOUT-009 | Price changes between quote and placement: if prices changed, the quote is recalculated and shown; customer confirms again. |
| CHECKOUT-010 | Stock check: order is rejected if an item is no longer in stock. |
| CHECKOUT-011 | Inventory reservation: stock is reserved atomically when the order is placed. Overselling is prevented. |
| CHECKOUT-012 | Risk scoring: orders are flagged for review if placed from a new IP, a repeated phone number with different names, or from more than one phone in a short window. |
| CHECKOUT-013 | Order number: a unique, memorable order number is generated (ORD-XXXXXX format). |
| CHECKOUT-014 | Tracking token: an unguessable token is generated and returned once. The customer uses this token or order number + phone to track the order. |
| CHECKOUT-015 | Guest tracking: a customer without an account can track their order via a secure link containing the token. Fallback is order number + phone with rate limiting. |
| CHECKOUT-016 | Rate limiting: checkout and order creation are rate-limited per IP and per phone number. |
| CHECKOUT-017 | Duplicate prevention: a customer cannot place two identical orders within 10 minutes from the same IP. |

### PAY: Payments

| ID | Requirement |
|---|---|
| PAY-001 | Cash on delivery (COD): customer pays the delivery person. Order placed with status `pending_confirmation`. |
| PAY-002 | Manual payment: customer follows vendor-provided instructions (bank account, eSewa, Khalti, QR code, etc.). Vendor manually verifies and uploads proof. |
| PAY-003 | Payment proof upload: customer or vendor can upload a payment receipt screenshot. |
| PAY-004 | Payment verification: vendor reviews proof and marks payment as verified or rejected, with a note. |
| PAY-005 | No false verification: system never auto-marks a payment as verified. Vendor action only. |
| PAY-006 | Payment vs order status independence: an order can be `confirmed` while payment is `awaiting_verification`. Order and payment progress are tracked separately. |
| PAY-007 | Refund recording: vendor can record a refund for an order, updating `payment_status` to `refunded`. No gateway integration; manual bookkeeping only. |
| PAY-008 | Gateway extensibility: the code structure allows a future payment gateway (eSewa, Khalti) to be plugged in behind the `payment_records` model. |

### ORD: Order management (customer)

| ID | Requirement |
|---|---|
| ORD-001 | Order history: logged-in customer sees all their past orders with summary (date, total, status, last update). |
| ORD-002 | Order detail: customer can view an order with all items, prices, delivery address, contact, status timeline and payment status. |
| ORD-003 | Order tracking (logged-in): customer sees current status, estimated delivery, and a timeline of status changes. |
| ORD-004 | Order tracking (guest): accessible via a secure link (token) or order number + phone (rate-limited). Shows the same information as logged-in tracking, no login required. |
| ORD-005 | Order cancellation (customer): a customer can request cancellation of a `pending_confirmation` order only. Staff must approve cancellations in later states. |
| ORD-006 | Printable invoice: a PDF invoice can be generated and printed, with order details, items, totals, delivery address, and store policies. |
| ORD-007 | Invoice includes vendor PAN/VAT fields (if provided). |
| ORD-008 | Localized invoice: invoice is printed in the customer's chosen language. |
| ORD-009 | Product sharing: customer can share a product link via WhatsApp or copy a deep link. |
| ORD-010 | WhatsApp contact: a "Contact vendor" button opens a WhatsApp conversation with a pre-filled message (storefront name + order ID if applicable). |

### ADMIN: Vendor dashboard and order management

| ID | Requirement |
|---|---|
| ADMIN-001 | Dashboard overview: total orders, pending, confirmed, dispatched, delivered, cancelled, plus monthly sales chart and top products. |
| ADMIN-002 | Order queue: staff see new orders grouped by status. Sort, search (order number or customer phone), filter by status and date. Pagination. |
| ADMIN-003 | Order detail: full order info, customer contact, delivery address, all items with names and images, totals, payment status, status timeline. |
| ADMIN-004 | Order status transitions: staff change status (pending → confirmed → processing → dispatched → delivered). Only permitted transitions are allowed. |
| ADMIN-005 | COD confirmation: for COD orders in `pending_confirmation`, staff mark the order as confirmed after a verification call. |
| ADMIN-006 | Order notes: staff can add internal notes to an order (visible to staff only, not the customer). |
| ADMIN-007 | Risk flags: orders marked as risky (repeated phone, new IP, etc.) are highlighted in the queue. Staff can review and confirm or reject. |
| ADMIN-008 | Printable invoice: staff can print an invoice for packing and delivery. |
| ADMIN-009 | Customer search: staff can find a customer by phone number and see their orders and contact info. Permission: `customers.view`. |
| ADMIN-010 | Low-stock alerts: a widget shows products below the low-stock threshold. Configurable threshold per product and store default. |
| ADMIN-011 | Product management: owner/manager with `products.manage` can create, edit, publish products (same as PROD-001 to PROD-006). |
| ADMIN-012 | Stock adjustments: staff with `products.manage` can manually add or remove stock (for example, for returned items or inventory count). Each change logs a reason. |
| ADMIN-013 | Coupon management: owner/manager creates, edits, disables coupons. Set code, type (percent/fixed), value, validity window, limits. |
| ADMIN-014 | Delivery zone configuration: owner/manager defines zones, fees, free-delivery thresholds. |
| ADMIN-015 | Staff management: owner invites staff, assigns roles and extra permissions. Deactivate staff. View staff activity. |
| ADMIN-016 | Sales reports: totals by period, sales by product, revenue vs cost of goods (if tracked), AOV (average order value). |
| ADMIN-017 | Settings: store name, logo, contact info, WhatsApp, payment instructions, delivery defaults, notification preferences, language, currency. |
| ADMIN-018 | Notification preferences: staff choose which alerts they receive (new order, payment needed, low stock, etc.). |
| ADMIN-019 | Notification history: staff can see a log of notifications sent (type, time, status). |
| ADMIN-020 | Audit log access: owner with `audit.view` can see sensitive actions (payment verified, order cancelled, staff invited, settings changed). |
| ADMIN-021 | CSV export: download all orders as CSV for accounting. |
| ADMIN-022 | CSV import: bulk upload products (PROD-014). |
| ADMIN-023 | Mobile usability: dashboard is usable on a phone. Navigation, forms and tables respond to small screens. |

### REV: Reviews and ratings

| ID | Requirement |
|---|---|
| REV-001 | Customers who have received an order can submit a review of a product in that order. |
| REV-002 | Review form: rating (1–5 stars), title (optional), body (max 2000 characters). |
| REV-003 | Reviews are moderated: on submission, status is `pending`. Vendor approves, rejects or hides. |
| REV-004 | Verified purchaser label: approved reviews tied to a delivered order show a badge. |
| REV-005 | Product rating: average rating and count are shown on product pages. |
| REV-006 | Product rating is recalculated on approve/reject/hide. |
| REV-007 | Moderation queue: staff with `reviews.moderate` see pending reviews in a dashboard with the product, customer, text and the ability to approve, reject or hide. |
| REV-008 | Review display: approved reviews are shown on product pages, sorted newest first, with rating, title, body, verified-purchaser badge, and the reviewer's name (first initial + last name). |

### NOTIF: Notifications and alerts

| ID | Requirement |
|---|---|
| NOTIF-001 | Web Push: customers and staff can opt in to browser notifications. Notifications are also visible in the dashboard. |
| NOTIF-002 | Push permission: app requests permission on first relevant interaction. Permission denial is graceful; no critical feature is notification-only. |
| NOTIF-003 | Service worker: notifications are displayed even if the app is closed, if the browser tab is closed and the PWA is installed. |
| NOTIF-004 | Notification types: order placed, order confirmed, order dispatched, order delivered, order cancelled, payment needed, low stock, review pending moderation. |
| NOTIF-005 | Customer notifications: "Your order has been dispatched" to the customer who placed the order. |
| NOTIF-006 | Staff notifications: "New order" to all staff with `orders.view` and a matching preference. |
| NOTIF-007 | Notification preferences: customers and staff can choose which types they receive. |
| NOTIF-008 | Notification content: no sensitive data (customer addresses, phone numbers, full totals) in the notification body. Notification is a signal to check the app. |
| NOTIF-009 | Notification delivery: notifications are reliably queued and delivered with retries. The system records whether it was submitted to the push service, not whether it was seen. |
| NOTIF-010 | Notification deep links: clicking a notification opens the relevant page (order detail for a customer, order queue for staff). |
| NOTIF-011 | Notification history: customers and staff see a log of recent notifications in the dashboard. |
| NOTIF-012 | Offline notification display: if the network is offline when a notification arrives, the device's notification center still shows it. |

### PWA: Progressive Web App

| ID | Requirement |
|---|---|
| PWA-001 | Installable: users can install the storefront as an app on their home screen (Android, desktop). |
| PWA-002 | Manifest: web app manifest includes store name, logo, theme color, icon variants (192px, 512px). |
| PWA-003 | Service worker: static assets are cached for offline viewing; API calls require the network. |
| PWA-004 | Offline fallback: if the network is offline, a "You're offline" page is shown for dynamic content. Previously loaded public pages may work. |
| PWA-005 | Update prompt: when a new version is available, the app prompts the user to reload. |
| PWA-006 | Cache strategy: never cache order history, account, cart, checkout, payments or private data. Network-first for HTML. Stale-while-revalidate for static assets. |
| PWA-007 | Push subscription: the service worker subscribes to push on installation and syncs subscriptions to the backend. |

### I18N: Internationalization

| ID | Requirement |
|---|---|
| I18N-001 | Language support: English and Nepali interface text. |
| I18N-002 | No hardcoded strings: all user-visible text comes from translation dictionaries (JSON files). |
| I18N-003 | Translation completeness: every page and error message is available in English and Nepali. |
| I18N-004 | Locale detection: browser defaults to the store's default locale or the browser's preferred locale. User can switch at runtime. |
| I18N-005 | Nepali font: Devanagari text is rendered with a web font (for example Noto Sans Devanagari) and has sufficient line-height and letter-spacing. |
| I18N-006 | RTL: text direction is left-to-right for both English and Nepali. (Nepali is not RTL; this is listed for completeness.) |
| I18N-007 | Date and number formatting: dates use Gregorian calendar; numbers and prices use NPR; optional Nepali numerals. |
| I18N-008 | Form validation messages: validation errors are localized. |
| I18N-009 | Order statuses and payment statuses are localized. |
| I18N-010 | Invoice is printed in the customer's language. |
| I18N-011 | Email communications (if added later) are localized. |

### SECURE: Security and privacy

| ID | Requirement |
|---|---|
| SECURE-001 | HTTPS: all communications are encrypted. |
| SECURE-002 | Session cookies: HttpOnly, Secure, SameSite=Strict. |
| SECURE-003 | CSRF protection: form submissions use CSRF tokens. |
| SECURE-004 | Rate limiting: checkout, order creation, guest tracking, login failures are rate-limited per IP and per phone. |
| SECURE-005 | Input validation: all user inputs (names, addresses, phone numbers, emails, file uploads) are validated server-side. |
| SECURE-006 | SQL injection prevention: parameterized queries and RPC functions (no string concatenation). |
| SECURE-007 | XSS prevention: all user-generated content is escaped on display. |
| SECURE-008 | File upload validation: MIME type, size, magic bytes. No executable uploads. |
| SECURE-009 | Order ID enumeration prevention: order lookup requires the tracking token or order number + phone verification. |
| SECURE-010 | Permission checks: every sensitive action is checked server-side, not just the UI. |
| SECURE-011 | Audit logging: sensitive actions (payment verification, staff changes, settings changes, break-glass access) are logged. |
| SECURE-012 | Operator access: no standing access to vendor customer data. Break-glass access is time-limited and logged. |
| SECURE-013 | Secrets management: API keys, database credentials, VAPID keys are stored in environment variables (not in the repo). |
| SECURE-014 | Backup security: encrypted backups, stored separately from the production database. |

### PERF: Performance

| ID | Requirement |
|---|---|
| PERF-001 | Storefront load: home and product list pages load in <2 seconds on 4G (Lighthouse score >80). |
| PERF-002 | Checkout: quote and place-order requests complete in <1 second. |
| PERF-003 | Images: product images are optimized (WebP, lazy-loaded, responsive). |
| PERF-004 | Search: full-text search returns results in <500ms for typical queries. |
| PERF-005 | Dashboard load: order queue and analytics load in <2 seconds. |
| PERF-006 | Database indices: queries used by the storefront, checkout and dashboard are indexed. |
| PERF-007 | Caching: public catalog data is cached with a 1-hour revalidation window. |
| PERF-008 | Rate limiting: login attempts, checkout, and guest tracking do not block valid users. |

---

## 9. Non-functional requirements

| Aspect | Requirement |
|---|---|
| Availability | 99.5% uptime SLA per vendor per month. |
| Recovery | Any vendor's data can be restored from backup within 24 hours without affecting other vendors. |
| Scalability (within scope) | One deployment can handle 50+ products, 10,000+ orders per month, and 100+ concurrent checkout attempts. |
| Maintainability | One developer can deploy updates to all vendors monthly. Code is linted, typed and tested. |
| Localization | English and Nepali interface and data. |
| Accessibility | WCAG 2.1 AA compliance where feasible (alt text on images, form labels, color contrast, keyboard navigation). |
| Mobile-first | Android and iOS browsers; PWA installable; responsive design. |
| Browser support | Modern browsers (Chrome, Firefox, Safari, Edge, and Samsung Internet on Android). |
| Network resilience | Graceful degradation when offline or on slow networks. |
| Logging and monitoring | Structured JSON logs, error tracking, uptime monitoring per vendor. |

---

## 10. User stories and acceptance criteria

### Customer user stories

**US-001: Browse products**
- As a customer, I can view a list of products in a category, sorted and filtered.
- *AC:* Product cards show name, image, price, discount (if any), and stock status. Search returns results in <500ms. Pagination works on slow networks.

**US-002: Add to cart and checkout**
- As a customer, I can add items to my cart and proceed to checkout without creating an account.
- *AC:* Cart persists if the tab is closed. Checkout form accepts name, phone, address. Order number is returned with a tracking link. Confirmation page shows the tracking link and a reference to check via phone number.

**US-003: Track order**
- As a customer, I want to know where my order is at any time.
- *AC:* Tracking page (via link or order number + phone) shows current status, timeline, and estimated delivery. Updates appear within 1 minute of a status change.

**US-004: Review a product**
- As a customer who received an order, I can leave a rating and comment.
- *AC:* Review form is accessible from order detail or product page (after delivery). Review shows as pending until approved. Average rating updates on approval.

### Vendor user stories

**US-101: Manage products**
- As an owner, I can add, edit, and publish products with images.
- *AC:* Product form accepts English and Nepali names/descriptions. Images are uploaded and previewed. Stock is set. Product appears on the storefront when published.

**US-102: Confirm orders**
- As a staff member, I want to confirm orders after a verification call.
- *AC:* New orders appear in a queue. A COD order in `pending_confirmation` can be marked confirmed after the vendor confirms receipt via phone. The customer is notified.

**US-103: Process orders**
- As a staff member, I can transition an order through dispatch and delivery.
- *AC:* Status buttons enforce allowed transitions. Dispatching an order decrements stock. Delivering counts units sold and records payment (COD). A printable invoice is generated.

**US-104: Manage staff**
- As an owner, I can invite managers and staff, assign permissions, and deactivate them.
- *AC:* Invite email includes a sign-in link. Staff role limits which data they see (e.g., staff with `orders.view` but not `products.manage` cannot edit products). Audit log records invites and role changes.

**US-105: Monitor sales**
- As an owner, I want to see sales trends and top products.
- *AC:* Dashboard shows revenue by week/month, order count, average order value, and a list of best-selling products. All numbers come from delivered orders.

### Operator user stories

**US-201: Deploy a new vendor**
- As the operator, I can create a new Supabase project and Vercel deployment for a vendor with one script.
- *AC:* Script creates a project, runs migrations, sets up Auth, creates the owner account, seeds default zones, and sets environment variables. Vendor's dashboard is accessible immediately.

**US-202: Upgrade all vendors**
- As the operator, I can deploy a new version of the app to all vendors in sequence, with a staging check first.
- *AC:* `npm run release --version 2.1.0` migrates and deploys each vendor one at a time. A failure stops the rollout and reports the error. `store_settings.deployed_version` records the deployed version.

**US-203: Restore vendor data**
- As the operator, I need to restore a vendor from a backup if something goes wrong.
- *AC:* A backup script restores a database snapshot to a new Supabase project. Environment variables are repointed to the restored project. Testing confirms data integrity. A rollback takes 30 minutes or less.

---

## 11. User journeys

### Happy path: Guest buys an item

1. Customer opens storefront on their phone.
2. Browses products, searches for "book".
3. Clicks on a book, sees images and description.
4. Adds to cart.
5. Taps "Checkout" and fills in name, phone (e.g., 9812345678), address, and chooses COD.
6. Reviews the quote (items, discount if any, delivery fee, total).
7. Taps "Place order" and receives confirmation with order number (ORD-123456) and a tracking link.
8. Confirmation page explains: "Vendor will call you to confirm. Check your order status via [link]."
9. Vendor calls to confirm; the vendor marks the order as confirmed in the dashboard.
10. Customer sees status change to `confirmed` on the tracking page.
11. Vendor picks, packs, and marks the order `dispatched`.
12. Customer sees a notification and the status is now `dispatched` with an estimated delivery date.
13. Delivery person arrives; customer checks the order details on the tracking page to confirm the amount.
14. Delivery person collects cash; vendor marks the order as `delivered` in the dashboard.
15. Customer gets a notification and sees `delivered`. The tracking page shows a "Get receipt" button.
16. Customer downloads or prints the receipt.
17. Later, the customer writes a review: "Great book, arrived on time."
18. Review awaits vendor approval and then appears on the product page.

### Unhappy path: Stock runs out

1. Customer adds the last item in stock to cart.
2. Another customer places an order for the same item at the same time.
3. First customer's reservation succeeds; second customer's fails.
4. First customer gets to checkout; second customer sees "Out of stock" and is offered a wishlist option.
5. Second customer adds to wishlist and leaves.

### Operator path: Deploy a fix

1. A bug is reported: order status does not update immediately.
2. Operator branches from `main`, fixes it, and opens a PR.
3. CI runs tests and linting. All pass.
4. PR is merged. A tag `v2.1.1` is pushed.
5. Operator runs `npm run release --version 2.1.1 --stage-first`.
6. Script deploys to staging Supabase + Vercel, runs smoke tests, prompts "Proceed to production? [y/n]".
7. Operator says "yes".
8. Script deploys to vendor A's Supabase (migrations first, then Vercel), records version, pauses 2 minutes.
9. Script deploys to vendor B, C, D, … one by one.
10. Operator gets a summary: "5 vendors updated to v2.1.1. All healthy."

---

## 12. Error states and recovery

| Scenario | What the user sees | Recovery |
|---|---|---|
| Cart item out of stock | Red warning on cart item; option to remove or save to wishlist | Customer removes item or tries again later |
| Order placement fails due to price change | Quote is recalculated and shown; customer is asked to confirm again | Confirm again or cancel |
| Order placement fails due to coupon invalid | Clear error: "Coupon has expired" or "You have already used this coupon 1 time(s)" | Remove coupon and retry |
| Payment proof upload fails | "File too large" or "File type not supported" (JPEG, PNG, WebP only, max 5 MB) | Choose a different file |
| Network timeout during checkout | "Network error. Try again?" message with a retry button. Idempotency key prevents duplicates. | Retry automatically or manually |
| Guest tracking page not found | "Order not found. Check the number and phone or try the link again." No indication that the phone/number is wrong (uniform error). | Retry with correct details or contact vendor |
| Vendor's store is down for maintenance | "Store is temporarily unavailable. Check back soon." | Wait or contact vendor |
| Notification permission denied | Notifications are optional. Customer can still track on the tracking page. | No action needed; dashboard still shows notifications |

---

## 13. Localization requirements

- **Languages:** English (en) and Nepali (ne).
- **Scope:** all user-visible text, including form labels, button text, status labels, error messages, notifications, invoices.
- **Missing translations:** if a translation is missing, the app falls back to English. A test fails if any key is missing.
- **Nepali font:** Noto Sans Devanagari (or equivalent) is served from a CDN with a local fallback, with `font-display: swap` so text is readable while loading.
- **Date format:** Gregorian calendar (DD/MM/YYYY or YYYY-MM-DD based on locale). Nepali numerals (०–९) are optional and hidden behind a setting.
- **Currency:** NPR (Nepali Rupees). Displayed as "Rs. 1,234" or "1234 NPR".

---

## 14. Definitions and scope clarifications

| Term | Definition | In scope for MVP | Timeline |
|---|---|---|---|
| **Published order** | An order visible on the storefront and searchable | Yes | Day 1 |
| **Verified payment** | A vendor has explicitly approved a payment proof | Yes | Day 1 |
| **Delivered** | Vendor marks the order delivered; units_sold increments | Yes | Day 1 |
| **Low stock** | Quantity on hand (stock - reserved) drops below threshold | Yes | Phase 3 |
| **Verified purchaser review** | A review tied to a delivered order | Yes | Phase 7 |
| **Risk-flagged order** | Order matches a fraud heuristic (new IP, repeated phone, etc.) | Yes | Phase 4 |
| **Unconfirmed expiry** | A pending_confirmation order auto-cancels after N hours | Yes | Phase 4 |
| **Break-glass access** | Operator uses elevated credentials with an audit trail | Yes | Phase 8 |
| **Inventory sync with POS** | Offline till syncs with the platform | No | Future |
| **Marketplace** | Multiple vendors in one deployment | No | Not planned |
| **Recommendation engine** | Suggested products based on history | No | Future |
| **Discount stacking** | Multiple coupons on one order | No | Future |
| **Installment payments** | Pay-later finance options | No | Future |

---

## 15. Analytics and reporting (out of scope for MVP but listed for completeness)

The system will track (for audit and business purposes, not for ad targeting):

- Orders placed (count, date, total).
- Orders by status (pending, confirmed, dispatched, delivered, cancelled).
- Revenue by product, by week/month.
- Average order value, repeat customer rate.
- Product sales count.
- Review submission and moderation counts.

These will be visible in the dashboard and exportable as CSV. A future phase may add custom report generation or integrations.

---

## 16. MVP scope summary

**In MVP (Phases 1–8):**
- Customer and staff authentication (Google OAuth).
- Product catalog (CRUD, images, categories, search, filtering).
- Shopping cart and wishlist.
- Checkout (COD, manual payment, delivery zones, coupons, risk scoring).
- Order management (customer and staff views, status transitions, invoices).
- Notifications (Web Push with retries).
- Vendor dashboard (orders, products, staff, settings).
- Reviews (submission, moderation, verified purchaser).
- PWA (installable, offline-capable, push notifications).
- i18n (English and Nepali, no hardcoded strings).
- Security (auth, permissions, audit logging, break-glass).
- Deployment (per-vendor, scripted rollouts).

**Not in MVP (future phases):**
- Payment gateway integration (eSewa, Khalti).
- SMS/OTP verification.
- Advanced analytics and reporting (dashboards are basic).
- Marketplace (multi-vendor in one instance).
- Live chat or customer support portal.
- Inventory sync with offline POS.
- Email marketing automation.
- Advanced fraud detection.
- Custom domain support (shared Vercel domain only).
- Multi-language support beyond English and Nepali.

---

## 17. Success criteria for go-live

Before a vendor goes live, these must be true:

- [ ] All AUTH, PROD, CART, CHECKOUT, PAY, ORD, ADMIN, REV, NOTIF, PWA, I18N, SECURE, PERF, and nonfunctional requirements tested and passing.
- [ ] Database migrations tested and reversible.
- [ ] Backup and restore procedure documented and tested.
- [ ] Vendor staff trained (or onboarding guide provided).
- [ ] Performance tests pass (Lighthouse >80 on mobile, checkout <1s, dashboard <2s).
- [ ] Security review completed (OWASP top 10, permission model, secret management).
- [ ] Load test: 100 concurrent checkouts complete without timeout.
- [ ] Accessibility audit: WCAG 2.1 AA compliance on main flows.
- [ ] Localization audit: no hardcoded strings; Nepali rendering correct.
- [ ] Monitoring and alerting in place (uptime checks, error logging, operator on-call process).
- [ ] Support documentation: vendor handbook, customer FAQs, operator runbook.
- [ ] Legal review: privacy policy, terms of service, tax/compliance for Nepal (if applicable).
- [ ] Vendor acknowledgment: vendor has reviewed the platform, confirmed understanding of fees, data handling, and support level.

---

## 18. Definition of done

A requirement is done when:

1. Code is written, reviewed and merged.
2. Unit, integration and end-to-end tests pass.
3. Linting and type checking pass.
4. The requirement is verified on staging.
5. Documentation (user docs, API docs, code comments) is updated.
6. Related requirements (database, API, security) are coordinated.

For a feature or phase:

1. All requirements are done.
2. The feature works end-to-end on a real deployment (staging or a demo vendor).
3. No new issues are introduced (regression testing passes).
4. Performance benchmarks are met.
5. Operator can deploy the feature to all vendors without manual intervention.

---

## 19. Assumptions and open questions

1. **Accounting and tax:** VAT, PAN and invoice format are vendor's responsibility. Confirm with an accountant before commercial use.
2. **Legal jurisdiction:** operating a platform serving Nepal may have compliance requirements (data residency, consumer protection). Confirm with legal counsel.
3. **Support SLA:** what is your response time for vendor support requests? How are escalations handled? (**Required before commercial launch**)
4. **Chargeback and dispute policy:** if a customer claims an order was not delivered, how do you help the vendor? (**Required policy before payment gateway integration**)
5. **Language scope:** will future vendors request Maithili, Limbu, or other Nepal languages? (**Open for future; MVP is English + Nepali**)
6. **Offline POS sync:** is it important enough to build in Phase X? (**Not MVP; marked as future enhancement**)
