# Test Scenario Inventory: grocery-list-ui

## Walking Skeleton (6 scenarios)

| ID | Scenario | Story | Type |
|----|----------|-------|------|
| UI-WS-1 | Home view shows staples organized by house area | US-02 | Happy path |
| UI-WS-2 | Quick-add places a new item on the trip | US-03 | Happy path |
| UI-WS-3 | Toggle switches from home view to store view | US-04 | Happy path |
| UI-WS-4 | Store view shows items organized by aisle and section | US-04 | Happy path |
| UI-WS-5 | Tapping an item in store view marks it as in the cart | US-05 | Happy path |
| UI-WS-6 | Completing the trip shows a summary with carryover | US-06 | Happy path |

## Milestone 1 UI Features (18 scenarios)

### US-07: Skip button on home screen (3 scenarios)

| ID | Scenario | Type |
|----|----------|------|
| M1-UI-01 | Skip a staple removes it from the home view | Happy path |
| M1-UI-02 | Skipped item does not appear in store view | Edge case |
| M1-UI-03 | Re-add a skipped staple on the home screen | Alternative path |

### US-08: Area completion and sweep progress (3 scenarios)

| ID | Scenario | Type |
|----|----------|------|
| M1-UI-04 | Marking an area complete updates the progress bar | Happy path |
| M1-UI-05 | Navigate to a different area out of order | Alternative path |
| M1-UI-06 | All areas complete shows whiteboard prompt | Boundary |

### US-09: Type-ahead suggestions in quick-add (4 scenarios)

| ID | Scenario | Type |
|----|----------|------|
| M1-UI-07 | Typing a prefix shows matching staple suggestions | Happy path |
| M1-UI-08 | Tapping a suggestion fills in all metadata | Happy path |
| M1-UI-09 | No suggestions shown for unknown items | Error path |
| M1-UI-10 | Clearing the quick-add field hides suggestions | Edge case |

### US-10: Store section navigation and progress (3 scenarios)

| ID | Scenario | Type |
|----|----------|------|
| M1-UI-11 | Section progress shows checked count per section | Happy path |
| M1-UI-12 | Completed section shows a checkmark badge | Happy path |
| M1-UI-13 | Last section completed reveals finish trip button | Boundary |

### US-11: Trip summary screen (3 scenarios)

| ID | Scenario | Type |
|----|----------|------|
| M1-UI-14 | Trip summary displays total and breakdown | Happy path |
| M1-UI-15 | Trip summary shows preparation time | Happy path |
| M1-UI-16 | Switch to store view from trip summary | Alternative path |

## Coverage Summary

- Total scenarios: 24 (6 walking skeleton + 18 milestone 1)
- Happy path: 14 (58%)
- Error/edge/boundary: 5 (21%)
- Alternative path: 5 (21%)
- Error path ratio note: UI tests focus on rendering correctness. Error paths for business logic are covered in the domain-level acceptance tests (tests/acceptance/grocery-smart-list/). The UI layer has fewer error scenarios because validation happens at the domain boundary.
