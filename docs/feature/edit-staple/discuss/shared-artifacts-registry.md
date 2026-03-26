# Shared Artifacts Registry: Edit Staple Location

**Feature ID**: edit-staple
**Date**: 2026-03-22

---

## Artifact Registry

### staple_id

- **Source of truth**: `StapleStorage` (persisted StapleItem.id)
- **Consumers**: TripItemRow (tap handler), EditBottomSheet (identifies which staple to update), StapleLibrary.updateStaple (lookup), StapleStorage (persistence key)
- **Owner**: Staple Management domain
- **Integration risk**: HIGH -- wrong ID means editing the wrong staple or a no-op
- **Validation**: ID from TripItemRow.stapleId must resolve to a valid StapleItem in storage

### current_house_area

- **Source of truth**: `StapleItem.houseArea` via `StapleStorage.loadAll()`
- **Consumers**: EditBottomSheet area picker (pre-selected button)
- **Owner**: Staple Management domain
- **Integration risk**: MEDIUM -- if area was renamed between load and display, pre-selection could fail
- **Validation**: Pre-selected area must exist in current area list from AreaStorage

### current_store_section

- **Source of truth**: `StapleItem.storeLocation.section` via `StapleStorage.loadAll()`
- **Consumers**: EditBottomSheet section input (pre-filled value)
- **Owner**: Staple Management domain
- **Integration risk**: LOW -- text field, no referential integrity needed
- **Validation**: Field shows exact string from storage

### current_aisle_number

- **Source of truth**: `StapleItem.storeLocation.aisleNumber` via `StapleStorage.loadAll()`
- **Consumers**: EditBottomSheet aisle input (pre-filled value)
- **Owner**: Staple Management domain
- **Integration risk**: LOW -- nullable integer, straightforward
- **Validation**: Null renders as empty field; number renders as string

### available_areas

- **Source of truth**: `AreaStorage.loadAll()`
- **Consumers**: EditBottomSheet area picker buttons, MetadataBottomSheet (add mode, existing)
- **Owner**: Area Management domain
- **Integration risk**: MEDIUM -- custom areas must appear; deleted areas must not
- **Validation**: Area list in edit sheet matches AreaStorage at time of open

### existing_sections

- **Source of truth**: `StapleLibrary.listAll()` -> deduplicated storeLocation.section values
- **Consumers**: EditBottomSheet section auto-suggest, MetadataBottomSheet (add mode, existing)
- **Owner**: Staple Management domain
- **Integration risk**: LOW -- convenience feature, not correctness-critical
- **Validation**: Suggestions include sections from all staples in library

### updated_staple

- **Source of truth**: `StapleStorage` (after save)
- **Consumers**: HomeView area grouping (via trip items), StoreView aisle grouping, future trip pre-loading
- **Owner**: Staple Management domain
- **Integration risk**: HIGH -- if storage update succeeds but trip/view update fails, UI is stale
- **Validation**: After save, HomeView re-renders with staple in new area; StoreView shows new section/aisle

## Integration Checkpoints

| Checkpoint | Validates | Steps |
|------------|-----------|-------|
| Pre-fill accuracy | Edit sheet fields match staple data in storage | Step 2 |
| Area list freshness | Area picker includes all current areas (incl. custom) | Step 2 |
| Duplicate guard | Cannot save if name+area combo already exists | Step 3 |
| Storage consistency | StapleStorage reflects change after save | Step 3 -> Step 4 |
| Trip item sync | Current trip item reflects updated location | Step 3 -> Step 4 |
| View consistency | HomeView and StoreView both reflect the change | Step 4 |
