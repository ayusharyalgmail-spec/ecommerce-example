# PLUGINS AND SKILLS

Status: Draft v1.0, 20 Oct 2026
Two lists: (A) **Claude skills** to drive the work, (B) **code plugins and libraries** that go into the project. Section C maps both to phases, section D gives ready-to-paste prompts.

Claude skills listed in A were present in the workspace when this document was written. Availability can differ per account; if one is missing, the "fallback" column says what to do instead. npm package versions are intentionally not pinned here; pin them at install time in Phase 1 and run the React 19 compatibility spike described in `ARCHITECTURE.md` §4.

---

## A. Claude skills to use

### A.1 Design and UX skills

| Skill | Use it for | Phases | Fallback |
|---|---|---|---|
| `frontend-design` | Distinctive visual direction, type and colour decisions, layout critique when building or reshaping UI. Use it to challenge the Bazaar Glass tokens before they are locked, and to review each new screen against "don't ship the generic default". | 1, 2, 3, 4, 5, 7 | Design review sessions with a human designer |
| `design:design-system` | Audit tokens for inconsistent names or hard-coded values, document each component (variants, states, accessibility notes), design new patterns that fit the system. | 0, 1, then every phase | Storybook docs written by hand |
| `design:design-critique` | Structured feedback on a screenshot or mock: hierarchy, usability, consistency. Run on every screen before development and again after. | 2–7 | Peer review checklist |
| `design:accessibility-review` | WCAG 2.1 AA audit of a design or page: contrast (including text over glass), keyboard, touch target size, screen reader. Run before each phase exit. | 1–8 | axe-core + manual TalkBack/NVDA pass |
| `design:ux-copy` | Microcopy, button labels, errors, empty states, confirmation dialogs. Produces English first, then Nepali review. | 2–7 | Copy doc reviewed by a native Nepali speaker |
| `design:design-handoff` | Developer specs from a design: layout, tokens, component props, states, breakpoints, animation. | 2–7 | Annotated Figma |
| `design:user-research` | Plan tests with real customers and vendor staff: interview guide, usability tasks, survey. | 0, 4, 5, 7, 9 | Informal sessions with a script |
| `design:research-synthesis` | Turn interview notes, support tickets and test results into themes and priorities. | 0, 9 | Spreadsheet affinity mapping |
| `theme-factory` | Fast exploration of alternative colour/type themes to compare against the default. Good for generating the vendor brand test matrix (several brand colours) in Phase 1. | 1 | Manual palettes |
| `canvas-design` | Original static visuals as PNG/PDF: promo banners, empty-state illustrations, marketing sheets, install screenshots. | 3, 6 | Illustrator/Figma |
| `algorithmic-art` | Optional generative backdrop explorations (p5.js). Only if a static mesh is judged too plain; any output must be static or cheap to render on low-end Android. | 1 (optional) | Skip |

### A.2 Delivery and documentation skills

| Skill | Use it for |
|---|---|
| `skill-creator` | **Create your own project skill** (see A.4) that encodes the Bazaar Glass rules so every future change follows them. |
| `productivity:task-management` | Track the phase backlog in a shared `TASKS.md` with owners and status. |
| `productivity:memory-management` and `productivity:start` | Keep shorthand, component names and decisions available across sessions. |
| `docx`, `pptx`, `xlsx`, `pdf` | Stakeholder deliverables: a vendor-facing walkthrough deck (`pptx`), a QA matrix spreadsheet (`xlsx`), a printable design-QA report (`pdf`/`docx`). |
| `docs` | Shareable, editable versions of these documents when you want comments from your team. |

### A.3 What the Claude skills do *not* replace
They accelerate design critique, accessibility review, copywriting and documentation. They do not replace testing on real devices, a native Nepali copy review, or a human decision on brand.

### A.4 Recommended custom skill: `bazaar-glass-ui`
Author it in Phase 1 with `skill-creator`. Suggested contents:
- The glass vs flat golden rule and the forbidden-glass list (`DESIGN.md` §3).
- Token names and the radius hierarchy.
- Component API conventions (variants via `cva`, no `!` utilities, no emoji icons).
- Nepali typography rules (no letter-spacing, line-height).
- i18n rule: every string in `en.json` and `ne.json`.
- A "definition of done" checklist per screen: contrast pass, focus visible, reduced motion, Lite tier, 360 px and 1366 px screenshots.
- Test scenarios used to evaluate the skill (e.g. "build a sale badge", "build a sticky buy bar") with expected outcomes.

Once created, every UI task in later phases starts with "use the `bazaar-glass-ui` skill".

---

## B. Code plugins and libraries

### B.1 Build and platform

| Package / tool | Purpose | Phase |
|---|---|---|
| `vite-plugin-pwa` (Workbox, `injectManifest`) | Real precaching, runtime caching, update flow, keeps custom push handlers | 6 (spike in 0) |
| `@fontsource/mukta` | Self-hosted Latin + Devanagari font | 1 |
| `@tailwindcss/vite` (already) | Tailwind 4 with `@theme` tokens | 1 |
| `vite-plugin-image-optimizer` or a build script | Optimise static assets (logos, illustrations) | 3 |
| `rollup-plugin-visualizer` | Bundle analysis | 0, 8 |
| `size-limit` | Bundle budgets in CI | 1 |
| Image transformation via Supabase Storage URLs, or `sharp` in a build/upload script | Responsive image variants | 4 |

### B.2 UI

| Package | Purpose | Replaces |
|---|---|---|
| `@radix-ui/react-*` (Dialog, Popover, Select, Tabs, Tooltip, Switch, Checkbox, Radio Group, Toggle Group, Dropdown Menu, Scroll Area) | Accessible behaviour | Hand-rolled dialogs/selects, `.btn` hacks |
| `class-variance-authority`, `clsx`, `tailwind-merge` | Variant API and safe class merging | `!` important utilities |
| `vaul` | Bottom sheets | none (new) |
| `sonner` | Toasts with undo | Inline "✓ Added" text |
| `embla-carousel-react` | Hero carousel, gallery, rails | none (new) |
| `lucide-react` | Icons | Emoji icons |
| `motion` (via `LazyMotion`) | Sheet/gallery springs, shared layout | none (new) |
| `cmdk` | Admin command palette | none (new) |
| `react-hook-form`, `zod`, `@hookform/resolvers` | Stepped checkout, product editor | Manual `useState` form objects |
| A lightweight chart library, lazy-loaded | Admin KPIs and reports | Plain text reports |
| `@tanstack/react-table` | Admin data tables (sorting, column visibility, sticky headers) | Card lists |
| `blurhash` or `thumbhash` | Image placeholders | Grey boxes |
| `web-vitals` | Field performance data | none |

### B.3 Data

| Package | Purpose |
|---|---|
| `@tanstack/react-query` | Cache, SWR, prefetch, optimistic updates (replaces `lib/useQuery.ts`) |
| `@tanstack/query-async-storage-persister` (only if the D-010 decision allows catalogue persistence) | Offline catalogue |
| `@supabase/supabase-js` (already) | Realtime for admin notifications |

### B.4 Quality

| Tool | Purpose |
|---|---|
| Storybook (+ a11y addon) | Component workbench and visual docs, EN/NE and light/dark toolbar toggles |
| Playwright (+ `@axe-core/playwright`) | E2E, visual regression, accessibility checks on Android and desktop projects |
| Lighthouse CI | Lab performance gates |
| ESLint plugins: `jsx-a11y`, `eslint-plugin-boundaries` (or `import/no-restricted-paths`), `tailwindcss` | Accessibility, layering, class hygiene |
| `i18n` checker script (custom, ~50 lines) | Fails CI if a key exists in `en.json` but not `ne.json` |
| Real devices | One low-end Android, one mid-range Android, one Windows laptop at 125% scaling |

### B.5 Deliberately **not** used
| Not used | Why |
|---|---|
| A full themed kit (MUI, Ant, Chakra) | Fights the custom glass/flat language and adds bundle weight |
| Heavy glassmorphism generator libraries | Glass is a 10-line CSS recipe with mandatory fallbacks; a dependency adds nothing |
| Lottie for general animation | Large runtime and CPU cost on low-end Android; CSS/SVG covers our needs |
| Global CSS-in-JS runtimes | Runtime cost; tokens + Tailwind already cover it |
| Next.js migration | Out of scope (D-014); the share-preview edge function covers the real SEO/share need |

---

## C. Phase map

| Phase | Claude skills | Libraries introduced |
|---|---|---|
| 0 Discovery and baseline | `design:design-system` (audit), `design:user-research`, `design:research-synthesis`, `productivity:task-management` | `rollup-plugin-visualizer`, Lighthouse, PWA spike |
| 1 Foundation | `frontend-design`, `design:design-system`, `theme-factory`, `skill-creator`, `design:accessibility-review` | Fontsource, Radix, CVA, Lucide, Sonner, Vaul, Storybook, size-limit, TanStack Query (shim) |
| 2 Shell and navigation | `frontend-design`, `design:design-critique`, `design:ux-copy`, `design:design-handoff` | Motion (`LazyMotion`), view transitions |
| 3 Discovery | + `canvas-design` (banners, category art) | Embla, react-hook-form (search filters optional) |
| 4 Product detail | `design:design-critique`, `design:accessibility-review` | Embla lightbox, blurhash/thumbhash, image variants |
| 5 Cart and checkout | `design:ux-copy`, `design:user-research` (usability test) | react-hook-form, zod |
| 6 Account, tracking, PWA | `design:ux-copy`, `canvas-design` (install screenshots) | vite-plugin-pwa |
| 7 Admin workspace | `design:design-handoff`, `design:accessibility-review` | TanStack Table, cmdk, chart lib, Realtime |
| 8 Hardening | `design:accessibility-review`, `design:design-system` (final audit) | Playwright suites, Lighthouse CI |
| 9 Launch | `pptx` (vendor walkthrough), `design:research-synthesis`, `pdf`/`docx` (handover) | Analytics sink |

---

## D. Ready-to-use prompts

Replace the bracketed parts. Always attach or paste the relevant screenshot, component file and `DESIGN.md` section.

**Token and system audit (Phase 0/1)**
> Use `design:design-system` to audit `src/index.css` and the `.btn/.card/.badge` classes. List hard-coded values, naming inconsistencies and every place that overrides them with `!` utilities. Propose the token names from `DESIGN.md` §2.4 and a migration table.

**Design a screen (Phases 2–7)**
> Use `frontend-design` and the `bazaar-glass-ui` skill. Design the [Home | PDP | Checkout step 2] screen at 360 px and 1366 px following `DESIGN.md` §9. Give the compact token plan, an ASCII wireframe for both sizes, then the React + Tailwind component using primitives from `src/ui`. Show where glass is used and justify each use against the golden rule.

**Critique (before dev and before merge)**
> Use `design:design-critique` on this screenshot of [screen]. Focus on hierarchy, thumb reach, and whether glass is used only on floating surfaces. List the top 5 issues ranked by user impact.

**Accessibility gate (each phase exit)**
> Use `design:accessibility-review` on [screen/component]. Check contrast of text over the glass surface against a busy product photo, focus order, touch target size, reduced-motion, reduced-transparency and forced-colors behaviour. Output pass/fail per criterion with fixes.

**Copy (EN + NE)**
> Use `design:ux-copy` to write the strings for [flow]: buttons, errors, empty states, confirmations, toasts. Sentence case, plain verbs, same action name across the flow. Output as `en.json` keys first; I will have the Nepali reviewed. Flag any string that will be longer in Devanagari.

**Handoff**
> Use `design:design-handoff` for [screen]. Include tokens used, component props, states, breakpoint behaviour (compact/medium/expanded), motion timings and edge cases (long Nepali names, out-of-stock, price change during checkout).

**Create the project skill (Phase 1)**
> Use `skill-creator` to create `bazaar-glass-ui` from `DESIGN.md` and `ARCHITECTURE.md` §3–5. Include the forbidden-glass list, token names, component conventions, Nepali typography rules and a per-screen definition of done. Write 5 test prompts and the expected behaviour for each.

**Vendor walkthrough (Phase 9)**
> Use `pptx` to build a 10-slide walkthrough for shop owners: what changed, how to add banners, how to manage orders on phone and on Windows, how to switch the language. Use real screenshots.
