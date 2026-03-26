# Wave Decisions: DISTILL - Store Section Ordering

**Feature ID**: store-section-order
**Date**: 2026-03-22

---

## Decision Log

### D1: Domain-level tests only (no UI-level walking skeletons)

**Context**: The feature involves UI (drag-and-drop settings, StoreView integration) and domain logic (sort, append, storage). Walking skeletons could test at UI level with React Testing Library.

**Decision**: All acceptance tests exercise domain pure functions and the storage port. No React rendering in this test suite.

**Rationale**: The primary risk is in `sortByCustomOrder` correctness and null/fallback semantics. The UI renders whatever the domain returns. Testing the domain directly is faster, more stable, and isolates the riskiest behavior. UI integration tests can be added later if needed.

### D2: Section key derived inline (not imported from item-grouping)

**Context**: The architecture design notes that `groupKey` in `item-grouping.ts` is module-private, and section-ordering.ts could either import an exported version or derive the key independently.

**Decision**: Tests derive the section key as `${section}::${aisleNumber}` using a local helper. This matches the architecture recommendation that the crafter can derive keys from AisleGroup fields directly.

**Rationale**: Avoids coupling tests to internal implementation of item-grouping. The key format is part of the domain contract (stored in SectionOrderStorage), not an implementation detail.

### D3: First test uses placeholder for sortByCustomOrder

**Context**: The first walking skeleton test must be enabled (not skipped) to signal the outer-loop failure. But `sortByCustomOrder` does not exist yet.

**Decision**: WS-1 imports `groupByAisle` (existing) and uses `const sorted = defaultGroups;` as a placeholder. The TODO comment marks where `sortByCustomOrder` will be called. The test fails because default sort does not match custom order expectations.

**Rationale**: The test compiles and runs, producing the correct business-logic failure. The DELIVER wave crafter uncomments the import and replaces the placeholder. All subsequent tests have fully commented bodies per the one-at-a-time discipline.

### D4: Navigation tests use sorted array index (no separate navigation function)

**Context**: US-SSO-03 requires "Next section" to follow custom order. The architecture design states navigation follows the render order of the sorted AisleGroup[].

**Decision**: Navigation tests assert on array indices of the sorted result. "Next section after index 0" is simply `sorted[1]`. No separate navigation domain function is tested.

**Rationale**: The architecture design explicitly states "No separate navigation order needed -- it follows the render order." Testing via array index is the simplest correct approach.

### D5: Error/edge ratio at 56%

**Context**: The mandate requires 40%+ error/edge scenarios.

**Decision**: 10 of 18 scenarios (56%) are error or edge cases, covering: null order, empty array order, unknown sections, duplicate prevention, no-op resets, and boundary conditions.

**Rationale**: Custom ordering has many edge cases around null semantics, unknown sections, and reset flows. High edge coverage reflects the real risk profile of this feature.
