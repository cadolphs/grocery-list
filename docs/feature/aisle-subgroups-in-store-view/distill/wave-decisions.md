# DISTILL Decisions — aisle-subgroups-in-store-view

**Wave**: DISTILL
**Date**: 2026-04-27
**Acceptance Designer**: Quinn
**Refines**: section-order-by-section (DISTILL artifacts)

---

## Key Decisions

- **[D1] No walking skeleton, by carry-over from DISCUSS D9.** Brownfield refinement. Existing infrastructure (`StoreView`, `AisleSection`, `groupBySection`, `ServiceProvider` with null adapters) is already wired and exercised by `src/ui/StoreView.test.tsx`. The riskiest path here is internal: a new pure helper (`partitionSectionByAisle`) and a new render branch inside `AisleSection`. Neither benefits from a full-stack vertical-slice scenario. Per-slice acceptance plan in `walking-skeleton.md` covers all ACs at the right boundary.

- **[D2] Test boundaries split between domain unit and UI component.**
  - **Domain unit tests** (`src/domain/item-grouping.test.ts`, additions): `partitionSectionByAisle` — partition shape, aisle ordering (asc + null tail), single-aisle / all-null collapse semantics (`null` return), per-aisle `checkedCount` / `totalCount` aggregates, input order preservation. Pure-function tests. No React. No fixtures. Mandate 4 (CM-D) satisfied: all aisle-grouping rules live in a pure function and are tested directly without mocks.
  - **Component tests** (`src/ui/AisleSection.test.tsx`, new file): branch selection (flat vs sub-grouped), divider/badge presence, per-aisle progress text and ✓ rendering. Use `@testing-library/react-native` `render` + `getByTestId` / `queryByTestId` matching the style of existing `StoreView.test.tsx`.
  - **Existing `StoreView.test.tsx`**: untouched. Stays green as a regression gate proving section-level header behaviour and section ordering still hold (D-NOREGRESS).

- **[D3] No new test framework introduced.** Confirmed by reading `package.json`: stack is **Jest 29 + jest-expo + @testing-library/react-native 13**. Both new test files use this stack. No Cucumber, no pytest-bdd, no Detox. Gherkin in `walking-skeleton.md` is documentation-only; the executable form is `describe` / `test` blocks with the GIVEN/WHEN/THEN structure recorded as comments — same convention as `StoreView.test.tsx`.

- **[D4] Test data shape.** Synthesise `TripItem` fixtures locally inside each test file using a small `makeItem(name, section, aisleNumber, checked?)` factory in the same style as `StoreView.test.tsx`'s `makeStaple`. For the domain-unit tests, build `SectionGroup` fixtures by feeding raw items through `groupBySection` (the production composition), not by constructing `SectionGroup` literals — this keeps the partition tests honest about the upstream invariants (aisle-asc + null-last + stable input order) that `partitionSectionByAisle` relies on.

- **[D5] testIDs (carried from DESIGN handoff).** New: `aisle-subgroup-{aisleKey | 'no-aisle'}` for each rendered sub-group node, `aisle-subgroup-complete-{aisleKey | 'no-aisle'}` for the per-aisle ✓. Existing: `aisle-section-{section}`, `section-complete-{section}` retained unchanged. Single-aisle and all-null collapse paths are testable by **absence** of `aisle-subgroup-*` testIDs (use `queryByTestId`).

- **[D6] D-NOREGRESS test pattern.** Section-level non-regression is asserted in two places: (a) by `StoreView.test.tsx` (existing) covering ordering, and (b) by five `@noregress`-tagged scenarios in `AisleSection.test.tsx` covering header text, section-level `X of Y`, and section-level ✓ on both flat and sub-grouped branches. Together these prove DISCUSS D-NOREGRESS holds.

- **[D7] One-at-a-time discipline.** Slice 01 scenarios enabled first (US-01: structure). Slice 02 scenarios marked `it.skip` initially and unskipped per outside-in TDD discipline once Slice 01 GREEN. Component-level tests within a slice may run together once the slice is GREEN — the skip discipline is between-slices, not within-scenario.

- **[D8] No `@kpi` or `@real-io` scenarios.** Outcome KPIs are observational / self-reported (see `outcome-kpis.md`); none of them require an emittable metric event. There are **no new driven adapters** in this feature (DESIGN component-boundaries: ports / adapters unchanged). Mandate 6 (Adapter Integration Coverage) does not apply: nothing new to integration-test.

---

## Mandate Compliance Plan

| Mandate | Plan |
|---|---|
| **CM-A (driving ports)** | Domain tests import `partitionSectionByAisle` and `groupBySection` from `src/domain/item-grouping` (the domain driving surface). Component tests import `AisleSection` from `src/ui/AisleSection` (the UI driving surface for a section card). No imports from internal helpers. |
| **CM-B (business language)** | Gherkin in `walking-skeleton.md` uses Carlos's vocabulary: section, aisle, badge, divider, sub-group, checkmark, "X of Y". No "API", "endpoint", "JSON", "schema", "function". |
| **CM-C (user journey + walking skeleton user-centricity)** | D9: no walking skeleton. Per-slice acceptance plan instead. Each scenario describes a section-card observation Carlos can confirm visually (badges, dividers, "X of Y", ✓). |
| **CM-D (pure function extraction)** | All aisle-grouping rules (collapse, ordering, per-aisle counts) live in `partitionSectionByAisle`, a pure function in the domain. Domain tests exercise it directly. UI tests cover only the render branch — no business logic in the component layer. No fixture parametrisation needed. |

---

## Driving Surfaces / Imports

Domain tests (`src/domain/item-grouping.test.ts`):

- `partitionSectionByAisle`, `AisleSubGroup`, `AisleKey`, `groupBySection`, `SectionGroup` from `src/domain/item-grouping`
- `TripItem`, `StoreLocation` types from `src/domain/types`

Component tests (`src/ui/AisleSection.test.tsx`):

- `AisleSection` from `src/ui/AisleSection`
- `groupBySection` from `src/domain/item-grouping` (to construct realistic `SectionGroup` props)
- `TripItem` from `src/domain/types`
- `render`, `screen` from `@testing-library/react-native`

No imports of internal helpers (`compareItemsInSection`, `createSectionGroup`).

---

## Definition of Done (DISTILL → DELIVER)

- [x] All acceptance scenarios written with passing step definitions in plan form (`walking-skeleton.md`, 19 scenarios).
- [x] Test pyramid mapped: 7 domain unit + 12 component + existing `StoreView.test.tsx` regression gate.
- [ ] Peer review approved (acceptance-designer-reviewer; pending DELIVER kick-off).
- [x] Tests runnable in CI: Jest preset `jest-expo` already picks up `src/**/*.test.{ts,tsx}`.
- [x] Story demonstrable: each scenario phrased as a Carlos-visible card observation.

---

## Handoff to DELIVER

- **New file**: `src/ui/AisleSection.test.tsx` (currently does not exist).
- **Extend file**: `src/domain/item-grouping.test.ts` (currently does not exist for this module — DELIVER must create it; section-order-by-section's distill milestone files do not cover the new helper).
- **Production scaffold**: DELIVER adds `partitionSectionByAisle` + `AisleSubGroup` + `AisleKey` to `src/domain/item-grouping.ts` (RED via throw-on-call), then extends `AisleSection.tsx` with the new render branch.
- **Existing tests**: `src/ui/StoreView.test.tsx` must stay green throughout — D-NOREGRESS regression gate.
- **One-at-a-time order**:
  1. Domain unit (`partitionSectionByAisle`) — slice 01 cases (5 scenarios).
  2. Component (`AisleSection`) — slice 01 render-branch cases (5 scenarios).
  3. Domain unit — slice 02 cases (2 scenarios, counts).
  4. Component — slice 02 render cases (7 scenarios, includes 4 `@noregress`).
- **No open questions for DELIVER.** All test boundaries, testIDs, and AC mappings are explicit in `walking-skeleton.md`.
