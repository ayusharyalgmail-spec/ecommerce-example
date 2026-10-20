# Breakpoint audit (P1-04 / P1-05)

Old (Tailwind defaults): sm 640, md 768, lg 1024. New (DESIGN.md 2.4): **sm 600, md 840, lg 1200, xl 1600**.
39 responsive utilities exist in 17 files. Decision per use:

| Use | Old | New behaviour | Decision |
|---|---|---|---|
| Home/Shop/Wishlist grids `md:grid-cols-3 lg:grid-cols-4` | 768 / 1024 | 840 / 1200 | Keep the names; tablets in 768 to 839 now stay 2-col (acceptable, cards stay readable) |
| ProductPage `md:grid-cols-2`, `md:col-span-2`, `lg:grid-cols-4` | 768 / 1024 | 840 / 1200 | Keep; PDP is redesigned in Phase 4 |
| Checkout `md:grid-cols-[1fr_20rem]`, `md:sticky` | 768 | 840 | Keep; redesigned in Phase 5 |
| Chrome header nav `lg:flex`, `lg:ml-0` and bottom nav `lg:hidden` | 1024 | **changed to `md` (840)** | A 1024 to 1199 laptop would otherwise get the phone bottom nav. Phase 2 replaces the shell |
| Forms/admin `sm:grid-cols-*`, `sm:col-span-*` | 640 | 600 | Keep (phones in landscape get 2 columns slightly earlier) |
| Admin `md:grid-cols-*` (Home, OrderDetail, ProductEdit) | 768 | 840 | Keep; admin is rebuilt in Phase 7 |
| `body` bottom padding for the floating nav | 1024 | 840 (base.css) | Matches the nav switch |

Only `Chrome.tsx` needed a code change. Verified with typecheck and a visual check at 360 px; 768/1024/1366 px screenshots are a manual task (see report).
