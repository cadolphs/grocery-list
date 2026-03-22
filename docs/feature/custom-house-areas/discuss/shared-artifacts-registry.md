# Shared Artifacts Registry: Custom House Areas

**Feature ID**: custom-house-areas
**Date**: 2026-03-20

---

## Tracked Artifacts

### SA-1: area-list

- **Description**: Ordered list of user-defined house areas
- **Type**: Array of { id, name, position }
- **Source of Truth**: AreaStorage port
- **Consumers**:
  - `HomeView` -- display order of area sections
  - `MetadataBottomSheet` -- area picker buttons
  - `groupByArea()` -- grouping logic (replaces hardcoded `ALL_HOUSE_AREAS`)
  - `getSweepProgress()` -- total area count (replaces hardcoded `ALL_HOUSE_AREAS.length`)
  - `AreaSection` -- area heading names
  - Settings screen -- area management list
- **Persistence**: Local storage (AsyncStorage)
- **Default**: `["Bathroom", "Garage Pantry", "Kitchen Cabinets", "Fridge", "Freezer"]`
- **Migration**: First launch after update -- if no custom areas exist, seed with the 5 defaults

### SA-2: area-name

- **Description**: The display name of a single house area
- **Type**: String (1-40 characters, unique, case-insensitive uniqueness)
- **Source of Truth**: AreaStorage port
- **Consumers**:
  - `StapleItem.houseArea` -- stored on each staple
  - `TripItem.houseArea` -- stored on each trip item
  - UI labels throughout the app
- **Propagation**: Rename updates ALL references (staples, trip items, area list)

### SA-3: area-order

- **Description**: Position/sort index for each area
- **Type**: Integer (0-based index in the area array)
- **Source of Truth**: AreaStorage port (array index = position)
- **Consumers**:
  - `HomeView` -- display order
  - `groupByArea()` -- output order
  - Sweep progression -- suggested next area
- **Persistence**: Local storage (order = array position)

---

## Integration Checkpoints

### IC-1: Area List Loads on App Start

- **From**: AreaStorage
- **To**: HomeView, MetadataBottomSheet, groupByArea, getSweepProgress
- **Validation**: All consumers read from the same source; no consumer uses hardcoded area lists
- **Failure Mode**: If AreaStorage is empty on first launch, seed with 5 defaults
- **Test**: Start app fresh -- 5 default areas appear. Start app after customization -- custom areas appear.

### IC-2: Rename Propagates to All References

- **From**: Settings (rename action)
- **To**: StapleStorage (update houseArea on matching staples), TripStorage (update houseArea on matching trip items)
- **Validation**: After rename, zero staples or trip items reference the old area name
- **Failure Mode**: If propagation fails, the rename should be rolled back (area name reverts to old value)
- **Test**: Rename "Garage Pantry" to "Pantry" -- all staples and trip items with "Garage Pantry" now say "Pantry"

### IC-3: Delete Reassigns All Staples

- **From**: Settings (delete action)
- **To**: StapleStorage (move staples to target area), TripStorage (move trip items to target area)
- **Validation**: Zero staples reference the deleted area; target area staple count increases by the reassigned count
- **Failure Mode**: If reassignment fails, the delete should be rolled back (area remains)
- **Test**: Delete "Freezer" with 2 staples, reassign to "Fridge" -- Fridge gains 2 staples, Freezer gone

### IC-4: Order Persists Across Restart

- **From**: Settings (reorder action)
- **To**: AreaStorage
- **Validation**: After app restart, areas appear in the user-set order
- **Test**: Reorder areas, kill app, reopen -- same order

### IC-5: groupByArea Uses Dynamic List

- **From**: AreaStorage (area-list)
- **To**: `groupByArea()` in `item-grouping.ts`
- **Validation**: `groupByArea` no longer references hardcoded `ALL_HOUSE_AREAS`; it receives the area list as a parameter or reads from a provided source
- **Test**: Add "Laundry Room", assign a staple, start sweep -- "Laundry Room" appears in grouped output

### IC-6: SweepProgress Uses Dynamic Count

- **From**: AreaStorage (area-list)
- **To**: `getSweepProgress()` in `trip.ts`
- **Validation**: `totalAreas` equals the current number of user-defined areas, not hardcoded 5
- **Test**: Add "Laundry Room" (6 areas total) -- sweep progress shows "0 of 6 areas complete"

---

## Cross-Cutting Impacts

| Current Code | Change Required | Artifact Affected |
|---|---|---|
| `HouseArea` union type in `types.ts` | Widen to `string` or make it a branded string | SA-2 |
| `ALL_HOUSE_AREAS` in `item-grouping.ts` | Remove constant; accept area list as parameter | SA-1, IC-5 |
| `ALL_HOUSE_AREAS` in `trip.ts` | Remove constant; accept area list via storage or parameter | SA-1, IC-6 |
| `HOUSE_AREAS` in `MetadataBottomSheet.tsx` | Read from AreaStorage instead of hardcoded array | SA-1, IC-1 |
| `StapleItem.houseArea: HouseArea` | Type changes from union to string | SA-2 |
| `TripItem.houseArea: HouseArea` | Type changes from union to string | SA-2 |
| Tests referencing specific area names | Update to use dynamic test helpers or keep as integration tests with defaults | All |
