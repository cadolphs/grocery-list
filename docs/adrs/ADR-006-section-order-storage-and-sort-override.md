# ADR-006: Section Order Storage and Sort Override Strategy

## Status

Proposed

## Context

The grocery-smart-list app sorts store view sections using `compareAisleGroups` in `item-grouping.ts`: numbered aisles ascending, then named sections alphabetically. Carlos wants to customize this order to match his physical walking path through the store.

### Quality Attribute Priorities

1. **Maintainability** -- existing `groupByAisle` is stable and tested; avoid modifying it
2. **Testability** -- section ordering logic must be independently testable with pure functions
3. **Simplicity** -- single user, single store, offline-first; minimal new abstractions
4. **Backward compatibility** -- no custom order = existing behavior preserved exactly

### Constraints

- Functional TypeScript, ports-and-adapters architecture (ADR-001)
- Cached adapter pattern for AsyncStorage (ADR-003)
- Zero new runtime dependencies
- Sections are emergent from items, not managed entities (DISCUSS D1)

## Decision

**Composition-based sort override with dedicated SectionOrderStorage port.**

### Storage

A new driven port `SectionOrderStorage` with three operations:

- `loadOrder(): string[] | null` -- returns the custom section order or null (no customization)
- `saveOrder(order: string[]): void` -- persists a new custom order
- `clearOrder(): void` -- removes custom order, reverting to default sort

The stored value is an ordered array of section keys using the format `${section}::${aisleNumber}` (same composite key as `groupKey` in `item-grouping.ts`).

`null` return semantics: distinguishes "never customized" (null, use default sort) from "customized" (array, use custom sort). This is important because an empty array and a null have different behavioral implications.

### Sort Override

A new pure function module `section-ordering.ts` provides a sort function that:

1. Accepts `AisleGroup[]` (output of existing `groupByAisle`) and `string[] | null` (section order)
2. When order is null, returns groups unchanged (default sort preserved)
3. When order exists, sorts groups by their index in the order array
4. Groups with keys not in the order array sort to the end, using the existing default comparison among themselves

This is a composition: `groupByAisle` groups and default-sorts, then the custom sort re-orders. `groupByAisle` is never modified.

### Adapter Pattern

Follows ADR-003:

- `AsyncSectionOrderStorage`: cached adapter with `initialize()`, storage key `@grocery/section_order`
- `NullSectionOrderStorage`: in-memory adapter for testing, accepts optional initial order

## Alternatives Considered

### Alternative 1: Modify groupByAisle to accept optional section order

Add an optional `sectionOrder?: string[]` parameter to `groupByAisle`. When provided, use it for sorting instead of `compareAisleGroups`.

**Evaluation**:
- (+) Single function handles both grouping and sorting
- (+) No new module needed
- (-) Mixes two concerns: grouping items into AisleGroups and ordering those groups
- (-) Makes `groupByAisle` harder to test -- tests must cover both grouping and two sort paths
- (-) Increases the function's parameter surface for all callers, even those that do not need custom ordering
- (-) Violates single responsibility: grouping logic should not know about custom order persistence

**Rejected because**: Composition (separate functions for separate concerns) is more maintainable and testable than a multi-responsibility function. The cost of a new module is low.

### Alternative 2: Store section order inside AreaStorage

Extend `AreaStorage` to include a `sectionOrder` field, or use a generic key-value storage port.

**Evaluation**:
- (+) No new port needed
- (+) Fewer files
- (-) Conflates house area management with store section ordering -- different domains
- (-) AreaStorage has `loadAll/saveAll` semantics (never null); section order needs null semantics
- (-) Would require AreaStorage schema migration
- (-) Violates design decision D1 (sections are not managed entities like areas)

**Rejected because**: Section ordering and area management are independent concerns. Coupling them creates a maintenance burden when either changes.

### Alternative 3: Store order as item metadata (per-item sort index)

Add a `sortIndex` field to each item's `StoreLocation`, persisted with the staple/trip data.

**Evaluation**:
- (+) No new storage port needed
- (-) Requires modifying `StoreLocation` type (breaking change across all items)
- (-) Sort index is duplicated across every item in the same section
- (-) Changing section order requires updating every item in every section
- (-) New sections have no sort index until all items are updated
- (-) Fundamentally wrong abstraction: order is a property of the section list, not individual items

**Rejected because**: Section order is a list-level concern, not an item-level concern. Storing it per-item duplicates data and creates update complexity.

## Consequences

### Positive

- `groupByAisle` remains untouched -- zero risk of regression in existing grouping/sorting
- All new logic is pure functions, trivially testable without mocks
- Clear null semantics: no custom order = default behavior, guaranteed
- Follows established patterns (ADR-003 cached adapter, port/adapter boundary)
- New module is small (~50-100 lines of pure functions) and self-contained

### Negative

- One more port interface, two more adapter files, one more domain module (total ~5 new files)
- Two-step composition in StoreView (group then sort) instead of single call
- Section key format (`section::aisleNumber`) is duplicated between `item-grouping.ts` and `section-ordering.ts` (crafter may extract to shared utility if desired)

### Quality Attribute Impact

| Attribute | Impact |
|-----------|--------|
| Maintainability | Positive -- separation of concerns, existing code unchanged |
| Testability | Positive -- pure functions, null adapter, no mocking needed |
| Performance | Neutral -- re-sort of <20 groups is negligible |
| Reliability | Positive -- graceful fallback to default sort on null order |
| Simplicity | Neutral -- adds files but each is small and focused |
