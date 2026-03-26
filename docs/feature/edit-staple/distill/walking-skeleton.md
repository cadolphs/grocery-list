# Edit Staple - Walking Skeleton

## Purpose

The walking skeleton proves that a user can edit a staple's house area and store location through the staple library driving port, with proper duplicate detection and self-exclusion.

## Skeleton Scenarios

### WS-ES-1: Moves a staple to a different house area
- **User goal**: Carlos wants to reorganize where "Whole milk" is stored at home
- **Observable outcome**: "Whole milk" appears under "Freezer" instead of "Fridge"
- **Driving port**: `library.updateStaple(id, { houseArea })`
- **Stakeholder demo**: "See, when you change the area, the item moves"

### WS-ES-2: Changes store section and aisle on a staple
- **User goal**: Carlos discovers "Canned beans" moved to a different aisle at the store
- **Observable outcome**: "Canned beans" now shows "International" section, aisle 9
- **Driving port**: `library.updateStaple(id, { storeLocation })`
- **Stakeholder demo**: "The store location updates so your trip reflects the real layout"

### WS-ES-3: Blocks move when same name already exists in target area
- **User goal**: Carlos tries to move "Whole milk" from Fridge to Freezer, but one already exists there
- **Observable outcome**: Error message says "Whole milk" already exists in Freezer; original stays put
- **Driving port**: `library.updateStaple(id, { houseArea })` returns error
- **Stakeholder demo**: "The app prevents accidental duplicates when you move items"

### WS-ES-4: Allows updating store location on same staple without duplicate error
- **User goal**: Carlos changes the aisle number for "Whole milk" without changing its area
- **Observable outcome**: Aisle updates successfully, no false duplicate warning
- **Driving port**: `library.updateStaple(id, { storeLocation })`
- **Stakeholder demo**: "Updating aisle/section on the same item works fine"

## Implementation Sequence

1. Enable WS-ES-1 (first, already enabled)
2. Implement `library.updateStaple` and `StapleStorage.update`
3. Enable WS-ES-2 after WS-ES-1 passes
4. Enable WS-ES-3 (duplicate detection with self-exclusion)
5. Enable WS-ES-4 (self-update edge case)
6. Move to milestone-1 scenarios
