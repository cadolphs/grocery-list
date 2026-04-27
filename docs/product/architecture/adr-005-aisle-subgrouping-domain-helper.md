# ADR-005: Aisle Sub-Grouping Belongs in the Domain, Composing on `groupBySection`

## Status

Accepted — 2026-04-27

## Context

Feature `aisle-subgroups-in-store-view` partitions trip items inside each section card by `aisleNumber`, with per-aisle progress and completion. The existing `groupBySection` (in `src/domain/item-grouping.ts`) returns `SectionGroup[]` with items already sorted aisle-ascending (nulls last). The new feature needs an additional level of grouping that:

- collapses to flat rendering for single-aisle and all-null sections (D2, D5);
- places `null` items in a tail bucket for mixed sections (D3);
- exposes per-aisle `checkedCount` / `totalCount` for progress + checkmark (D4).

Question: where does this partition live?

## Decision

Add a pure helper `partitionSectionByAisle(group: SectionGroup): AisleSubGroup[] | null` to `src/domain/item-grouping.ts`. It composes on top of `groupBySection`'s output, returns `null` when sub-grouping should collapse (single-aisle, all-null), and otherwise returns ordered `AisleSubGroup[]` with numeric buckets ascending followed by an optional `null`-keyed tail bucket. `AisleSubGroup` mirrors the `SectionGroup` shape (`{ aisleKey, items, totalCount, checkedCount }`).

The UI (`AisleSection.tsx`) calls the helper, branches on the `null` return for the flat path, and otherwise renders sub-groups with a divider + badge. No partition logic in the UI.

## Alternatives Considered

| # | Alternative | Why Rejected |
|---|-------------|--------------|
| 1 | UI-side partition inside `AisleSection.tsx` | Leaks domain rules (asc-then-null tail, single-aisle collapse, per-aisle aggregate counts) into a render component. Hexagonal architecture violation: section-level rule "what counts as one aisle group" is a domain concept, not a layout concern. Untestable without React Native runtime. |
| 2 | New top-level helper file (`src/domain/aisle-partitioning.ts`) | Splits cohesive grouping logic across two files. `partitionSectionByAisle` consumes `SectionGroup` and produces a strictly analogous shape; placing it next to `groupBySection` keeps the two-step pipeline visually colocated. No reuse outside `item-grouping.ts` justifies a separate module. |
| 3 | Extend `groupBySection` to return `SectionGroup` with an embedded `aisleSubGroups: AisleSubGroup[] \| null` field | Conflates two responsibilities into one signature. Callers that only want section-level grouping (e.g. `SectionOrderSettingsScreen`-style read paths) would carry a payload they ignore. Breaking change to the existing public type. The two-step pipeline stays composable: `groupBySection -> sortByCustomOrder -> partitionSectionByAisle` per group. |

## Consequences

### Positive
- Domain rules stay in the domain. Pure-function testability preserved (jest unit tests with no React).
- `groupBySection` contract unchanged — section-by-section feature behaviour is fully preserved (US-01/US-02 of `section-order-by-section` do not regress).
- `AisleSubGroup` shape symmetric with `SectionGroup` → readers familiar with one immediately recognise the other.
- The `null`-return collapse signal makes the flat-render path explicit and statically checkable in TS strict mode.
- Mutation-testing target expands naturally: `item-grouping.ts` already inside the per-feature mutation scope (`src/domain/**`).

### Negative
- One additional pure function to maintain. Minimal — the function is small and the rules are documented in user stories.
- `AisleSection.tsx` gains a small branch (sub-group render path vs. flat). Mitigated by a tightly scoped sub-render block with its own testID (`aisle-subgroup-{aisleKey}`).

### Quality Attribute Impact
- Maintainability: improved (domain language matches user-story vocabulary; helper is colocated).
- Testability: improved (pure function; React-free; mutation-scoped).
- Real-time consistency / fault tolerance / persistence: untouched (no port, no adapter, no schema change).
