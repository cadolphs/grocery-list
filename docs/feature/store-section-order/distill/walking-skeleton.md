# Walking Skeleton: Store Section Ordering

**Feature ID**: store-section-order
**Date**: 2026-03-22

---

## Walking Skeleton Identification

The walking skeleton for store-section-order focuses on the core domain behavior: **sorting AisleGroups by a custom order**. This is the riskiest-first slice because:

1. It validates the composition pattern: `groupByAisle -> sortByCustomOrder`
2. It proves the null/fallback semantics work correctly
3. It exercises the SectionOrderStorage port contract

### Why Not UI-Level?

The primary risk is in the domain sort logic and storage semantics, not in React rendering. The UI (drag-and-drop settings, StoreView integration) layers on top of correct domain behavior. If `sortByCustomOrder` is wrong, no amount of UI testing helps.

---

## Implementation Sequence (One at a Time)

| Order | Test | What It Proves | Enables |
|-------|------|----------------|---------|
| 1 | WS-1: Custom order overrides default sort | Core sort function works with full custom order | Everything else |
| 2 | WS-2: Fallback to default when null | null semantics correct; backward compatibility | Storage integration |
| 3 | WS-3: Unknown sections append to end | Graceful handling of sections not in order | Auto-append story |
| 4 | WS-4: Storage persists and loads | SectionOrderStorage port contract works | Settings screen |
| 5 | WS-5: Empty sections hidden | groupByAisle + sortByCustomOrder compose correctly | Store view rendering |
| 6 | WS-6: null from storage = default | End-to-end null flow from storage through sort | Reset story |
| 7 | WS-7: Empty array = default | Boundary defense for edge case | Robustness |

---

## Walking Skeleton Litmus Test

1. **Title describes user goal**: "Custom section order overrides default sort" -- Carlos's goal is to see sections in his walking order. Pass.
2. **Given/When describe user context**: "Carlos has trip items... Carlos views the store layout." Pass.
3. **Then describe user observations**: "Sections appear in Carlos's walking order." Pass.
4. **Stakeholder confirmable**: Carlos can confirm "yes, when I set Deli before Dairy, I see Deli first in the store view." Pass.

---

## Riskiest-First Rationale

The custom sort function is the single point of integration between the existing `groupByAisle` output and the new section ordering feature. If this function has incorrect behavior (wrong sort, lost groups, bad null handling), every downstream consumer (StoreView, navigation, settings) will be broken. Testing it first with concrete examples de-risks the entire feature.
