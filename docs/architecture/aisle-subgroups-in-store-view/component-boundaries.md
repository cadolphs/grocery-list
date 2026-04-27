# Component Boundaries: Aisle Subgroups in Store View

**Feature ID**: aisle-subgroups-in-store-view
**Date**: 2026-04-27

## File-Level Mapping

| Layer | File | Change | Dependency direction |
|---|---|---|---|
| Domain | `src/domain/item-grouping.ts` | **Extend**: add `AisleKey`, `AisleSubGroup`, `partitionSectionByAisle`. Keep `groupBySection` and `compareItemsInSection` unchanged. | depends only on `./types` |
| Domain (types) | `src/domain/types.ts` | Unchanged. `TripItem.storeLocation.aisleNumber: number \| null` already exists. | leaf |
| UI | `src/ui/AisleSection.tsx` | **Extend**: call `partitionSectionByAisle`; branch on `null` for flat path; else render inline AisleSubGroup blocks (divider + badge + per-aisle progress + items). Header behaviour preserved. | depends on `src/domain/item-grouping`, `./TripItemRow`, `./theme` |
| UI | `src/ui/StoreView.tsx` | Unchanged. Continues to pass `SectionGroup` to `AisleSection`. | (unchanged) |
| UI | `src/ui/TripItemRow.tsx` | Unchanged. | (unchanged) |
| Hooks | `src/hooks/useTrip.ts`, `useSectionOrder.ts` | Unchanged. | (unchanged) |
| Ports | `src/ports/**` | Unchanged. | (unchanged) |
| Adapters | `src/adapters/**` | Unchanged. | (unchanged) |
| Tests | `src/domain/item-grouping.test.ts` | Add cases for `partitionSectionByAisle` (see test plan in `architecture-design.md` §6). | follows source |
| Tests | `src/ui/AisleSection.test.tsx` | Add cases for sub-group render branch. | follows source |

## Dependency Direction (Confirmed)

```
UI (StoreView, AisleSection, TripItemRow)
  -> Domain (item-grouping, types)
        ^
        |
   (no other side imports it)

Ports / Adapters / Hooks: untouched.
```

`dependency-cruiser` existing rules cover this; no new rules required.

## What This Feature Does NOT Touch

- No port surface change.
- No adapter change (Firestore + AsyncStorage untouched).
- No persisted document schema change.
- No new top-level component file.
- No new dependency in `package.json`.
- `groupBySection` signature and behaviour preserved (regression guard).
