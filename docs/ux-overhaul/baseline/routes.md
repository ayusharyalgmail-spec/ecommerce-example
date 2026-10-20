# Route inventory (baseline)

Generated from `src/App.tsx` and a static scan of each page file. Data access is direct to Supabase (RLS); `lib/api.ts` helpers are listed separately.

| Route | File | Access | Loading | Tables | RPCs | api.ts helpers | Storage |
|---|---|---|---|---|---|---|---|
| `/` | `src/pages/Home.tsx` | public | eager | products, categories | - | - | - |
| `/shop` | `src/pages/Shop.tsx` | public | eager | categories, products | - | - | - |
| `/product/:slug` | `src/pages/ProductPage.tsx` | public | eager | products, reviews, store_settings, wishlists | - | - | - |
| `/cart` | `src/pages/Cart.tsx` | public | eager | - | - | loadCartProducts | - |
| `/checkout` | `src/pages/Checkout.tsx` | public | eager | delivery_zones, store_settings, profiles, customer_addresses | - | quoteCheckout, placeOrder | - |
| `/track` | `src/pages/Track.tsx` | public | eager | store_settings | submit_payment_proof | trackOrder | payment-proofs |
| `/login` | `src/pages/Login.tsx` | public | eager | - | - | - | - |
| `/auth/callback` | `src/pages/AuthCallback.tsx` | public | eager | - | claim_staff_invite | - | - |
| `/account` | `src/pages/Account.tsx` | signed-in | eager | orders, reviews | my_notifications | submitReview, cancelOrder | - |
| `/account/wishlist` | `src/pages/Wishlist.tsx` | signed-in | eager | wishlists | - | - | - |
| `/account/addresses` | `src/pages/Addresses.tsx` | signed-in | eager | customer_addresses, delivery_zones | - | saveAddress | - |
| `/orders/:id/invoice` | `src/pages/Invoice.tsx` | signed-in | eager | orders, store_settings | - | - | - |
| `/admin (index)` | `src/pages/admin/AdminHome.tsx` | staff | lazy | orders, products | - | - | - |
| `/admin/orders` | `src/pages/admin/Orders.tsx` | staff | lazy | orders | - | - | - |
| `/admin/orders/:id` | `src/pages/admin/OrderDetail.tsx` | staff | lazy | orders, payment_records | - | verifyPayment, markCodCollected, recordRefund, transitionOrder | payment-proofs |
| `/admin/products` | `src/pages/admin/Products.tsx` | staff | lazy | products | - | - | - |
| `/admin/products/new` | `src/pages/admin/ProductEdit.tsx` | staff | lazy | products, categories | - | addProductImage, saveProduct, deleteProductImage, adjustStock | product-images |
| `/admin/products/:id` | `src/pages/admin/ProductEdit.tsx` | staff | lazy | products, categories | - | addProductImage, saveProduct, deleteProductImage, adjustStock | product-images |
| `/admin/reviews` | `src/pages/admin/Reviews.tsx` | staff | lazy | reviews | - | moderateReview | - |
| `/admin/coupons` | `src/pages/admin/Coupons.tsx` | staff | lazy | coupons | - | saveCoupon | - |
| `/admin/zones` | `src/pages/admin/Zones.tsx` | staff | lazy | delivery_zones | - | saveZone | - |
| `/admin/reports` | `src/pages/admin/Reports.tsx` | staff | lazy | orders | - | - | - |
| `/admin/import` | `src/pages/admin/ImportExport.tsx` | staff | lazy | products, orders | - | importProducts | - |
| `/admin/staff` | `src/pages/admin/Staff.tsx` | staff | lazy | staff_invites, staff_members | list_staff | inviteStaff | - |
| `/admin/audit` | `src/pages/admin/Audit.tsx` | staff | lazy | audit_logs | - | - | - |
| `/admin/settings` | `src/pages/admin/Settings.tsx` | staff | lazy | store_settings | - | saveSettings | - |
| `*` | (inline) | public | eager | - | - | - | - |

Notes: `/admin` is wrapped in `RequireStaff` and renders the lazy `AdminLayout`. `*` renders the inline `NotFound`. Cart state is localStorage only (no table). Shared layout `components/Chrome.tsx` reads `store_settings` on every mount.

## Shared data access (non-page files)

| File | Tables | RPCs |
|---|---|---|
| `src/components/Chrome.tsx` | store_settings | - |
| `src/components/PushToggle.tsx` | - | register_push, unregister_push |
| `src/lib/api.ts` | products, wishlists, customer_addresses, product_images, store_settings, coupons, delivery_zones, staff_invites | quote_checkout, place_order, cancel_order_by_customer, track_order, submit_review, import_products |
| `src/lib/auth.tsx` | staff_members | - |
