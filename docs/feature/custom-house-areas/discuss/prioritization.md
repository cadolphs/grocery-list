# Prioritization: Custom House Areas

**Feature ID**: custom-house-areas
**Date**: 2026-03-20

---

## Prioritization Criteria

| Story | User Outcome | Risk | Dependencies | Priority |
|---|---|---|---|---|
| US-CHA-01: View Area List | Entry point to all area management | Low | None | 1 (Walking Skeleton) |
| US-CHA-02: Add Area | Core value: extend beyond defaults | Medium (name validation) | US-CHA-01 | 2 (Walking Skeleton) |
| US-CHA-03: Dynamic Area Consumption | Make existing features area-aware | High (cross-cutting) | US-CHA-01 | 3 (Walking Skeleton) |
| US-CHA-04: Rename Area | Personalization, propagation complexity | High (data propagation) | US-CHA-03 | 4 (Release 1) |
| US-CHA-05: Delete Area | Cleanup, reassignment logic | High (data reassignment) | US-CHA-03, US-CHA-04 | 5 (Release 1) |
| US-CHA-06: Reorder Areas | Sweep flow customization | Medium (drag-and-drop UX) | US-CHA-03 | 6 (Release 1) |
| US-CHA-07: Area Name Validation | Robustness | Low | US-CHA-02 | 7 (Release 1) |

---

## Riskiest Assumptions

1. **Rename propagation is atomic**: Renaming "Garage Pantry" to "Pantry" must update ALL staples and trip items in one operation. Partial propagation = data corruption.
2. **Delete reassignment is safe**: Moving staples from a deleted area to a target area must not create duplicates (same item name in same area).
3. **Dynamic area list does not break performance**: `groupByArea` currently iterates a fixed 5-element array. With N user areas, performance must remain acceptable.
4. **Type system transition is smooth**: Changing `HouseArea` from a union type to `string` may surface type errors throughout the codebase.

---

## Delivery Sequence

```
Walking Skeleton (US-CHA-01, 02, 03)
  "Areas come from storage, not code"
        |
        v
Release 1 (US-CHA-04, 05, 06, 07)
  "Full CRUD with propagation and validation"
        |
        v
Release 2 (future, if needed)
  "Edge cases: mid-trip changes, first-launch migration"
```

---

## Suggested Approach

1. Start with US-CHA-03 (dynamic consumption) as the **riskiest**: it touches item-grouping.ts, trip.ts, MetadataBottomSheet.tsx, and HomeView.tsx. Proving this works with the existing 5 defaults (no user changes yet) de-risks everything else.
2. Then US-CHA-01 + US-CHA-02 to give users the settings screen and add capability.
3. Then US-CHA-04 (rename) and US-CHA-05 (delete) as the propagation stories.
4. US-CHA-06 (reorder) and US-CHA-07 (validation) in parallel.
