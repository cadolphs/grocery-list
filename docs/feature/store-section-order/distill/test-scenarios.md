# Test Scenarios: Store Section Ordering

**Feature ID**: store-section-order
**Date**: 2026-03-22

---

## Scenario Inventory

### Walking Skeleton (7 scenarios)

| ID | Scenario | Story | Type | Tag |
|----|----------|-------|------|-----|
| WS-1 | Custom section order overrides default sort | US-SSO-02 | Happy path | @walking_skeleton |
| WS-2 | Fallback to default order when no custom order | US-SSO-02 | Happy path | @walking_skeleton |
| WS-3 | Unknown sections append to end of custom order | US-SSO-02 | Edge case | @walking_skeleton |
| WS-4 | Section order persists and loads from storage | US-SSO-01 | Happy path | @walking_skeleton |
| WS-5 | Custom order still hides empty sections | US-SSO-02 | Happy path | @walking_skeleton |
| WS-6 | null stored order means default sort | US-SSO-02 | Edge case | |
| WS-7 | Empty array order falls back to default sort | US-SSO-02 | Edge case | |

### Milestone 1 (11 scenarios)

| ID | Scenario | Story | Type |
|----|----------|-------|------|
| M1-1 | New section auto-appends to custom order | US-SSO-04 | Happy path |
| M1-2 | Multiple new sections auto-append | US-SSO-04 | Happy path |
| M1-3 | No change when all sections already present | US-SSO-04 | Edge case |
| M1-4 | Auto-append does not create duplicates | US-SSO-04 | Error defense |
| M1-5 | Reset clears custom order, reverts to default | US-SSO-05 | Happy path |
| M1-6 | New custom order after reset | US-SSO-05 | Happy path |
| M1-7 | Next section follows custom order | US-SSO-03 | Happy path |
| M1-8 | Next section skips empty sections | US-SSO-03 | Edge case |
| M1-9 | No next section after last | US-SSO-03 | Edge case |
| M1-10 | Auto-append with null order is no-op | US-SSO-04 | Edge case |
| M1-11 | Reset when no custom order is safe | US-SSO-05 | Edge case |

---

## Coverage Analysis

**Total scenarios**: 18
**By type**:
- Happy path: 8 (44%)
- Edge case: 8 (44%)
- Error defense: 2 (11%)

**Error/edge ratio**: 10/18 = 56% (exceeds 40% target)

**Story coverage**:
- US-SSO-01 (Reorder sections): 1 scenario (storage persistence; drag-and-drop is UI-level)
- US-SSO-02 (Store view uses custom order): 7 scenarios (core sort behavior + fallbacks + edge cases)
- US-SSO-03 (Section navigation follows order): 3 scenarios (next, skip empty, last section)
- US-SSO-04 (New section auto-appends): 4 scenarios (single, multiple, no-op, null guard)
- US-SSO-05 (Reset to default): 3 scenarios (reset, re-customize, null guard)

---

## Driving Ports Exercised

| Port | Function | Scenarios |
|------|----------|-----------|
| Domain (new) | `sortByCustomOrder` | WS-1 through WS-7, M1-5, M1-6, M1-7, M1-8, M1-9 |
| Domain (new) | `appendNewSections` | M1-1 through M1-4 |
| Domain (existing) | `groupByAisle` | All scenarios (provides input to sortByCustomOrder) |
| Storage (new) | `SectionOrderStorage.loadOrder` | WS-4, WS-6, M1-5, M1-6, M1-10, M1-11 |
| Storage (new) | `SectionOrderStorage.saveOrder` | WS-4, M1-6 |
| Storage (new) | `SectionOrderStorage.clearOrder` | M1-5, M1-6, M1-11 |
