# Contrast verification of DESIGN.md section 2 (baseline)

Computed with WCAG 2.x relative luminance (script: scratchpad `contrast.mjs`, formula in the report footer). Thresholds: text 4.5:1, UI components and large text 3:1, decorative lines informational. Tint chips are the token colour at 12% over `--surface`.

## Light theme

| Pair | FG | BG | Ratio | Needs | Result | Suggested FG |
|---|---|---|---|---|---|---|
| ink on bg | #15173A | #F7F6FB | 16.07 | 4.5 | PASS |  |
| ink on surface | #15173A | #FFFFFF | 17.28 | 4.5 | PASS |  |
| ink on surface-2 | #15173A | #EEEDF6 | 14.87 | 4.5 | PASS |  |
| text-muted on bg | #555A7D | #F7F6FB | 6.21 | 4.5 | PASS |  |
| text-muted on surface | #555A7D | #FFFFFF | 6.68 | 4.5 | PASS |  |
| text-muted on surface-2 | #555A7D | #EEEDF6 | 5.75 | 4.5 | PASS |  |
| on-brand on brand (primary button) | #15173A | #F5A524 | 8.47 | 4.5 | PASS |  |
| brand as UI on surface (focus ring, active indicator) | #F5A524 | #FFFFFF | 2.04 | 3 | **FAIL** | #C68729 |
| brand as UI on bg | #F5A524 | #F7F6FB | 1.90 | 3 | **FAIL** | #BF8329 |
| accent text on surface (sale price) | #D1244F | #FFFFFF | 5.15 | 4.5 | PASS |  |
| accent text on bg | #D1244F | #F7F6FB | 4.79 | 4.5 | PASS |  |
| glacier text on surface | #2FB5A3 | #FFFFFF | 2.54 | 4.5 | **FAIL** | #278281 |
| glacier as UI on surface | #2FB5A3 | #FFFFFF | 2.54 | 3 | **FAIL** | #2CA599 |
| success text on surface | #0E7C4A | #FFFFFF | 5.25 | 4.5 | PASS |  |
| warning text on surface | #B45309 | #FFFFFF | 5.02 | 4.5 | PASS |  |
| danger text on surface | #C21F3A | #FFFFFF | 5.91 | 4.5 | PASS |  |
| info text on surface | #2457D6 | #FFFFFF | 6.16 | 4.5 | PASS |  |
| success text on its 12% tint chip | #0E7C4A | #E2EFE9 | 4.45 | 4.5 | **FAIL** | #0E7B4A |
| warning text on its 12% tint chip | #B45309 | #F6EAE1 | 4.26 | 4.5 | **FAIL** | #AC500B |
| danger text on its 12% tint chip | #C21F3A | #F8E4E7 | 4.86 | 4.5 | PASS |  |
| info text on its 12% tint chip | #2457D6 | #E5EBFA | 5.15 | 4.5 | PASS |  |
| accent text on its 12% tint chip | #D1244F | #F9E5EA | 4.27 | 4.5 | **FAIL** | #C9234E |
| line on bg (border, decorative) | #DAD9E8 | #F7F6FB | 1.30 | 1 | PASS |  |
| line on surface (input border: needs 3:1 if sole indicator) | #DAD9E8 | #FFFFFF | 1.39 | 3 | **FAIL** | #9191A8 |

## Dark theme

| Pair | FG | BG | Ratio | Needs | Result | Suggested FG |
|---|---|---|---|---|---|---|
| ink on bg | #F2F3FF | #0E1030 | 16.77 | 4.5 | PASS |  |
| ink on surface | #F2F3FF | #181B45 | 14.86 | 4.5 | PASS |  |
| ink on surface-2 | #F2F3FF | #222657 | 12.84 | 4.5 | PASS |  |
| text-muted on bg | #B4B8DC | #0E1030 | 9.54 | 4.5 | PASS |  |
| text-muted on surface | #B4B8DC | #181B45 | 8.45 | 4.5 | PASS |  |
| text-muted on surface-2 | #B4B8DC | #222657 | 7.30 | 4.5 | PASS |  |
| on-brand on brand (primary button) | #15173A | #F5A524 | 8.47 | 4.5 | PASS |  |
| brand as UI on surface (focus ring, active indicator) | #F5A524 | #181B45 | 8.03 | 3 | PASS |  |
| brand as UI on bg | #F5A524 | #0E1030 | 9.06 | 3 | PASS |  |
| accent text on surface (sale price) | #FF5C82 | #181B45 | 5.54 | 4.5 | PASS |  |
| accent text on bg | #FF5C82 | #0E1030 | 6.26 | 4.5 | PASS |  |
| glacier text on surface | #52D4C2 | #181B45 | 9.02 | 4.5 | PASS |  |
| glacier as UI on surface | #52D4C2 | #181B45 | 9.02 | 3 | PASS |  |
| success text on surface | #34D399 | #181B45 | 8.52 | 4.5 | PASS |  |
| warning text on surface | #FBBF24 | #181B45 | 9.82 | 4.5 | PASS |  |
| danger text on surface | #F87171 | #181B45 | 5.92 | 4.5 | PASS |  |
| info text on surface | #7FA6FF | #181B45 | 6.87 | 4.5 | PASS |  |
| success text on its 12% tint chip | #34D399 | #1B314F | 6.82 | 4.5 | PASS |  |
| warning text on its 12% tint chip | #FBBF24 | #332F41 | 7.77 | 4.5 | PASS |  |
| danger text on its 12% tint chip | #F87171 | #33254A | 5.03 | 4.5 | PASS |  |
| info text on its 12% tint chip | #7FA6FF | #242C5B | 5.56 | 4.5 | PASS |  |
| accent text on its 12% tint chip | #FF5C82 | #34234C | 4.78 | 4.5 | PASS |  |
| line on bg (border, decorative) | #2E3266 | #0E1030 | 1.55 | 1 | PASS |  |
| line on surface (input border: needs 3:1 if sole indicator) | #2E3266 | #181B45 | 1.38 | 3 | **FAIL** | #64678E |

## Text over glass (worst-case backdrops)

Glass tint is composited over six backdrops standing in for busy product photos. Both text colours must reach 4.5:1 on every row.

| Mode | Surface | Backdrop | ink | text-muted |
|---|---|---|---|---|
| light | glass | black | 6.46 PASS | 2.50 **FAIL** |
| light | glass | white | 17.28 PASS | 6.68 PASS |
| light | glass | marigold photo | 13.18 PASS | 5.10 PASS |
| light | glass | mid grey | 11.06 PASS | 4.27 **FAIL** |
| light | glass | deep indigo | 7.01 PASS | 2.71 **FAIL** |
| light | glass | hot red | 9.12 PASS | 3.52 **FAIL** |
| light | Lite (opaque) | black | 15.12 PASS | 5.84 PASS |
| light | Lite (opaque) | white | 17.28 PASS | 6.68 PASS |
| light | Lite (opaque) | marigold photo | 16.56 PASS | 6.40 PASS |
| light | Lite (opaque) | mid grey | 16.18 PASS | 6.25 PASS |
| light | Lite (opaque) | deep indigo | 15.26 PASS | 5.90 PASS |
| light | Lite (opaque) | hot red | 15.71 PASS | 6.07 PASS |
| dark | glass | black | 16.98 PASS | 9.66 PASS |
| dark | glass | white | 3.77 **FAIL** | 2.14 **FAIL** |
| dark | glass | marigold photo | 6.13 PASS | 3.49 **FAIL** |
| dark | glass | mid grey | 8.40 PASS | 4.78 PASS |
| dark | glass | deep indigo | 15.70 PASS | 8.93 PASS |
| dark | glass | hot red | 10.32 PASS | 5.87 PASS |
| dark | Lite (opaque) | black | 15.08 PASS | 8.58 PASS |
| dark | Lite (opaque) | white | 13.36 PASS | 7.60 PASS |
| dark | Lite (opaque) | marigold photo | 14.01 PASS | 7.97 PASS |
| dark | Lite (opaque) | mid grey | 14.23 PASS | 8.09 PASS |
| dark | Lite (opaque) | deep indigo | 14.94 PASS | 8.50 PASS |
| dark | Lite (opaque) | hot red | 14.62 PASS | 8.32 PASS |

Minimum glass alpha for every backdrop above to pass 4.5:1:

| Mode / text colour | Min alpha |
|---|---|
| light/ink | 0.52 |
| light/muted | 0.84 |
| dark/ink | 0.64 |
| dark/muted | 0.81 |

(DESIGN.md currently specifies 0.62 light / 0.58 dark.)

## Findings and proposed adjustments

Summary: 48 token pairs checked, **9 fail** (8 light, 1 dark) and the glass recipe fails for secondary text on most backdrops.

| # | Failure | Why it matters | Proposed change |
|---|---|---|---|
| 1 | `--brand` (#F5A524) as a UI colour on `--surface` / `--bg`: 2.04 / 1.90 (needs 3:1) | Focus rings, active nav indicator, selected-card borders and toggles that rely on marigold alone are not perceivable (WCAG 1.4.11) | Keep marigold as a **fill** (button background with ink text passes at about 8:1). For any outline or indicator add a second ink ring (focus: 2 px ink inner + 2 px brand outer, as DESIGN.md 11 already hints) or use a darker `--brand-strong` for strokes: minimum **#C68729** (3.0:1). |
| 2 | `--glacier` (#2FB5A3) as text on `--surface`: 2.54 | Delivery/in-stock accent text is unreadable | Use glacier only for fills and icons next to text. For text use **#278281** (4.5:1) in light mode. Dark glacier (#52D4C2) already passes. |
| 3 | `--success`, `--warning`, `--accent` text on their 12% tint chips: 4.45, 4.26, 4.27 | Status chips (delivered, low stock, sale) just miss 4.5 | Either lower the tint to 8% or darken the text slightly: success **#0E7B4A**, warning **#AC500B**, accent **#C9234E**. Recommend the 8% tint (no colour change). |
| 4 | `--line` as an input border on `--surface`: 1.39 light, 1.38 dark | Form fields whose only boundary is `--line` fail non-text contrast (needs 3:1) | Add `--line-strong` for inputs and checkboxes: **#9191A8** (light), **#64678E** (dark). Keep `--line` for decorative dividers. |
| 5 | Glass, `--text-muted` over any glass: 2.14 to 4.27 on 6 of the 12 theme and backdrop combinations | Secondary text on the header, sheets and toasts | Do not use `--text-muted` on glass. Use `--ink` only, or raise glass alpha to at least **0.84 (light) / 0.81 (dark)**. |
| 6 | Glass, `--ink`: dark theme over a white photo 3.77, light fine | The specified dark glass (alpha .58) is too transparent | Raise dark glass alpha to **0.64 or more** (ink passes at 0.64 over the worst tested backdrop). Light glass `.62` already clears ink at 0.52. |

All other pairs pass, including ink on marigold (about 8:1), ink and muted text on bg/surface/surface-2 in both themes, and success/warning/danger/info/accent text on `--surface` (light and dark).

Method notes: ratios use the WCAG 2.x luminance formula; glass is `rgba` composited over six stand-ins (black, white, marigold, mid grey, deep indigo, hot red). Real photos can exceed these extremes (for example a patterned white-and-black product shot). Re-check once real catalogue images exist (Phase 1 on-device test).
