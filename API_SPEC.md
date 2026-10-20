# API_SPEC.md

REST API specification. Status: Draft v0.1. Consistent with DATABASE.md, ARCHITECTURE.md, PRD.md.

All endpoints live under `/api/v1/` (versioning is added for safety on future incompatible changes, though this is rare).

---

## 1. General conventions

### Request / response envelope

**Success (2xx):**
```json
{
  "data": { /* response payload */ },
  "meta": { "requestId": "req-abc123", "timestamp": "2024-01-15T10:30:00Z" }
}
```

**Error (4xx, 5xx):**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "A localized, user-facing message",
    "details": { /* optional context, e.g., field validation errors */ },
    "requestId": "req-abc123"
  }
}
```

### Authentication

- **Anon:** no auth required for public reads (product list, public reviews).
- **User:** Supabase session cookie (set by auth handlers). JWT in the `Authorization: Bearer` header for API clients.
- **Staff/Admin:** same session, but permission checked via `staff_members` table on each request.
- **Service role:** restricted to worker and maintenance routes; never exposed to the browser.

### Rate limiting

- **Login / auth:** 5 attempts per 15 minutes per IP.
- **Checkout / order creation:** 10 per minute per IP, 3 per minute per phone.
- **Guest tracking:** 20 per hour per IP, 50 per day per phone.
- **File upload initiation:** 5 per minute per user.
- **API calls generally:** 1000 per hour per IP (logged in users get higher).

Response headers on limit: `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`.

### Pagination

Query parameters: `limit` (default 20, max 100), `offset` (default 0) or `cursor`.

Response:
```json
{
  "data": [ /* items */ ],
  "meta": {
    "total": 500,
    "limit": 20,
    "offset": 20,
    "hasMore": true,
    "nextOffset": 40
  }
}
```

### Validation

- **Input:** Zod schemas on the server. Errors return `400 Bad Request` with field-level details.
- **Prices, stock:** always recomputed and validated server-side. Client values are never trusted.
- **Phone numbers:** normalized to E.164 and validated for Nepal `+977` prefix.

### Timestamps

ISO 8601 UTC (e.g., `2024-01-15T10:30:00Z`). Client converts to local time.

---

## 2. Authentication endpoints

### POST /auth/google/callback
Google OAuth callback. Exchanges code for session.
- **Auth:** none (public).
- **Body:** `{ "code": "...", "redirectTo": "/path" }` (optional, validated against allowlist).
- **Response:** `{ "data": { "user": {...}, "redirectTo": "..." } }`.
- **Errors:** `400` (invalid code), `302` (redirect to safe URL or `/`).

### POST /auth/logout
Clears session cookies.
- **Auth:** any.
- **Body:** none.
- **Response:** `{ "data": { } }`.

### GET /auth/session
Returns the current user and their role.
- **Auth:** any.
- **Response:** `{ "data": { "user": { "id": "...", "email": "..." }, "role": "customer|staff|owner|none" } }`.

---

## 3. Public storefront endpoints

### GET /products
List products.
- **Auth:** anon.
- **Query params:** `categoryId`, `sortBy` (price, newest, popular), `limit`, `offset`, `search`.
- **Response:** `{ "data": [ { "id", "slug", "name_en", "name_ne", "price_paisa", "discount_price_paisa", "image" (primary), "rating", "reviewCount", "stockStatus" (in_stock | low_stock | out_of_stock), "unitsSold" } ] }`.
- **Caching:** 1 hour revalidation.

### GET /products/:slug
Product detail.
- **Auth:** anon.
- **Response:** `{ "data": { "id", "name_en", "name_ne", "description_en", "description_ne", "price_paisa", "discount_price_paisa", "discount_label_en", "discount_label_ne", "stockQuantity", "reservedQuantity", "rating", "reviewCount", "images" (array of { "id", "path", "alt_en", "alt_ne" }), "reviews" (array of { "id", "rating", "title", "body", "author", "verifiedPurchaser", "createdAt" }), "relatedProducts" (array of product summaries) } }`.

### GET /products/:productId/reviews
List approved reviews for a product.
- **Auth:** anon.
- **Query params:** `limit`, `offset`, `sortBy` (newest, highest_rating).
- **Response:** array of reviews with `id`, `rating`, `title`, `body`, `author` (first initial + last name), `verifiedPurchaser`, `createdAt`.

### POST /reviews
Submit a review (customer only).
- **Auth:** user.
- **Body:** `{ "productId": "...", "orderItemId": "...", "rating": 1-5, "title": "...", "body": "..." }`.
- **Validation:** `orderItemId` must belong to a delivered order of the logged-in user for the given product. Status set to `pending`.
- **Response:** `{ "data": { "id", "status", "createdAt" } }`.
- **Errors:** `400` (not eligible; already reviewed), `403` (unauthorized).

### GET /categories
List product categories.
- **Auth:** anon.
- **Response:** array of `{ "id", "name_en", "name_ne", "slug", "productCount" }`.

### GET /search
Search products (full-text).
- **Auth:** anon.
- **Query params:** `q` (required, min 2 chars), `limit`, `offset`.
- **Response:** same as `GET /products`.

### POST /carts/quote-checkout
Calculate order totals (display only).
- **Auth:** any.
- **Body:** `{ "items": [ { "productId", "quantity" } ], "deliveryZoneId", "couponCode" (optional), "paymentMethod" }`.
- **Rate limit:** 30 per minute per IP.
- **Validation:** 
  - Each item exists, is published, has sufficient stock.
  - Prices are re-fetched live.
  - Coupon is valid (active, min subtotal, user hasn't exceeded limit).
  - Delivery zone exists.
- **Response:** 
```json
{
  "data": {
    "items": [
      { "productId", "name_en", "quantity", "unitPrice_paisa", "lineTotalPaisa" }
    ],
    "itemsListTotal_paisa": 5000,
    "itemDiscount_paisa": 0,
    "couponDiscount_paisa": 500,
    "deliveryFee_paisa": 100,
    "total_paisa": 4600,
    "breakdown": "Items 50.00 - Coupon 5.00 + Delivery 1.00 = Total 46.00"
  }
}
```
- **Errors:** `400` (item out of stock), `404` (product not found), `COUPON_UNAVAILABLE`, `PRICE_CHANGED`.

---

## 4. Cart endpoints

### POST /carts
Create or get a cart.
- **Auth:** user or anon (if anon, a guest token is set in a cookie).
- **Body:** `{}` (empty, cart is identified by session or cookie).
- **Response:** `{ "data": { "id", "items": [ ... ], "expiresAt" } }`.

### GET /carts/:id or /carts (current)
Get cart.
- **Auth:** any (user reads own; anon reads via cookie).
- **Response:** `{ "data": { "items": [ { "id", "productId", "name_en", "quantity", "unitPrice_paisa", "currentStock" } ], "expiresAt" } }`.

### POST /carts/:id/items
Add item to cart.
- **Auth:** any.
- **Body:** `{ "productId", "quantity" }`.
- **Response:** updated cart.

### PATCH /carts/:id/items/:itemId
Update cart item quantity.
- **Auth:** any.
- **Body:** `{ "quantity" }`.
- **Response:** updated cart.

### DELETE /carts/:id/items/:itemId
Remove item from cart.
- **Auth:** any.
- **Response:** `{ "data": { } }`.

### POST /carts/:id/clear
Clear entire cart.
- **Auth:** any.
- **Response:** `{ "data": { } }`.

---

## 5. Wishlist endpoints (customer only)

### POST /wishlists
Add product to wishlist.
- **Auth:** user.
- **Body:** `{ "productId" }`.
- **Response:** `{ "data": { "id", "productId" } }`.

### GET /wishlists
Get logged-in user's wishlist.
- **Auth:** user.
- **Response:** array of `{ "id", "product": { ...product summary... } }`.

### DELETE /wishlists/:id
Remove from wishlist.
- **Auth:** user.
- **Response:** `{ "data": { } }`.

---

## 6. Address book endpoints (customer only)

### POST /addresses
Add delivery address.
- **Auth:** user.
- **Body:** `{ "label", "recipientName", "phone", "deliveryZoneId", "addressLine", "landmark", "municipality", "district", "isDefault" }`.
- **Response:** `{ "data": { "id", ...fields... } }`.

### GET /addresses
Get customer's addresses.
- **Auth:** user.
- **Response:** array of addresses with `id`, `label`, `recipientName`, `phone`, `zoneId`, `zoneName`, `addressLine`, `landmark`, `municipality`, `isDefault`.

### PATCH /addresses/:id
Update address.
- **Auth:** user (owner only).
- **Body:** any of the above fields.
- **Response:** updated address.

### DELETE /addresses/:id
Delete address.
- **Auth:** user (owner only).
- **Response:** `{ "data": { } }`.

---

## 7. Order endpoints

### POST /orders
Place an order.
- **Auth:** any (user or guest via guest token).
- **Body:**
```json
{
  "idempotencyKey": "req-abc123",
  "cartId": "...",
  "deliveryZoneId": "...",
  "couponCode": "SUMMER10",
  "paymentMethod": "cod",
  "customerName": "Priya",
  "customerPhone": "+9779812345678",
  "customerEmail": "priya@example.com",
  "shipRecipient": "Priya Sharma",
  "shipPhone": "+9779812345678",
  "shipAddressLine": "123 Main St",
  "shipLandmark": "Near market",
  "shipMunicipality": "Kathmandu",
  "shipDistrict": "Kathmandu"
}
```
- **Rate limit:** 10 per minute per IP, 3 per minute per phone.
- **Validation:**
  - Idempotency key is unique.
  - Request hash matches (detects duplicate detection).
  - Cart items still exist, prices unchanged (or return `PRICE_CHANGED`).
  - Stock available (or return `INSUFFICIENT_STOCK`).
  - Delivery zone valid.
  - Phone normalized and validated.
- **Transaction:** checkout RPC (see DATABASE.md section 7).
- **Response:**
```json
{
  "data": {
    "id": "order-uuid",
    "orderNumber": "ORD-123456",
    "trackingToken": "raw-32-byte-token",
    "trackingUrl": "/track?token=...",
    "total_paisa": 4600,
    "status": "pending_confirmation",
    "paymentStatus": "unpaid",
    "placedAt": "2024-01-15T10:30:00Z"
  }
}
```
- **Note:** `trackingToken` is returned **only once**. On the confirmation page, show it as a link or tell the user to save it.
- **Errors:**
  - `400` (validation error)
  - `INSUFFICIENT_STOCK`
  - `COUPON_UNAVAILABLE`
  - `PRICE_CHANGED`
  - `IDEMPOTENCY_CONFLICT` (same key, different payload)
  - `429` (rate limit)

### GET /orders/:orderNumber/tracking
Track an order by number and phone (no auth, rate-limited, uniform error).
- **Auth:** none (rate-limited).
- **Query params:** `phone` (E.164), `token` (optional, preferred).
- **Validation:** either the token matches OR (phone + number match and are rate-limited).
- **Response:**
```json
{
  "data": {
    "orderNumber": "ORD-123456",
    "status": "dispatched",
    "statusLabel": "রোডে আছে",
    "placedAt": "2024-01-12T10:00:00Z",
    "estimatedDelivery": "2024-01-15",
    "timeline": [
      { "status": "pending_confirmation", "at": "2024-01-12T10:00:00Z", "label": "আপনার অর্ডার দেওয়া হয়েছে" },
      { "status": "confirmed", "at": "2024-01-12T11:30:00Z", "label": "বিক্রেতা নিশ্চিত করেছেন" },
      { "status": "dispatched", "at": "2024-01-13T09:00:00Z", "label": "ডেলিভারির পথে" }
    ],
    "paymentStatus": "unpaid",
    "paymentStatusLabel": "নগদ প্রদানে"
  }
}
```
- **Error:** `404` uniformly for "not found, wrong phone, wrong token, etc." with a generic message.
- **Rate limit:** 20 per hour per IP, 50 per day per phone.

### GET /orders (customer or staff, paginated)
- **Auth:** user (customer sees own; staff see all with `orders.view`).
- **Query params:** `status`, `startDate`, `endDate`, `limit`, `offset`.
- **Response:** array of orders with `id`, `orderNumber`, `status`, `statusLabel`, `total_paisa`, `placedAt`, `deliveryFee_paisa`, `items` (count), `paymentStatus`.

### GET /orders/:id
Get order detail (customer sees own; staff see with `orders.view`).
- **Auth:** user.
- **Response:**
```json
{
  "data": {
    "id", "orderNumber", "trackingToken",
    "customerName", "customerPhone", "customerEmail",
    "shipRecipient", "shipPhone", "shipAddressLine", "shipLandmark", "shipMunicipality",
    "deliveryZoneId", "deliveryZoneName", "deliveryFee_paisa",
    "items": [ { "id", "productId", "name_en", "name_ne", "sku", "imagePath", "quantity", "unitListPrice_paisa", "unitPrice_paisa", "lineTotalPaisa" } ],
    "itemsListTotal_paisa", "itemDiscount_paisa", "couponCode", "couponDiscount_paisa", "total_paisa",
    "status", "statusLabel", "paymentStatus", "paymentStatusLabel",
    "placedAt", "confirmedAt", "updatedAt",
    "timeline": [ /* status events */ ],
    "paymentRecords": [ { "id", "kind", "amount_paisa", "status", "statusLabel", "reference", "verifiedAt" } ],
    "riskFlags": [ "repeated_phone", "new_ip" ]
  }
}
```

### POST /orders/:id/cancel (customer only, `pending_confirmation` only)
- **Auth:** user (customer only).
- **Response:** updated order with `status: cancelled`.
- **Error:** `403` if not eligible, `409` if already cancelled.

---

## 8. Payment endpoints

### POST /orders/:id/payment-proof
Upload payment proof (customer or staff).
- **Auth:** user.
- **Body:** `{ "reference": "txn-xyz", "proof": "file upload token from sign endpoint" }`.
- **Response:** `{ "data": { "recordId", "status": "submitted" } }`.

### POST /orders/:id/verify-payment
Verify payment (staff only, `orders.verify_payment`).
- **Auth:** staff.
- **Body:** `{ "recordId", "decision": "verified|rejected", "note": "..." }`.
- **Response:** `{ "data": { } }`.

### POST /orders/:id/record-refund
Record a refund (staff only).
- **Auth:** staff.
- **Body:** `{ "amount_paisa": 4600, "note": "Customer request" }`.
- **Response:** `{ "data": { } }`.

---

## 9. File upload endpoints

### POST /uploads/sign
Request a signed upload URL.
- **Auth:** user.
- **Body:** `{ "kind": "product_image" | "payment_proof", "contentType": "image/jpeg", "size": 500000 }`.
- **Validation:** content type in allowlist, size < 5 MB, permission check (product_image requires `products.manage`).
- **Response:** `{ "data": { "uploadUrl": "https://...", "path": "products/abc123.webp", "expiresAt": "..." } }`.

### POST /uploads/finalize
Finalize an upload (verify it, attach it).
- **Auth:** user.
- **Body:** `{ "path": "products/abc123.webp", "kind": "product_image", "productId": "..." }`.
- **Validation:** verify file is real (magic bytes), size, dimensions.
- **Response:** `{ "data": { "path", "url" } }`.

---

## 10. Staff/Admin endpoints

### GET /admin/products
List all products (including unpublished).
- **Auth:** staff (`products.view`).
- **Query params:** `status` (draft, published, archived), `limit`, `offset`.
- **Response:** array of products with all fields including stock counters.

### POST /admin/products
Create product (staff, `products.manage`).
- **Auth:** staff.
- **Body:** `{ "name_en", "name_ne", "description_en", "description_ne", "price_paisa", "discount_price_paisa", "discount_label_en", "discount_label_ne", "categoryId", "sku", "stock_quantity", "status" (draft|published) }`.
- **Response:** `{ "data": { "id", ...fields... } }`.

### PATCH /admin/products/:id
Update product.
- **Auth:** staff (`products.manage`).
- **Body:** any of the above fields.
- **Validation:** cannot change status or price on archived products; stock changes must go through RPC.
- **Response:** updated product.

### DELETE /admin/products/:id (archive, not hard delete)
- **Auth:** staff (`products.manage`).
- **Body:** `{ }`.
- **Side effect:** sets `status: archived`.
- **Response:** `{ "data": { } }`.

### POST /admin/products/:id/images
Attach image to product (after upload finalization).
- **Auth:** staff (`products.manage`).
- **Body:** `{ "path", "alt_en", "alt_ne", "isPrimary" }`.
- **Response:** `{ "data": { "imageId", ...fields... } }`.

### DELETE /admin/products/:id/images/:imageId
- **Auth:** staff (`products.manage`).
- **Response:** `{ "data": { } }`.

### POST /admin/stock-adjust
Manually adjust stock (staff, `products.manage`).
- **Auth:** staff.
- **Body:** `{ "productId", "delta": 5, "reason": "return_restock" | "manual_adjust", "note": "..." }`.
- **Response:** `{ "data": { "productId", "newStock", "newReserved" } }`.

### POST /admin/orders/:id/transition
Change order status (staff, `orders.manage`).
- **Auth:** staff.
- **Body:** `{ "toStatus": "confirmed" | "processing" | "dispatched" | ..., "expectedStatus": "pending_confirmation", "note": "..." }`.
- **Validation:** transition is allowed; `expectedStatus` matches (optimistic lock).
- **Response:** `{ "data": { "orderId", "newStatus", "statusLabel" } }`.

### POST /admin/orders/:id/verify (COD confirmation)
Mark order as confirmed after phone verification.
- **Auth:** staff.
- **Body:** `{ "outcome": "confirmed" | "declined", "note": "..." }`.
- **Response:** `{ "data": { } }`.

### GET /admin/orders
List all orders (staff with `orders.view`).
- **Auth:** staff.
- **Query params:** `status`, `startDate`, `endDate`, `customerPhone`, `limit`, `offset`.
- **Response:** array of order summaries.

### GET /admin/orders/:id
Get order detail (staff with `orders.view`).
- **Auth:** staff.
- **Response:** same as customer order detail, plus `riskFlags`, `paymentRecords`.

### POST /admin/customers/:phone/search
Find a customer by phone.
- **Auth:** staff (`customers.view`).
- **Query params:** `phone`.
- **Response:** `{ "data": { "phone", "name", "orders": [ ...order summaries... ], "totalOrders", "totalSpent" } }`.

### POST /admin/coupons
Create coupon (staff, `coupons.manage`).
- **Auth:** staff.
- **Body:** `{ "code", "type": "percent" | "fixed", "value", "minSubtotal_paisa", "maxDiscount_paisa", "startsAt", "endsAt", "maxRedemptions", "perCustomerLimit", "isActive" }`.
- **Response:** `{ "data": { "id", ...fields... } }`.

### PATCH /admin/coupons/:id
Update coupon.
- **Auth:** staff (`coupons.manage`).
- **Response:** updated coupon.

### GET /admin/reports/sales
Sales report by period.
- **Auth:** staff (`reports.view`).
- **Query params:** `startDate`, `endDate`, `groupBy` (day, week, month).
- **Response:** `{ "data": [ { "period": "2024-01-15", "totalOrders", "totalRevenue_paisa", "totalCost_paisa", "totalProfit_paisa", "avgOrderValue_paisa" } ] }`.

### POST /admin/settings
Update store settings (staff, `settings.manage`).
- **Auth:** staff.
- **Body:** `{ "storeName", "logo_path", "contactPhone", "whatsappNumber", "contactEmail", "businessInfo", "policies", "paymentSettings", "defaultLocale", "supportedLocales", ... }`.
- **Response:** `{ "data": { ...fields... } }`.

### GET /admin/settings
Get store settings (public read of safe fields, staff full read).
- **Auth:** any.
- **Response:** `{ "data": { "storeName", "logo_path", "supportedLocales", ... } }`.

### GET /admin/staff
List staff (owner only).
- **Auth:** staff (`staff.manage`).
- **Response:** array of `{ "id", "email", "role", "permissions", "isActive", "createdAt" }`.

### POST /admin/staff/invite
Invite staff (owner only).
- **Auth:** staff (`staff.manage`).
- **Body:** `{ "email", "role": "manager" | "staff", "permissions": [ ] }`.
- **Response:** `{ "data": { "inviteToken", "inviteUrl": "..." } }`.

### PATCH /admin/staff/:id
Update staff role/permissions.
- **Auth:** staff (`staff.manage`).
- **Body:** `{ "role", "permissions", "isActive" }`.
- **Response:** updated staff.

### GET /admin/audit-logs
Audit log viewer (staff, `audit.view`).
- **Auth:** staff.
- **Query params:** `actionType`, `entityType`, `startDate`, `endDate`, `limit`, `offset`.
- **Response:** array of `{ "id", "actor", "action", "entityType", "entityId", "before", "after", "createdAt" }`.

### POST /admin/reviews/:id/moderate
Approve, reject or hide a review (staff, `reviews.moderate`).
- **Auth:** staff.
- **Body:** `{ "decision": "approved" | "rejected" | "hidden", "note": "..." }`.
- **Response:** `{ "data": { } }`.

---

## 11. Notification endpoints

### POST /notifications/subscribe
Subscribe to web push (customer, staff).
- **Auth:** user.
- **Body:** `{ "subscription": {...web push subscription object...}, "locale": "en" | "ne" }`.
- **Response:** `{ "data": { "id" } }`.

### POST /notifications/unsubscribe
Unsubscribe from push (customer, staff).
- **Auth:** user.
- **Body:** `{ "subscriptionId" }`.
- **Response:** `{ "data": { } }`.

### GET /notifications/preferences
Get notification preferences (user).
- **Auth:** user.
- **Response:** `{ "data": { "order_placed": true, "order_confirmed": true, ... } }`.

### PATCH /notifications/preferences
Update notification preferences (user).
- **Auth:** user.
- **Body:** `{ "order_placed": false, ... }`.
- **Response:** `{ "data": { ...updated... } }`.

### GET /notifications/history
Notification history (staff, `notifications.view` implicit for own notifications).
- **Auth:** user.
- **Query params:** `type`, `limit`, `offset`.
- **Response:** array of `{ "id", "type", "typeLabel", "status", "createdAt" }`.

---

## 12. Public endpoints (no special auth)

### GET /health
Service health check.
- **Auth:** none.
- **Response:** `{ "data": { "status": "ok", "database": "connected", "version": "v1.2.3" } }`.

### GET /api/health/worker
Worker health (protected by a shared secret in the route handler).
- **Auth:** bearer token (secret).
- **Response:** `{ "data": { "oldestPendingEvent_age_minutes": 2, "deadCount": 0, "attemptedCount": 150 } }`.

---

## 13. Delivery zones endpoints

### GET /delivery-zones
Get active delivery zones (customer and staff).
- **Auth:** any.
- **Response:** array of `{ "id", "name_en", "name_ne", "fee_paisa", "freeThreshold_paisa" }`.

### POST /admin/delivery-zones
Create zone (staff, `delivery.manage`).
- **Auth:** staff.
- **Body:** `{ "name_en", "name_ne", "fee_paisa", "freeThreshold_paisa" }`.
- **Response:** `{ "data": { "id", ...fields... } }`.

### PATCH /admin/delivery-zones/:id
Update zone.
- **Auth:** staff (`delivery.manage`).
- **Response:** updated zone.

### DELETE /admin/delivery-zones/:id
Delete zone (staff, `delivery.manage`; restrict if used in saved addresses or current orders).
- **Auth:** staff.
- **Response:** `{ "data": { } }` or `409` (in use).

---

## 14. CSV import/export endpoints

### POST /admin/products/import
Bulk import products from CSV.
- **Auth:** staff (`csv.manage`).
- **Body:** multipart form data with file.
- **Expected CSV columns:** `name_en`, `name_ne`, `description_en`, `description_ne`, `price_paisa`, `discount_price_paisa`, `stock_quantity`, `categoryId`, `sku`.
- **Response:** `{ "data": { "importId", "processed": 50, "errors": [ { "row": 2, "error": "... invalid price" } ], "status": "completed" } }`.

### GET /admin/products/export
Export all products as CSV.
- **Auth:** staff (`csv.manage`).
- **Response:** CSV file download (attachment).

### POST /admin/orders/export
Export orders as CSV.
- **Auth:** staff (`csv.manage`).
- **Query params:** `startDate`, `endDate`, `status`.
- **Response:** CSV file download.

---

## 15. Invoices

### GET /orders/:id/invoice
Download invoice PDF (customer sees own; staff with `orders.view`).
- **Auth:** user.
- **Query params:** (none).
- **Response:** PDF file download, Content-Disposition: attachment.
- **Content:** order number, date, customer, delivery address, items, prices, total, vendor business info, PAN/VAT, policies.

---

## 16. Localization

Every response includes localized field labels and status strings based on the user's chosen locale (from `Accept-Language` header or the `lang` query param). Status label examples:

| Status | en | ne |
|---|---|---|
| pending_confirmation | Awaiting confirmation | अपेक्षमा |
| confirmed | Confirmed | पुष्टि भयो |
| dispatched | On the way | पठाइ भयो |
| delivered | Delivered | पहुँचे भयो |

---

## 17. Error codes (stable references)

| Code | HTTP | Meaning | Recovery |
|---|---|---|---|
| INVALID_REQUEST | 400 | Malformed JSON, missing field, wrong type | Fix and retry |
| VALIDATION_FAILED | 400 | Field validation (email, price, etc.) | Correct and retry |
| UNAUTHORIZED | 401 | Missing or invalid auth | Sign in again |
| FORBIDDEN | 403 | Authenticated but no permission | Contact support |
| NOT_FOUND | 404 | Resource doesn't exist | Check ID and retry |
| IDEMPOTENCY_CONFLICT | 409 | Same idempotency key, different payload | Don't retry; resolve conflict |
| INSUFFICIENT_STOCK | 400 | Item out of stock | Remove from cart |
| COUPON_UNAVAILABLE | 400 | Coupon invalid, expired, or limit reached | Try a different code |
| PRICE_CHANGED | 400 | Item price changed since quote | Re-quote and confirm |
| STALE_STATUS | 409 | Order status changed since your read | Refresh and retry |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests | Wait and retry |
| DATABASE_ERROR | 500 | Unexpected database error | Contact support |
| INTERNAL_ERROR | 500 | Unknown error | Contact support |

---

## 18. Assumptions and open questions

1. **Versioning:** the spec assumes `/api/v1/` versioning. Future incompatible changes (e.g., removing a field) require a new version (`/api/v2/`). Backwards-incompatible changes are avoided; if necessary, a deprecation notice is sent first.
2. **Webhook for integrations:** future payment gateways (eSewa, Khalti) will POST to a secured webhook endpoint. The endpoint signature is to be designed in Phase 5.
3. **GraphQL:** not included in MVP. REST is sufficient for this scale.
4. **Realtime subscriptions:** Web Push covers notifications. Realtime order updates (WebSocket) are optional for MVP; Phase 8 evaluates if needed.
