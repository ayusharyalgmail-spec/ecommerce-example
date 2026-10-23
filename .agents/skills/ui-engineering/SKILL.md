---
name: ui-engineering
description: Rules for maintaining design systems, mobile responsiveness, and high-performance UI components.
---

# UI Engineering & Design Integrity

## 1. Design Token & Utility Consistency
- Use existing Tailwind v4 utilities, CSS variables, and design tokens established in `DESIGN.md` and `src/`.
- Avoid arbitrary hardcoded pixel values (e.g. `w-[327px]`) when semantic scale units or grid/flex layouts fit better.
- Maintain consistency with existing color palettes, borders, radii, and typography scales.

## 2. Device & Performance Constraints
- **Lite Mode First**: Default animations and blurs to performant alternatives. Always honor user preferences and `prefers-reduced-motion`.
- **Zero Horizontal Jitter / Overflow**: Test widths at 320px, 375px, 768px, and 1024px+.
- **Image Optimization**: Ensure appropriate `width`, `height`, `loading="lazy"`, and `alt` descriptions on all `<img>` tags.

## 3. Accessible Component Primitives
- Use Radix UI primitives (`@radix-ui/react-dialog`, `@radix-ui/react-popover`, `@radix-ui/react-tooltip`) and `vaul` drawers for accessible overlay interactions.
- Ensure all interactive buttons, links, and form fields have visible keyboard focus rings (`focus-visible:ring-2`).
- Provide screen-reader labels (`aria-label`) on icon-only buttons.
