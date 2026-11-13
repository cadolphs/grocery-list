---
name: userinterface-wiki
description: UI/UX review rules for this app's visual overhaul. Use when choosing colors, shadows, radii, spacing, typography, or when judging a screen's hierarchy, grouping, target sizes and feedback. Covers Laws of UX, typography and visual design. Outputs file:line findings.
license: MIT
metadata:
  author: raphael-salaja
  version: "3.0.0"
---

# User Interface Wiki (pruned)

Pruned copy of [raphaelsalaja/userinterface-wiki](https://github.com/raphaelsalaja/userinterface-wiki) v3.0.0 (MIT). Only the `ux-`, `type-` and `visual-` rules are kept: 48 of the upstream 152. The animation, audio, CSS pseudo-element, morphing icon, container and prefetch rules target web and Next.js and do not fit a React Native app. The upstream compiled `AGENTS.md` was dropped.

Rules were written for the web. On React Native, apply the intent and translate the mechanism: CSS-only rules (`type-text-wrap-*`, `type-font-display-swap`, `type-underline-offset`, `type-antialiased-on-retina`, `type-no-font-synthesis`, `type-justify-with-hyphens`, `type-proper-fractions`, `type-opentype-*`) matter for the web build only; `ux-fitts-hit-area` becomes `hitSlop`; box shadows become `boxShadow` or platform elevation.

## When to Apply

- Choosing or changing tokens in `src/ui/theme.ts` (colors, radii, spacing, shadows).
- Reviewing a screen for hierarchy, grouping, target size, feedback and readability at a glance.
- Writing or reviewing typography: number alignment, weights, letter spacing.

Contrast ratios are not covered here: measure them against WCAG AA (4.5:1 text, 3:1 large text and UI) instead of judging by eye.

## Rule Categories

### 1. Laws of UX (HIGH)

- `ux-fitts-target-size` - Size interactive targets for easy clicking (min 32px)
- `ux-fitts-hit-area` - Expand hit areas with invisible padding or pseudo-elements
- `ux-hicks-minimize-choices` - Minimize choices to reduce decision time
- `ux-millers-chunking` - Chunk data into groups of 5-9 for scannability
- `ux-doherty-under-400ms` - Respond within 400ms to feel instant
- `ux-doherty-perceived-speed` - Fake speed with skeletons, optimistic UI, progress indicators
- `ux-postels-accept-messy-input` - Accept messy input, output clean data
- `ux-progressive-disclosure` - Show what matters now, reveal complexity later
- `ux-jakobs-familiar-patterns` - Use familiar UI patterns users know from other sites
- `ux-aesthetic-usability` - Visual polish increases perceived usability
- `ux-proximity-grouping` - Group related elements spatially with tighter spacing
- `ux-similarity-consistency` - Similar elements should look alike
- `ux-common-region-boundaries` - Use boundaries to group related content
- `ux-von-restorff-emphasis` - Make important elements visually distinct
- `ux-serial-position` - Place key items first or last in sequences
- `ux-peak-end-finish-strong` - End experiences with clear success states
- `ux-teslers-complexity` - Move complexity to the system, not the user
- `ux-goal-gradient-progress` - Show progress toward completion
- `ux-zeigarnik-show-incomplete` - Show incomplete state to drive completion
- `ux-pragnanz-simplify` - Simplify complex visuals into clear forms
- `ux-pareto-prioritize-features` - Prioritize the critical 20% of features
- `ux-cognitive-load-reduce` - Minimize extraneous cognitive load
- `ux-uniform-connectedness` - Visually connect related elements with lines or frames

### 2. Typography (MEDIUM)

- `type-tabular-nums-for-data` - Tabular numbers for columns, dashboards, pricing
- `type-oldstyle-nums-for-prose` - Oldstyle numbers blend into body text
- `type-slashed-zero` - Slashed zero in code-adjacent UIs
- `type-opentype-contextual-alternates` - Keep calt enabled for contextual glyph adjustment
- `type-disambiguation-stylistic-set` - Enable ss02 to distinguish I/l/1 and 0/O
- `type-optical-sizing-auto` - Leave font-optical-sizing auto for size-adaptive glyphs
- `type-antialiased-on-retina` - Antialiased font smoothing on retina displays
- `type-text-wrap-balance-headings` - text-wrap: balance on headings for even lines
- `type-underline-offset` - Offset underlines below descenders
- `type-no-font-synthesis` - Disable font-synthesis to prevent faux bold/italic
- `type-font-display-swap` - Use font-display: swap to avoid invisible text during load
- `type-variable-weight-continuous` - Use continuous weight values (100-900) with variable fonts
- `type-text-wrap-pretty` - text-wrap: pretty for body text to reduce orphans
- `type-justify-with-hyphens` - Pair text-align: justify with hyphens: auto
- `type-letter-spacing-uppercase` - Add letter-spacing to uppercase and small-caps text
- `type-proper-fractions` - Use diagonal-fractions for proper typographic fractions

### 3. Visual Design (HIGH)

- `visual-concentric-radius` - Inner radius = outer radius minus padding for nested elements
- `visual-layered-shadows` - Layer multiple shadows for realistic depth
- `visual-shadow-direction` - All shadows share same offset direction (single light source)
- `visual-no-pure-black-shadow` - Use neutral colors, not pure black, for shadows
- `visual-shadow-matches-elevation` - Shadow size indicates elevation in consistent scale
- `visual-animate-shadow-pseudo` - Animate shadow via pseudo-element opacity for performance
- `visual-consistent-spacing-scale` - Use a consistent spacing scale, not arbitrary values
- `visual-border-alpha-colors` - Semi-transparent borders adapt to any background
- `visual-button-shadow-anatomy` - Six-layer shadow anatomy for polished buttons

## How to Use

Read the individual rule file for the explanation and the incorrect and correct examples:

```
rules/ux-fitts-target-size.md
rules/type-tabular-nums-for-data.md
rules/visual-consistent-spacing-scale.md
```
