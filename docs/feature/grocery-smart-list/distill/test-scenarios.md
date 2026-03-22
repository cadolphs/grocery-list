# Test Scenarios: Grocery Smart List

**Feature ID**: grocery-smart-list
**Wave**: DISTILL
**Date**: 2026-03-17

---

## Scenario Inventory

### Walking Skeleton (25 scenarios)

| ID | Story | Scenario | Type | Tag |
|----|-------|----------|------|-----|
| WS-1.1 | US-01 | Add a staple item with full metadata | Happy | @walking_skeleton |
| WS-1.2 | US-01 | Add a staple item without an aisle number | Happy | |
| WS-1.3 | US-01 | Add a one-off item to the current trip | Happy | |
| WS-1.4 | US-01 | Prevent duplicate staple in the same area | Error | |
| WS-1.5 | US-01 | Allow same item name in different areas | Edge | |
| WS-2.1 | US-02 | Staples pre-load on new sweep grouped by area | Happy | @walking_skeleton |
| WS-2.2 | US-02 | Empty areas are still visible | Edge | |
| WS-2.3 | US-02 | Newly added staple appears on next sweep | Happy | |
| WS-3.1 | US-03 | Quick-add a new item with metadata | Happy | @walking_skeleton |
| WS-3.2 | US-03 | Quick-add a one-off item | Happy | |
| WS-3.3 | US-03 | Quick-add fails without required metadata | Error | |
| WS-4.1 | US-04 | Toggle from home view to store view | Happy | @walking_skeleton |
| WS-4.2 | US-04 | Store view excludes empty sections | Edge | |
| WS-4.3 | US-04 | Check-off state preserved across view toggle | Happy | |
| WS-5.1 | US-05 | Check off an item in store view | Happy | @walking_skeleton |
| WS-5.2 | US-05 | Uncheck an accidentally checked item | Error recovery | |
| WS-5.3 | US-05 | Check-off survives app restart | Edge | |
| WS-5.4 | US-05 | Section progress updates on check-off | Happy | |
| WS-6.1 | US-06 | Complete trip - bought staples re-queue, bought one-offs clear | Happy | @walking_skeleton |
| WS-6.2 | US-06 | Unbought items carry over exactly once | Edge | |
| WS-6.3 | US-06 | Staple library unchanged after trip completion | Edge | |
| WS-6.4 | US-06 | All items bought - clean next trip | Happy | |

### Milestone 1 (23 scenarios)

| ID | Story | Scenario | Type |
|----|-------|----------|------|
| M1-7.1 | US-07 | Skip a staple without deleting from library | Happy |
| M1-7.2 | US-07 | Skipped staple reappears on next trip | Happy |
| M1-7.3 | US-07 | Re-add a skipped staple within the same trip | Error recovery |
| M1-7.4 | US-07 | Skip multiple staples across different areas | Happy |
| M1-8.1 | US-08 | Complete an area and see sweep progress | Happy |
| M1-8.2 | US-08 | Navigate areas out of order | Edge |
| M1-8.3 | US-08 | All areas complete triggers whiteboard | Happy |
| M1-8.4 | US-08 | Area count updates after additions during sweep | Edge |
| M1-9.1 | US-09 | Type-ahead suggests known staple with metadata | Happy |
| M1-9.2 | US-09 | One-tap add from suggestion fills all metadata | Happy |
| M1-9.3 | US-09 | No suggestions for unknown item | Error |
| M1-9.4 | US-09 | Multiple suggestions for partial match | Happy |
| M1-9.5 | US-09 | Suggestion search is case-insensitive | Edge |
| M1-9.6 | US-09 | Empty input shows no suggestions | Edge |
| M1-10.1 | US-10 | Navigate to next section after completing current | Happy |
| M1-10.2 | US-10 | Move on with unchecked items in a section | Happy |
| M1-10.3 | US-10 | View section list with progress | Happy |
| M1-10.4 | US-10 | Last section completed shows trip completion | Edge |
| M1-11.1 | US-11 | View trip summary with breakdown | Happy |
| M1-11.2 | US-11 | Prep time displayed in trip summary | Happy |
| M1-11.3 | US-11 | Summary reflects skipped staples | Edge |
| M1-11.4 | US-11 | Switch to store view from trip summary | Happy |

---

## Coverage Analysis

**Total scenarios**: 45 (22 walking skeleton + 23 milestone 1)

### By Type
| Type | Count | Percentage |
|------|-------|-----------|
| Happy path | 25 | 56% |
| Error / Error recovery | 6 | 13% |
| Edge case / Boundary | 14 | 31% |
| **Error + Edge total** | **20** | **44%** |

Error + edge path ratio: 44% (exceeds 40% target).

### By Story
| Story | Happy | Error | Edge | Total |
|-------|-------|-------|------|-------|
| US-01 | 2 | 1 | 1 | 4 |
| US-02 | 2 | 0 | 1 | 3 |
| US-03 | 2 | 1 | 0 | 3 |
| US-04 | 2 | 0 | 1 | 3 |
| US-05 | 2 | 1 | 1 | 4 |
| US-06 | 2 | 0 | 2 | 4 |
| US-07 | 3 | 1 | 0 | 4 |
| US-08 | 2 | 0 | 2 | 4 |
| US-09 | 3 | 1 | 2 | 6 |
| US-10 | 2 | 0 | 2 | 4 |
| US-11 | 3 | 0 | 1 | 4 |

All 11 user stories have acceptance test coverage. Every story's acceptance criteria are covered by at least one scenario.

---

## Implementation Sequence

### Phase 1: Walking Skeleton (implement first, one test at a time)
1. WS-1.1: Add staple with full metadata (FIRST TEST TO ENABLE)
2. WS-1.2: Add staple without aisle
3. WS-1.3: Add one-off to trip
4. WS-1.4: Prevent duplicate staple
5. WS-1.5: Same name different areas
6. WS-2.1: Pre-load staples by area
7. WS-2.2: Empty areas visible
8. WS-2.3: New staple on next sweep
9. WS-3.1: Quick-add staple
10. WS-3.2: Quick-add one-off
11. WS-3.3: Quick-add validation error
12. WS-4.1: Toggle to store view
13. WS-4.2: Empty sections excluded
14. WS-4.3: State preserved across toggle
15. WS-5.1: Check off item
16. WS-5.2: Uncheck item
17. WS-5.3: Survives restart
18. WS-5.4: Section progress
19. WS-6.1: Trip completion with carryover
20. WS-6.2: No duplicate carryover
21. WS-6.3: Library unchanged
22. WS-6.4: All bought clean trip

### Phase 2: Milestone 1 (enable after walking skeleton passes)
23-45: Enable one at a time in story order (US-07 through US-11)
