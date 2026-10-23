---
name: bazaar-glass-ui
description: Build or change UI in this repo's "Bazaar Glass" design system (glassmorphism + Flat 2.0, Android-first, bilingual EN/NE). Use for any new screen, component, style change or visual review in src/. Encodes the glass-vs-flat rule, tokens, component conventions, Devanagari typography and the per-screen definition of done.
---

# Bazaar Glass UI

Read `docs/ux-overhaul/DESIGN.md` for the full spec. This skill is the checklist that keeps every change consistent.

> **Palette update (2026-10):** warm-white page `#FAF9F6`, white surfaces, charcoal ink `#20231F` and charcoal primary actions (`brand`), coral `accent` for the brand accent and sale tags, `mint` for freshness and stock, soft tints (`mint-soft`, `peach-soft`, `sky-soft`, `butter-soft`, `rose-soft`) for category tiles and dashboard widgets, `well` behind product photos, and a blue `--focus` ring. Shapes: controls 10 px, buttons 12 px, cards 20 px, panels 28-32 px; layered shadows `e1`/`e2`/`e3`. Light is the default theme. Header and bottom bars are solid; no background mesh. Anything below that mentions marigold, indigo or the mesh is historical; token names are unchanged.
> Dashboard-only strings live in `src/messages/admin.{en,ne}.json` (lazy); `npm run i18n` checks both sets.

## 1. Golden rule
**If it scrolls with the content, it is flat. If it floats above content, it may be glass.**

Glass is allowed only on: top bar, floating bottom nav, bottom sheets, dialogs, popovers, command palette, toasts, sticky buy/checkout bar, small chips over images, hero text panel over a photo.

Glass is **forbidden** on: product cards, list rows, table rows, form fields, buttons (except an on-image icon button), charts, long text, anything that repeats in a scrolling list.

Rules: max 3 glass surfaces visible at once; never nest glass; never animate blur (animate `transform` and `opacity` only); text on glass is `--ink` only (muted text fails contrast on most backdrops, see `docs/ux-overhaul/baseline/contrast.md`). Produce glass only through `<GlassPanel>` (or the lazy `Dialog`, `Sheet`, `Popover`, `Tooltip`, `toast`). Every glass surface has four fallbacks already in `src/styles/glass.css`: no `backdrop-filter`, `prefers-reduced-transparency`, `forced-colors`, `data-fx="lite"`.

## 2. Tokens (`src/styles/tokens.css`)
- Colours: `ink, page(bg), surface, surface-2, muted, line, line-strong, brand, brand-strong, on-brand, accent, glacier, glacier-text, success, warning, danger, info`. Use the Tailwind utilities (`bg-surface`, `text-muted`, `border-line-strong`, `bg-brand text-on-brand`).
- `brand` (charcoal) is the primary-action fill with `on-brand` text; `accent` (coral) is for one promotional action or the sale tag per surface; `soft` buttons (`brand-tint` fill) are for actions that repeat in grids. Focus uses `--focus` (blue), never colour alone.
- `glacier` is for fills/icons; for text use `glacier-text`.
- Inputs use `line-strong` (3:1). `line` is decorative only.
- Radius hierarchy (do not use one radius everywhere): chips `xs`, inputs `sm`, buttons `md`, cards `lg`, sheets/hero `xl`, badges/avatars `pill`.
- Elevation: `--e1` resting, `--e2` hover on `hover-fine`. A card has a 1 px border **or** a shadow, not both.
- Breakpoints: `sm 600`, `md 840` (sidebars appear), `lg 1200`, `xl 1600`. Design at 360 px first. Hover styles only under the `hover-fine:` variant.
- Never hard-code a colour, radius or shadow. Run `npm run contrast` after touching `tokens.css` (74 checks must pass).

## 3. Components (`src/ui`, import from `@/ui`)
- Variants via `cva`; **no `!` important utilities, no legacy classes** (`.btn`, `.card`, `.badge`, `.alert`, `.field`, `.muted`, `.container-page`). ESLint enforces this for every file not on `eslint.legacy-allowlist.json`; migrating a page means removing it from that list.
- Icons: Lucide through `src/ui/icons.ts` only. **No emoji or text glyphs as UI icons.** Icon-only controls need a `label` (accessible name). Colour is never the only signal: badges carry an icon or text.
- Touch targets >= 48 px, 8 px between neighbours. Inputs >= 16 px font.
- Heavy overlays (Radix, Vaul, Sonner) are lazy chunks: use `Dialog`, `Sheet`, `Popover`, `Tooltip`, `toast` from `@/ui`; never import `@radix-ui/*`, `vaul` or `sonner` elsewhere. Sheets use `useSheetHistory` so Android Back closes them first.
- New data fetching uses TanStack Query with a shared key (`src/lib/queries.ts`), not the legacy `useQuery` shim.
- `src/ui` must not import from `pages/`, `components/` or `features/` (lint rule).

## 4. Nepali (Devanagari) typography
- Font: self-hosted Mukta. Weights shipped for Devanagari are 400, 600, 700 only; `:lang(ne)` already maps 500 to 600 and 800 to 700. Never use faux bold/italic or ALL CAPS.
- **No `letter-spacing` on Devanagari.** Line-height >= 1.7 body, >= 1.35 headings (set in `base.css`).
- Never truncate by character count; use `line-clamp` and let height grow. Test with long conjunct-heavy names and mixed English/Nepali lines.

## 5. i18n
Every user-facing string is a key in **both** `src/messages/en.json` and `ne.json` with matching `{placeholders}`. `npm run i18n` must pass. Write English first; flag strings that will run longer in Devanagari; Nepali needs native review.

## 6. Definition of done per screen
- [ ] Reviewed in the toolbar matrix: EN and NE, light and dark, Full and Lite effects, 2+ brand colours (include a very light one), 360 px and 1366 px
- [ ] Glass only on floating surfaces, <= 3 visible, ink-only text on glass
- [ ] `npm run check` passes (typecheck, lint, tests, i18n, contrast, build, budget)
- [ ] Initial JS stays within the 200 kB gzip budget (`npm run size`)
- [ ] Focus visible everywhere, logical tab order, `aria-live` for toasts/cart changes
- [ ] Reduced motion and `forced-colors` checked; no hover-only affordances
- [ ] Story added in Storybook for every state (including a Nepali case)
- [ ] No new legacy classes, `!` utilities, emoji icons, or hard-coded colours

## 7. Test prompts for this skill (expected behaviour)
1. *"Build a sale badge for product cards."* -> flat `Badge` (not glass) with an icon, tokens only, text >= 4.5:1 on its tint, label keys added in en and ne.
2. *"Build the sticky Add to cart bar for the product page."* -> one `GlassPanel shape="bar"` pinned above the bottom nav with safe-area padding, ink-only text, 48 px targets, Lite fallback, no blur animation.
3. *"Make product cards frosted so they look modern."* -> refuse the glass: explain the golden rule; keep cards flat; offer a glass chip over the image instead.
4. *"Add a Nepali heading with a bit of letter spacing for style."* -> decline the letter-spacing (breaks the shirorekha), suggest weight/size/leading instead.
5. *"Add a close button with an X emoji."* -> use `IconButton icon={X} label={t("common.close")}`, 48 px, no emoji.
