# Acceptance Review: Store Section Ordering

**Feature ID**: store-section-order
**Date**: 2026-03-22

---

## Mandate Compliance Evidence

### CM-A: Hexagonal Boundary Enforcement

All test files import through driving ports only:

**Walking skeleton imports**:
```typescript
import { groupByAisle, AisleGroup } from '../../../src/domain/item-grouping';
import { TripItem } from '../../../src/domain/types';
// import { sortByCustomOrder } from '../../../src/domain/section-ordering';
// import { createNullSectionOrderStorage } from '../../../src/adapters/null/null-section-order-storage';
```

**Milestone 1 imports**:
```typescript
import { groupByAisle, AisleGroup } from '../../../src/domain/item-grouping';
import { TripItem } from '../../../src/domain/types';
// import { sortByCustomOrder, appendNewSections } from '../../../src/domain/section-ordering';
// import { createNullSectionOrderStorage } from '../../../src/adapters/null/null-section-order-storage';
```

Driving ports used:
- `sortByCustomOrder` -- new pure function (entry point for custom ordering)
- `appendNewSections` -- new pure function (entry point for section discovery)
- `groupByAisle` -- existing pure function (provides input)
- `createNullSectionOrderStorage` -- null adapter (test double for storage port)

Zero internal component imports. No validators, parsers, or internal helpers tested directly.

### CM-B: Business Language Purity

Gherkin terms audit (zero technical terms found):
- "Carlos's walking order" (not "sort array by index")
- "sections appear in custom order" (not "AisleGroup[] sorted by sectionOrder index")
- "Deli before Dairy" (not "index 0 < index 1")
- "store layout" (not "groupByAisle output")
- "persists and loads" (not "saveOrder/loadOrder API calls")
- "default sort" (not "compareAisleGroups comparator")
- "null stored order" (not "loadOrder returns null")

Step method comments use business actions:
- "Carlos views the store layout" (not "call sortByCustomOrder")
- "Carlos resets the section order" (not "call storage.clearOrder()")

### CM-C: Walking Skeleton + Focused Scenario Counts

- Walking skeletons: 5 (tagged @walking_skeleton in .feature file)
- Focused scenarios (walking skeleton file): 2 edge cases
- Focused scenarios (milestone 1 file): 11
- **Total**: 18 scenarios
- **Error/edge ratio**: 10/18 = 56% (exceeds 40% target)

---

## Peer Review Checklist

| Dimension | Status | Evidence |
|-----------|--------|----------|
| Hexagonal boundaries | Pass | All imports are driving ports or null adapters |
| Business language | Pass | Zero technical terms in Gherkin or test descriptions |
| User journey completeness | Pass | Each scenario traces from user action to observable outcome |
| Error path coverage | Pass | 56% error/edge ratio |
| One-at-a-time discipline | Pass | First test enabled, 17 tests skipped |
| Walking skeleton quality | Pass | Litmus test passed (see walking-skeleton.md) |

---

## Test Execution Results

```
Walking skeleton:  1 failed (expected - sortByCustomOrder not implemented), 6 skipped
Milestone 1:       11 skipped

First test fails for business logic reason:
  Expected: "Health & Beauty" (custom order position 1)
  Received: "Dairy" (default sort - aisle 3 first)

This is the correct outer-loop failure signal for the DELIVER wave.
```
