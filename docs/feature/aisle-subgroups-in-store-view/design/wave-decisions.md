# DESIGN Wave Decisions: Aisle Subgroups in Store View

**Feature ID**: aisle-subgroups-in-store-view
**Date**: 2026-04-27
**Architect**: Morgan (PROPOSE mode, autonomous)
**Refines**: section-order-by-section (D2)

---

## Architecture Summary

Pure UI refinement built on one new domain helper. Add `partitionSectionByAisle(group: SectionGroup): AisleSubGroup[] | null` next to `groupBySection` in `src/domain/item-grouping.ts`. `null` return = render flat (single-aisle, all-null, or empty). Otherwise: numeric-asc sub-groups followed by an optional `null`-keyed tail. `AisleSection.tsx` consumes the helper and branches: flat path preserves today's render exactly; sub-grouped path renders inline AisleSubGroup blocks (divider + badge + per-aisle progress + items). No new ports, adapters, components files, or dependencies. Section header behaviour (text, X of Y, ✓) is identical on both branches → existing behaviour cannot regress.

---

## Keyed Decisions

- **[D1] Aisle key type = `number | null`** (where `null` is the sentinel for "no aisle"). Type-safe under TS strict mode; pattern-matchable via `??` in render. Rejected: string sentinel `'__no_aisle__'` (loses numeric ordering, requires string discrimination at use sites).
- **[D2] Partition lives in domain, not UI.** New pure helper `partitionSectionByAisle` in `src/domain/item-grouping.ts`. Hexagonal architecture rule: layout-relevant aggregation rules (asc + null-tail + collapse + per-aisle counts) are domain concepts, not render concerns. See ADR-005.
- **[D3] Single-aisle and all-null collapse encoded in the partition function** (returns `null`). Single source of truth for "flat render"; UI branches once on `partition === null`. Rejected: always-array-then-decide-in-UI (duplicates the rule across two layers).
- **[D4] Mixed numeric + null ordering = numeric ascending first, then `null` tail.** Encoded in the partition function. Matches DISCUSS D3.
- **[D5] Render shape = extend `AisleSection` in place with an inline AisleSubGroup render block.** No new top-level React component file. The block is a div+styles, not a separate component, because there is no reuse target. Decision can be revisited if it grows in scope.
- **[D6] Per-aisle `checkedCount` / `totalCount` derived inside the partition function**, mirroring `SectionGroup`'s shape. UI reads, never recomputes. Symmetric aggregate semantics → identical render code shape for progress + checkmark.
- **[D7] Reuse over rewrite — `groupBySection` and `compareItemsInSection` are untouched.** The partition consumes the already-aisle-asc/null-last ordered output of `groupBySection`. Bucketing becomes a single linear pass.
- **[D8] AisleSubGroup type mirrors SectionGroup shape**: `{ aisleKey, items, totalCount, checkedCount }`. Familiar to readers of either.
- **[D-NOREGRESS] Section-level header behaviour does not change.** Text, X of Y, and ✓ render identically on both flat and sub-grouped branches. Existing tests for section progress + completion remain green by construction.

---

## Reuse Analysis

| Existing artifact | Decision | Rationale |
|---|---|---|
| `groupBySection` (`src/domain/item-grouping.ts`) | EXTEND via composition | Compose, not modify. New helper consumes its output. |
| `compareItemsInSection` | REUSE as-is | Already enforces aisle-asc + null-last + stable input order. Partition relies on this property. |
| `SectionGroup` shape | MIRROR in `AisleSubGroup` | Symmetric aggregate semantics keep render code shape identical. |
| `AisleSection.tsx` | EXTEND in place | Section card frame, header, and section progress are unchanged. New body branch handles sub-grouping. No new file. |
| `TripItemRow` | REUSE as-is | Item rendering unchanged on both branches. |
| `StoreView.tsx` | NO CHANGE | Continues to pass `SectionGroup` to `AisleSection`; partition is downstream. |

Default-EXTEND verdict satisfied. **Zero new top-level files** outside the helper-test file pair.

---

## Tech Stack

No additions. All existing:

| Technology | Role | License |
|---|---|---|
| TypeScript 5.x (strict) | Domain helper + types | Apache 2.0 |
| React Native + Expo SDK 54 | UI render | MIT |
| Jest | Unit + component tests | MIT |
| Stryker (existing scope) | Mutation testing on `src/domain/**` | Apache 2.0 |

No new `package.json` entries.

---

## Constraints

- TypeScript strict mode preserved.
- Functional paradigm: pure functions, factories, hooks; no classes.
- Hexagonal architecture: domain has zero UI imports; UI depends on domain (one direction).
- Section-level header behaviour MUST NOT regress (D-NOREGRESS).
- No persistence change. No port surface change. No adapter change.
- C4 System Context (L1) and Container (L2) are not regenerated; only an L3 component sketch for the touched code is added (see `architecture-design.md` §5 and brief append).
- Mutation kill-rate ≥80% on `src/domain/item-grouping.ts` (unchanged threshold).

---

## Upstream Changes

None expected. DISCUSS already accounted for the change in `journey-delta.md` § Changed Assumptions, which back-propagates against `section-order-by-section` D2. The prior feature's contract ("single header per section, items aisle-asc inside") is preserved at the section level; the refinement adds a sub-level render that depends on no new contract from the prior feature.

---

## ADRs

- **ADR-005**: Aisle Sub-Grouping Belongs in the Domain, Composing on `groupBySection`.
  Path: `docs/product/architecture/adr-005-aisle-subgrouping-domain-helper.md`.

---

## Handoff to DISTILL (acceptance-designer)

- All US-01 / US-02 acceptance criteria are observable on the rendered store view.
- Test patterns: existing `src/domain/item-grouping.test.ts` + `src/ui/AisleSection.test.tsx` patterns extend.
- Suggested testIDs for acceptance scenarios: `aisle-section-{section}` (existing), new `aisle-subgroup-{aisleKey | 'no-aisle'}`, new `aisle-subgroup-complete-{aisleKey | 'no-aisle'}` for the per-aisle ✓.
- Single-aisle and all-null collapse paths are testable by absence of `aisle-subgroup-*` testIDs.

## Handoff to DEVOPS (platform-architect)

- No CI pipeline change.
- No external integration introduced. Existing Firestore document schemas unchanged → no contract-test annotation update needed.
- Mutation scope unchanged (already targets `src/domain/**`).
