# MASTER PROJECT TRANSFORMATION PROMPT — PREMIUM LOCAL SHOP APPLICATION

## 1. YOUR ROLE

Act as a senior product designer, e-commerce UX architect, frontend engineer, design-system specialist, accessibility expert, and full-stack application engineer.

Your assignment is to transform my existing local shop application from its current basic, visually inconsistent state into a polished, modern, fast, friendly, and production-quality local shopping experience.

Work directly inside the existing project and modify the actual codebase.

Do not merely give me recommendations, generate a mockup, or describe what should be changed. Inspect the project, implement the improvements, run the application, test the actual user flows, and fix the problems you discover.

Use your available coding capabilities, project context, and relevant installed skills where useful. Prefer the simplest reliable implementation that produces a professional result.

## 2. PROJECT CONTEXT

This is a local shop e-commerce application intended for everyday neighborhood shopping.

The application should make it easy for customers to:

- Discover products.
- Browse categories.
- Search and filter products.
- View product details and prices.
- Add products to their cart.
- Change quantities.
- Complete checkout.
- Choose local delivery or in-store pickup when supported.
- Track orders and review order history.
- Manage their account.
- Contact the shop.

The shop should also be capable of supporting an owner or staff dashboard for managing products, stock, orders, customers, and sales.

First inspect the existing codebase to identify its framework, routing, styling system, authentication, database, available components, existing features, and current project limitations.

Preserve the existing architecture wherever reasonable. Do not replace working functionality just to use a different library or framework.

Do not assume the application is a particular framework until you inspect the files.

## 3. VISUAL AUDIT OF THE CURRENT APPLICATION

I have provided screenshots of the current Home, Shop, and Sign In screens. Treat them as references for identifying what needs improvement, not as a design to reproduce.

The current application has the following visible problems:

1. Excessive dark purple and indigo backgrounds make the interface feel artificial and monotonous.
2. Bright yellow-orange buttons clash with the dominant purple surfaces.
3. The interface resembles a basic template rather than a real local shopping application.
4. The homepage has excessive empty space and lacks useful shopping content.
5. Product cards contain large missing-image placeholders.
6. Product cards lack consistent image presentation, visual hierarchy, and refined spacing.
7. The shop filters feel disconnected from the product grid.
8. The sign-in screen stretches its form across almost the entire available width.
9. The sign-in screen lacks a polished, trustworthy authentication layout.
10. The header and footer feel generic and occupy more visual attention than necessary.
11. Product listings contain only a few demo items and do not adequately demonstrate a realistic store.
12. Navigation, responsive layouts, product discovery, and shopping interactions need stronger consistency.
13. The current design has insufficient visual depth, subtle interaction states, and meaningful feedback.
14. The application needs better empty states, loading states, error states, and success feedback.
15. The mobile experience must be deliberately designed rather than simply shrinking the desktop interface.

Perform your own code-level audit as well. Do not assume these screenshots reveal every existing issue.

## 4. PRIMARY DESIGN DIRECTION

Create a premium, warm, modern neighborhood-shopping experience inspired by excellent grocery applications and well-designed contemporary e-commerce products.

The application should feel:

- Friendly and welcoming.
- Clean and visually calm.
- Trustworthy.
- Practical for everyday purchases.
- Fast and intuitive.
- Premium without feeling expensive or intimidating.
- Modern without looking like an AI-generated landing page.
- Appropriate for a real local shop serving real customers.

Use Material Design 3 principles where useful, but do not blindly reproduce default Material UI components.

The final result should have a distinctive, cohesive design rather than looking like an unmodified component-library demo.

### Explicitly prohibited visual direction

Remove the current artificial purple/indigo-dominant theme.

Do not use:
- Purple or indigo as the primary brand palette.
- AI-style neon accents.
- Purple-blue gradients.
- Multicolor gradient backgrounds.
- Glassmorphism everywhere.
- Excessive glowing borders.
- Oversized rounded cards on every element.
- Excessively large empty hero sections.
- Decorative animation that slows down shopping.
- Generic AI-generated illustrations replacing real product photography.
- Random emojis as substitutes for product images or professional icons.
- Heavy shadows on every card.
- Excessive colors or inconsistent component styles.

Use gradients only if an existing functional requirement genuinely needs one. The default visual system should use solid colors, subtle tonal differences, borders, and restrained elevation.

## 5. COLOR SYSTEM — FRESH MARKET

Implement a centralized, reusable design-token system.

Use the following palette as the initial direction.

### Light theme

- Primary brand green: #176B4D
- Primary hover: #12563E
- Primary foreground: #FFFFFF
- Soft green surface: #E5F3EA
- Main application background: #F7F8F5
- Card and input surfaces: #FFFFFF
- Primary text: #1B1D1A
- Secondary text: #5F665F
- Muted borders: #E1E5DE
- Subtle supporting accent: #705C32
- Success: #267447
- Warning: #8A5A00
- Error: #BA1A1A

Use green selectively for important actions, selected states, stock availability, and brand identity.

Most of the interface should remain white, warm off-white, or very light neutral gray.

### Dark theme

Create a coordinated dark palette rather than applying the light palette unchanged.

Suggested starting tokens:

- Main background: #141814
- Elevated surface: #1C231D
- Secondary surface: #252E27
- Primary green: #79C99A
- Soft green surface: #263B2D
- Main text: #F0F4EF
- Secondary text: #B4BEB5
- Borders: #354137
- Error: an accessible light red appropriate for dark surfaces

These are initial tokens, not an excuse to ignore contrast or visual testing.

### Theme requirements

- Light mode is the default theme for first-time visitors.
- Support a user-controlled dark mode.
- Persist the user's theme preference using the project's existing appropriate mechanism.
- If no preference exists, use light mode.
- Avoid a flash of the wrong theme on page load where technically practical.
- Ensure all components, overlays, dialogs, forms, dropdowns, product cards, menus, and footer elements support both themes.
- Never hardcode theme-specific colors throughout individual components when a shared token is appropriate.
- Check contrast in both themes.

## 6. TYPOGRAPHY AND DESIGN TOKENS

Use a modern, highly readable typeface such as Inter, or a suitable existing project font.

Use a reliable local or system fallback. Do not introduce an unnecessary external font dependency if the project already has a good solution.

Create consistent typography tokens for:

- Display headings.
- Page titles.
- Section headings.
- Product names.
- Product prices.
- Descriptions.
- Labels.
- Supporting text.
- Buttons.
- Navigation.

Use readable line heights and consistent font weights.

Do not make every heading bold, every label tiny, or every section visually identical.

### Spacing

Use a consistent spacing scale based on 4px increments, with common values such as:

- 4px: tiny details.
- 8px: compact gaps.
- 12px: small component spacing.
- 16px: standard spacing.
- 24px: card and section spacing.
- 32px: larger section separation.
- 48px or more: major section separation when justified.

### Shapes

Use a controlled radius system:

- Small controls: 8px.
- Inputs and buttons: 8–12px.
- Product cards: 12–16px.
- Larger panels: 16–20px.
- Pills: fully rounded only where appropriate.

Do not wrap every heading, paragraph, and navigation item inside its own card.

Use subtle borders and restrained elevation rather than heavy shadows.

## 7. HOME PAGE — COMPLETE REDESIGN

Transform the homepage into a useful shopping destination rather than a nearly empty promotional template.

### A. Header

Build a compact, professional, responsive header.

Desktop header should support:

- Store logo or text-based store identity.
- Category navigation.
- Home.
- Shop.
- Order tracking.
- Product search.
- Language selector, preserving the existing Nepali option if functional.
- Account access.
- Cart with a live item count.

Requirements:

- Keep the header visually balanced.
- Align items consistently.
- Make active navigation obvious but subtle.
- Provide a proper mobile navigation pattern.
- Avoid shrinking the entire desktop header into an unreadable mobile toolbar.
- Use clear icons with labels or accessible names.
- Provide a responsive search experience.
- Make the cart accessible from every relevant shopping screen.
- If sticky navigation is appropriate, keep it compact and prevent content from being obscured.

### B. Delivery information

Where supported by the project, show the delivery area or a clear delivery/pickup entry point.

Do not fabricate an actual user's location, delivery coverage, delivery fee, or delivery promise.

### C. Hero section

Replace the oversized, empty-looking hero with a compact and visually meaningful shopping introduction.

Suggested content:

Heading: "Everyday essentials, right around the corner."

Supporting text: "Discover your neighborhood favorites and order for convenient local delivery or pickup."

Primary action: "Shop now"

Secondary action: "Explore categories"

Use a restrained layout with clear typography, suitable product photography, and enough breathing room.

Do not force a huge banner image into the layout if it adds little value.

On mobile, make the hero compact and place the primary action where it is easy to reach.

### D. Trust and service information

Add a compact row or responsive collection of trust indicators, but only where the claims match actual project capabilities.

Possible examples:

- Local delivery.
- In-store pickup.
- Secure checkout.
- Easy order tracking.
- Direct shop support.

Do not advertise cash on delivery, returns, delivery coverage, or payment methods unless those features actually exist or are explicitly configured as demo behavior.

### E. Shop by category

Create an attractive, useful category section.

Suggested demo categories:

- Groceries.
- Snacks.
- Beverages.
- Household essentials.
- Personal care.
- Stationery.
- Electronics and accessories.
- Books.
- Kitchen essentials.
- Home and lifestyle.

Use category imagery, suitable icons, or restrained image tiles.

Requirements:

- Categories should have consistent dimensions.
- Make the entire category tile clickable.
- Include clear hover, focus, and active states.
- Allow horizontal scrolling on narrow screens only when it improves usability.
- Do not render unnecessary empty category containers.

### F. Featured collections

Add sections such as:

- Popular products.
- New arrivals.
- Best value.
- Daily essentials.
- Special offers.

These sections must be driven by actual product data or clearly identified demo data.

Avoid duplicating the same three products across every section merely to fill space.

If the dataset is small, use a smaller number of well-designed sections instead of repeating products.

### G. Promotional content

Use small, restrained promotional banners only when useful.

Avoid huge gradient banners, fake countdown timers, fabricated discounts, and aggressive promotional styling.

All discount prices must be mathematically correct.

### H. Footer

Create a compact and complete footer with:

- Store identity.
- Shop and category links.
- Order tracking.
- Account links.
- Contact information.
- Store hours and location when available.
- Delivery and return policies when configured.
- Privacy and terms links when available.
- Theme settings.
- Copyright information.

Remove placeholder text such as "Contact details will appear here."

If information is missing, use a clear configuration-based fallback rather than misleading customers.

## 8. SHOP PAGE — PRODUCT DISCOVERY

The Shop page is a priority.

Redesign it so customers can discover products without struggling with oversized filters or empty-looking cards.

### Search

- Add a prominent search field.
- Support product-name and category searches.
- Include a clear-search action.
- Provide a useful empty state.
- Debounce remote queries if appropriate.
- Keep search results consistent with the selected filters.
- Handle loading and request errors.

### Filters

Support the features that are appropriate for the existing data model:

- Category.
- Price range in NPR.
- Availability.
- Sale items.
- Sort by newest.
- Sort by price ascending.
- Sort by price descending.
- Sort by name.

On desktop, filters may appear in a compact sidebar or a suitable filter toolbar.

On mobile, filters should open in an accessible drawer, sheet, or compact panel.

Do not force a large desktop filter sidebar onto narrow screens.

Include a visible way to clear active filters.

### Product count and sorting

Display the number of matching products based on the actual filtered results.

Ensure sorting is correct and consistent.

Do not show a hardcoded product count.

### Product cards

Redesign the product cards with the following hierarchy:

1. Consistent product image area.
2. Optional sale badge.
3. Product name.
4. Unit, size, or variant when available.
5. Current price.
6. Original price only for a genuine discount.
7. Stock availability.
8. Add-to-cart or quantity controls.
9. Optional favorite action if the existing application supports it.

Product cards should look clean and useful rather than excessively decorated.

Requirements:

- Keep image dimensions consistent.
- Use an appropriate object-fit mode.
- Prevent text from overflowing.
- Prevent prices from colliding with buttons.
- Avoid unnecessarily tall cards.
- Use consistent button heights.
- Keep card interactions predictable.
- Make the primary shopping action easy to find.
- Use subtle hover elevation or image transitions on pointer devices.
- Respect reduced-motion preferences.
- Keep touch interactions comfortable on mobile.

When a product image is missing, show a polished neutral fallback using an appropriate product placeholder or icon.

Never leave the large broken-image symbols visible in the current screenshots.

## 9. DEMO PRODUCT CATALOG — FULLY POPULATED

Populate the application with a realistic, varied demo catalog so that the redesigned interface can be evaluated properly.

Target at least 40–60 distinct demo products across the categories listed above, unless the existing architecture or testing environment requires a smaller fixture.

Do not create 40–60 hardcoded product objects directly inside UI components.

Create a structured demo-data fixture, seed file, or development-only data source that matches the existing product model.

Use the following examples as a starting point and extend them naturally:

### Groceries

- Basmati Rice, 5 kg — NPR 850.
- Sunflower Oil, 1 litre — NPR 280.
- Wheat Flour, 2 kg — NPR 160.
- Sugar, 1 kg — NPR 110.
- Lentils, 1 kg — NPR 180.
- Potatoes, 1 kg — NPR 70.
- Onions, 1 kg — NPR 90.
- Instant Noodles, pack — NPR 25.

### Snacks

- Potato Chips, family pack — NPR 100.
- Chocolate Bar — NPR 80.
- Cream Biscuits — NPR 40.
- Chewing Gum — NPR 10.
- Cookies, pack — NPR 120.

### Beverages

- Bottled Water, 1 litre — NPR 30.
- Orange Juice, 1 litre — NPR 180.
- Milk, 1 litre — NPR 100.
- Soft Drink, 500 ml — NPR 60.
- Instant Coffee — NPR 250.

### Household essentials

- Laundry Detergent, 1 litre — NPR 280.
- Dishwashing Liquid — NPR 150.
- Bathing Soap, 100 g — NPR 65.
- Toilet Tissue Pack — NPR 120.
- Cleaning Cloth — NPR 80.
- Garbage Bags — NPR 100.

### Personal care

- Shampoo, 180 ml — NPR 220.
- Toothpaste — NPR 120.
- Toothbrush — NPR 60.
- Handwash — NPR 140.
- Body Lotion — NPR 250.

### Stationery and books

- Notebook, 200 pages — NPR 120.
- Ballpoint Pen — NPR 20.
- Pencil Pack — NPR 50.
- Drawing Book — NPR 100.
- Sample Book — NPR 1,299.

### Electronics and accessories

- USB Cable — NPR 250.
- Phone Charger — NPR 650.
- Earphones — NPR 450.
- Phone Stand — NPR 300.
- Mouse Pad — NPR 200.

### Kitchen, home and lifestyle

- Storage Container — NPR 180.
- Water Bottle — NPR 250.
- Lunch Box — NPR 350.
- Reusable Shopping Bag — NPR 100.
- Kitchen Towel — NPR 120.
- LED Bulb — NPR 180.

Add enough additional products to reach the desired catalog size, while keeping categories and product information believable.

These prices are illustrative demo values, not verified market prices.

### Product images

Use genuine, relevant product images where possible.

Prefer existing project assets, properly licensed image sources, or reliable product-image URLs appropriate for the development environment.

If remote images are used, handle loading failures and missing assets gracefully.

Do not use the same unrelated photograph for every product.

Do not invent fake product photography by stretching or recoloring unrelated images.

If an external image service is unreliable, provide a dependable local fallback strategy.

### Product data model

Each product should use the existing model where possible. A suitable conceptual model includes:

- id.
- name.
- slug.
- description.
- categoryId.
- imageUrl or image assets.
- price.
- compareAtPrice, when applicable.
- unit or variant.
- stockQuantity.
- isActive.
- createdAt.
- optional featured flag.

Adapt these fields to the actual schema instead of introducing unnecessary duplication.

### Crucial demo-data rules

- Do not overwrite real production products.
- Keep development fixtures separate from production inventory.
- Use stable IDs where required for testing.
- Make the demo catalog easy to replace with actual shop inventory.
- Do not present demo prices, stock, delivery promises, or sales as verified live business data.
- Clearly distinguish demo data from real data in development.
- Never allow sample inventory to be silently written into production.

## 10. PRODUCT DETAILS

Create or improve the product detail screen if it exists or can be added consistently.

Include:

- Product images.
- Product name.
- Current price.
- Genuine original price, if discounted.
- Description.
- Unit or variant.
- Availability.
- Quantity selector.
- Add-to-cart action.
- Relevant related products.
- Breadcrumbs or a clear return path.

Ensure quantity cannot fall below one in the product-selection interface or exceed available stock.

Do not claim that a product is in stock when the actual inventory says otherwise.

Use a mobile-first layout with a clear purchase action.

## 11. CART AND CHECKOUT

Make the cart feel reliable and straightforward.

### Cart

Include:

- Product thumbnail.
- Name and selected variant.
- Unit price.
- Quantity controls.
- Line subtotal.
- Remove action.
- Cart subtotal.
- Delivery fee when configured.
- Discounts when valid.
- Final total.
- Continue shopping.
- Proceed to checkout.

Recalculate totals immediately when quantities change.

Prevent invalid quantities and negative totals.

Avoid duplicated products appearing as separate lines when they should be merged.

Persist the cart using the existing persistence strategy where appropriate.

Handle removed products and stock changes gracefully.

### Checkout

If checkout already exists, repair and improve it instead of replacing its logic.

Support the existing payment and delivery capabilities.

Where appropriate, provide:

- Customer contact information.
- Delivery address.
- Delivery or pickup selection.
- Order notes.
- Order summary.
- Delivery fee.
- Final amount.
- Submission status.
- Success confirmation.

Do not introduce fake payment integrations or claim that an order was placed when the backend rejected it.

Do not display payment methods that are not configured.

Make the entire checkout usable on mobile.

## 12. SIGN-IN AND ACCOUNT SCREENS

The current Sign In screen stretches almost the full content width and looks unfinished.

Create a focused, professional authentication experience.

### Layout

- Use a centered, appropriately constrained authentication panel.
- Keep the surrounding page calm and uncluttered.
- Provide clear heading and supporting text.
- Use consistent form labels and spacing.
- Provide accessible focus states.
- Include useful validation messages.
- Prevent fields and buttons from overflowing on small screens.

### Authentication behavior

Preserve the actual authentication implementation.

If the project uses Supabase, keep its existing auth integration and environment-variable conventions.

Support only the authentication methods the backend actually provides.

If Google OAuth already exists, improve the interface without breaking the callback, redirect URL, or session handling.

If account creation, email verification, password reset, or magic-link login is supported, make the corresponding states clear.

Never claim successful authentication without a valid backend result.

Ensure account navigation, session persistence, logout, and protected routes work correctly.

Do not expose secret keys in frontend code.

## 13. OWNER AND STAFF DASHBOARD

Inspect the existing application and identify whether an owner/admin dashboard already exists.

If it exists, improve its design while preserving working management functions.

If it does not exist, assess the existing architecture before introducing a dashboard.

The owner experience should be visually distinct from the customer shopping interface without creating a disconnected design system.

Potential modules include:

- Overview.
- Product management.
- Categories.
- Inventory.
- Orders.
- Customers.
- Sales summaries.
- Settings.
- Staff access, if supported.

Use realistic empty states, meaningful charts, clear tables, filters, and accessible forms.

Do not invent real business analytics or display fabricated sales figures as live data.

For charts, use actual backend data or explicitly identified development fixtures.

## 14. RESPONSIVE DESIGN — MOBILE FIRST

Responsiveness is mandatory.

Do not merely make the desktop interface smaller.

Test the interface at these representative viewport widths:

- 320px.
- 360px.
- 375px.
- 390px.
- 430px.
- 600px.
- 768px.
- 900px.
- 1024px.
- 1280px.
- 1440px and above.

Adapt layouts based on available space, not a specific phone brand.

### Mobile requirements

- Compact header.
- Search that remains usable.
- Clear navigation.
- Touch-friendly controls, ideally at least 44–48px high where practical.
- Two-column product grids when product cards remain readable.
- A single column when content genuinely needs more space.
- No horizontal overflow.
- No clipped labels.
- No overlapping controls.
- No squeezed desktop sidebar.
- Responsive authentication forms.
- Readable product prices and names.
- Usable quantity controls.
- Appropriate image aspect ratios.
- Safe-area-aware fixed navigation if used.
- A cart interaction that remains accessible.
- No content hidden beneath sticky headers or bottom navigation.

### Tablet requirements

Use an adaptive product grid and sensible content widths.

Avoid excessive whitespace and stretched cards.

### Desktop requirements

Use a centered content container with an appropriate maximum width.

Support three to five product columns depending on the available width and card readability.

Keep filters, search, and products visually balanced.

Do not stretch forms and text content across the entire viewport.

## 15. ANIMATION AND INTERACTION POLISH

Introduce subtle, purposeful animations throughout the application.

The objective is to make the interface feel smooth and responsive, not to create an animated showcase.

Implement where useful:

- Short page and section entrance transitions.
- Subtle product-card hover elevation.
- Small image-scale transitions on hover.
- Smooth dropdown and drawer opening.
- Button press feedback.
- Add-to-cart feedback.
- Cart-count transitions.
- Toast notifications.
- Skeleton loading states.
- Gentle dialog transitions.
- Clear focus and active states.
- Reduced-motion alternatives.

Keep most micro-interactions approximately 120–220ms and larger transitions around 180–300ms where appropriate.

Use opacity and transform for lightweight transitions.

Do not animate every element independently.

Do not add continuous motion, parallax, or expensive effects without a clear usability benefit.

Respect the user's prefers-reduced-motion preference.

Avoid unnecessary animation libraries if CSS or existing project utilities are sufficient.

## 16. ACCESSIBILITY AND USABILITY

Implement practical accessibility improvements:

- Semantic HTML.
- Logical heading order.
- Accessible names for icon-only buttons.
- Visible keyboard focus.
- Keyboard-accessible navigation and dialogs.
- Correct form labels.
- Useful validation errors.
- Sufficient color contrast.
- Appropriate image alt text.
- Accessible dropdowns and drawers.
- Screen-reader-friendly cart updates where practical.
- Clear loading and submission feedback.
- No information communicated by color alone.

Do not sacrifice usability for visual novelty.

## 17. DATA AND BACKEND INTEGRATION

The interface must remain connected to the actual data layer.

Before modifying data access, inspect the current implementation and identify the authoritative product, category, inventory, cart, order, authentication, and customer sources.

Requirements:

- Reuse existing API clients and backend services where practical.
- Avoid duplicating data-fetching logic across components.
- Avoid hardcoded production products and live statistics.
- Use a structured demo fixture only in the intended development or demo mode.
- Keep credentials and privileged operations server-side.
- Handle loading, empty, error, and success states.
- Prevent stale requests from overwriting newer search results.
- Validate prices and totals on the server when orders are created.
- Do not trust frontend-submitted totals.
- Prevent checkout from bypassing backend stock validation.
- Preserve existing access controls.
- Do not weaken database security to make the UI work.
- Do not change database schemas destructively without a justified migration.
- Do not remove existing production records.

If the project uses Supabase, preserve the existing client configuration, row-level security, authentication policies, and database contracts.

Do not fabricate successful backend functionality when configuration or credentials are missing. Explain the exact missing setup and keep the UI's failure state professional.

## 18. CODE QUALITY AND ARCHITECTURE

Keep the codebase maintainable.

Inspect the current folder structure and follow its existing conventions where sensible.

Use reusable components for:

- Header and navigation.
- Search.
- Product cards.
- Product grids.
- Category tiles.
- Filters.
- Price formatting.
- Quantity selectors.
- Cart summaries.
- Dialogs.
- Toasts.
- Skeletons.
- Empty states.
- Error states.
- Theme controls.

Centralize design tokens and shared UI behavior.

Avoid:

- A giant monolithic component.
- Duplicate implementations of the same UI.
- Excessive nested conditional rendering.
- Hardcoded colors scattered across the codebase.
- Unnecessary dependencies.
- Random one-off CSS overrides.
- Rewriting stable modules without a clear reason.
- Disabling lint rules just to pass a build.
- Removing tests to make the project appear healthy.

Use the project's existing linting, formatting, type-checking, and testing tools.

Do not introduce a complete replacement framework just for styling.

## 19. PERFORMANCE

Keep the application fast, especially on lower-end Android phones and slower networks.

- Avoid unnecessary full-page rerenders.
- Use appropriate image sizing and lazy loading.
- Avoid downloading unnecessarily large images.
- Use code splitting when it benefits the existing architecture.
- Avoid excessive animation and shadow effects.
- Debounce search where appropriate.
- Avoid repeated backend requests.
- Use pagination or suitable incremental loading for larger catalogs.
- Prevent layout shifts when product images load.
- Keep dependencies under control.

Do not add optimization complexity without evidence that it helps.

## 20. REQUIRED IMPLEMENTATION WORKFLOW

Follow this workflow in order.

### Phase 1 — Audit

Inspect:

- Project structure.
- Package manifests.
- Framework and build system.
- Routing.
- Current pages.
- Shared components.
- CSS and theme implementation.
- Product model.
- Product image handling.
- Cart logic.
- Checkout logic.
- Authentication.
- Backend and API integrations.
- Existing tests.
- Environment-variable requirements.

Identify the main causes of the visible problems.

Produce a concise implementation checklist, then proceed with the work. Do not stop after writing the checklist.

### Phase 2 — Design foundation

Implement the centralized design tokens, light and dark themes, typography, spacing, responsive container rules, and reusable interaction styles.

Remove the old purple-dominant styling from the actual application, not just the homepage.

### Phase 3 — Core customer experience

Redesign and implement:

1. Header and navigation.
2. Homepage.
3. Category discovery.
4. Shop page.
5. Search and filters.
6. Product cards.
7. Product details.
8. Cart.
9. Checkout.
10. Authentication and account screens.
11. Footer.
12. Relevant loading, empty, error, and success states.

Follow the existing routing and backend contracts.

### Phase 4 — Demo catalog

Create the structured demo catalog and populate enough products to test every category, card layout, price display, stock state, and filter.

Ensure the data cannot overwrite production inventory.

### Phase 5 — Functional verification

Verify that:

- Search returns matching products.
- Category filters work.
- Price filters work.
- Sorting works.
- Stock filtering works.
- Sale filtering works.
- Clearing filters works.
- Product detail navigation works.
- Quantity controls work.
- Adding to cart works.
- Cart totals recalculate correctly.
- Removing items works.
- Refreshing does not unexpectedly destroy persisted cart state.
- Authentication behaves correctly for signed-in and signed-out users.
- Checkout validates required fields.
- Backend errors are handled honestly.
- Theme switching works throughout the application.
- Navigation works on desktop and mobile.

### Phase 6 — Responsive and visual testing

Run the actual application.

Use available browser automation, screenshots, or responsive testing tools if configured.

Inspect the Home, Shop, Sign In, Product Details, Cart, and Checkout screens at representative mobile, tablet, and desktop widths.

Check for:

- Horizontal overflow.
- Clipped content.
- Broken images.
- Misaligned cards.
- Inconsistent spacing.
- Unreadable text.
- Buttons with incorrect widths.
- Layout shifts.
- Broken theme styles.
- Empty sections.
- Console errors.

Fix the issues you discover rather than merely listing them.

### Phase 7 — Final verification

Run the relevant project commands for:

- Build.
- Type checking.
- Linting.
- Tests.

Do not claim that a command passed unless you actually ran it and verified its result.

Fix issues introduced by your changes.

If an unrelated pre-existing issue prevents full verification, identify it separately.

## 21. ACCEPTANCE CRITERIA

The work is complete only when the following are satisfied:

- The purple/indigo-dominant visual design has been replaced with a cohesive fresh-market theme.
- The application defaults to a polished light theme.
- Dark mode remains visually consistent.
- The homepage feels like a real local shopping experience.
- The shop has a useful, realistic demo catalog.
- Product cards display relevant images or polished fallbacks.
- Search, filtering, sorting, and cart interactions work.
- Forms are compact, readable, and responsive.
- Mobile layouts are intentionally designed and usable.
- The design uses consistent typography, spacing, colors, and component behavior.
- Animations are subtle and do not harm usability.
- The actual backend integration remains intact.
- Demo data cannot accidentally overwrite production data.
- Existing working functionality has been preserved.
- Relevant build, type-check, and test results are reported honestly.

## 22. EXECUTION RULES

1. Work on the existing project, not a disconnected prototype.
2. Do not stop after inspecting the code or generating a plan.
3. Do not only redesign the homepage while leaving the other screens inconsistent.
4. Do not substitute screenshots or static HTML for functioning application components.
5. Do not invent backend success, product inventory, or real business information.
6. Do not remove functional features simply because they complicate the redesign.
7. Do not perform destructive database operations.
8. Do not add dependencies unless they have a clear benefit.
9. Do not waste time rebuilding the entire project repeatedly.
10. If a command fails, inspect the actual error, fix the root cause, and retry selectively.
11. If the same build or test failure persists after two or three meaningful attempts, stop repeating the same command and investigate a different diagnostic path.
12. Make sensible design decisions independently when details are not specified.
13. Keep the implementation consistent across all routes and components.
14. Prefer a complete, coherent result over many disconnected visual effects.
15. Keep changes focused, testable, and maintainable.

## 23. FINAL REPORT

When finished, provide a concise but useful report containing:

- What changed visually.
- Which pages and components were redesigned.
- How the demo catalog was implemented.
- Which interactions were tested.
- Responsive viewports actually checked.
- Build, lint, type-check, and test results.
- Any remaining backend configuration requirements.
- Any known limitations or unresolved issues.
- The most important files changed.

Do not simply say "everything is fixed." Report verified outcomes.

## FINAL DIRECTIVE

Transform this application into a polished, premium, easy-to-use local shop experience with a fresh green-and-neutral design system, excellent product discovery, realistic demo products, responsive layouts, subtle animation, and dependable shopping interactions.

Make the actual project better. Preserve its working foundation, solve the underlying problems, test the implementation, and finish with a coherent product rather than a superficial visual refresh.