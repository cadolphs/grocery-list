# Shared Artifacts Registry: persist-one-offs

## Artifacts

### storeLocation

- **Source of truth**: `StapleItem.storeLocation` in staple library (persisted via `StapleStorage`)
- **Consumers**:
  - MetadataBottomSheet form inputs (write on first add)
  - QuickAdd suggestion display text (`formatSuggestion`)
  - Trip item store location (copied on suggestion select)
  - StoreView aisle grouping (reads from trip item)
- **Owner**: staple-library domain
- **Integration risk**: MEDIUM -- store location must flow from library entry to trip item without loss. If suggestion handler copies location incorrectly, item ends up in wrong aisle in store view.
- **Validation**: After selecting a one-off suggestion, verify `tripItem.storeLocation` matches `libraryEntry.storeLocation`.

### itemType / StapleItem.type

- **Source of truth**: `StapleItem.type` in staple library (`'staple' | 'one-off'`)
- **Consumers**:
  - QuickAdd suggestion formatting (shows "(one-off)" label)
  - HomeView `handleSelectSuggestion` (sets `tripItem.itemType` from `staple.type`)
  - StapleChecklist filtering (excludes `type: 'one-off'`)
  - Trip preloading (excludes `type: 'one-off'`)
  - HomeView one-offs section grouping (filters by `tripItem.itemType`)
- **Owner**: domain types
- **Integration risk**: HIGH -- if type mapping is wrong, one-offs appear in sweep or staples appear in one-offs section. Multiple consumers must all respect the same type.
- **Validation**: End-to-end: add one-off -> re-add via suggestion -> verify it appears in one-offs section, NOT in sweep areas, NOT in checklist.

### houseArea (for one-offs)

- **Source of truth**: `StapleItem.houseArea` -- empty string `''` for one-offs
- **Consumers**:
  - `isDuplicate` check in `createStapleLibrary` (uses `name + houseArea` pair)
  - Trip item `houseArea` (one-offs use `'Kitchen Cabinets'` as sentinel in trip for legacy reasons)
  - MetadataBottomSheet (hides area picker for one-offs)
- **Owner**: domain types / MetadataBottomSheet
- **Integration risk**: MEDIUM -- mismatch between library houseArea (`''`) and trip houseArea (`'Kitchen Cabinets'`) could cause duplicate detection issues if not handled carefully.
- **Validation**: Verify that a staple "Butter" in "Fridge" and a one-off "Butter" with `houseArea: ''` both exist in library without collision.

### itemName

- **Source of truth**: QuickAdd text input (on first add) / `StapleItem.name` (on re-add)
- **Consumers**:
  - MetadataBottomSheet title
  - Library entry `.name`
  - Trip item `.name`
  - QuickAdd suggestion text
  - Search matching
- **Owner**: user input -> staple library
- **Integration risk**: LOW -- name is a simple string, consistent across all consumers.
- **Validation**: Name entered in QuickAdd matches library entry matches trip item name.
