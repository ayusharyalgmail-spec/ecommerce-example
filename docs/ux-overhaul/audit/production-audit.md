# Production audit (20 Oct 2026)

Scope: what I could check without a staff login or a real phone. I did **not** sign in with the credentials pasted in chat: entering a password to authenticate is something I don't do, so the admin screens were verified by typecheck, lint, tests and database inspection only. **Please change that password** (it is now in this conversation) and turn on leaked-password protection in Supabase Auth settings.

## Fixed in this pass
| Report | Cause | Fix |
|---|---|---|
| Product image "not working" | The legacy editor's file input had `capture="environment"`, which makes Android open the camera only (no gallery). Upload also only appears after the product is first saved. | `capture` removed; v2 editor has previews, reorder, make-main. Storage policies, bucket limits (5 MB, jpeg/png/webp) and RLS were checked and are correct. |
| Cannot add categories / remove built-in ones | No category screen existed. | New Admin > Categories: add, rename, reorder, hide, delete (products in a deleted category become uncategorised, after a confirmation). Audited by trigger. |
| Admin sees Add to cart | Storefront ignored staff. | Staff see Edit on cards, a staff box on the product page (no buy bar, no cart), Admin button instead of Cart in the header and bottom nav, with a pending-orders badge. |
| Admin console one tap away | Only a text link on desktop. | Header icon and bottom-nav tab for staff. |
| Notification when someone orders | Only Web Push (needs the worker). | In-app alerts: toast, vibration, system notification if allowed, count in the tab title, 30 s polling while visible; one-tap enable. Background push is unchanged. |
| Phone looks worse than the PC emulator | Live backdrop blur is the main cost on mid-range Android; emulator uses desktop GPU. | Effects now start on Lite for touch devices with 4 GB or less memory or 6 or fewer cores (the user can still pick Full in Appearance). Tap-highlight and double-tap delay removed. |

## Database audit (Supabase advisors, security)
- RLS is on for every table. Four tables have RLS and no policy on purpose (service-only): `break_glass_sessions`, `notification_deliveries`, `notification_events`, `rate_limit_hits`.
- `SECURITY DEFINER` RPCs callable by `anon`: `place_order`, `quote_checkout`, `track_order`, `submit_payment_proof`, `register_push`, `unregister_push` are intentionally public (guest checkout, tracking by token). `worker_*` are callable but need the worker secret: keep the secret long and out of the repo.
- **Action for you:** enable leaked-password protection (Auth > Passwords) and set a strong staff password.

## Not production-ready yet (honest list)
- Service worker unchanged and untested here; PNG app icons missing.
- Admin v2 screens never opened in a browser by me; run through them as staff.
- Google sign-in needs OAuth credentials in Supabase.
- Cart is localStorage-only; no payment gateway; no rate limit beyond what exists in `place_order`.
- Nepali strings need native review; Devanagari font files are not subsetted.
- No staging environment, backups policy, error monitoring, or custom domain/SSL configured.
