# Shared Artifacts Registry: Add Item Metadata Flow

**Feature ID**: add-item-flow
**Date**: 2026-03-19

---

## Artifacts

### item_name

- **Source of truth**: QuickAdd text input state (`inputText`)
- **Consumers**: QuickAdd suggestion row ("Add X as new item..."), bottom sheet title, confirmation toast, trip item list row
- **Owner**: QuickAdd component
- **Integration risk**: LOW -- single source, passed as prop to bottom sheet
- **Validation**: Item name in bottom sheet title matches QuickAdd input exactly

### house_area

- **Source of truth**: HomeView `activeArea` state (sweep mode) or user selection in bottom sheet area picker (whiteboard mode)
- **Consumers**: Bottom sheet area picker (pre-selection), AddTripItemRequest.houseArea, AddStapleRequest.houseArea, confirmation toast, area section grouping in HomeView
- **Owner**: HomeView (provides context), bottom sheet (final selection)
- **Integration risk**: MEDIUM -- two sources depending on mode (sweep pre-selects, whiteboard requires user selection). Must ensure the bottom sheet selection is the canonical value sent to domain, not the pre-selection.
- **Validation**: Area in AddTripItemRequest matches the area shown in the bottom sheet picker at submission time

### item_type

- **Source of truth**: Bottom sheet type toggle
- **Consumers**: AddTripItemRequest.itemType, determines whether addStaple is called (staple) or only addItem (one-off)
- **Owner**: Bottom sheet component
- **Integration risk**: MEDIUM -- type determines two different code paths (staple saves to library + trip; one-off saves to trip only). Wrong type means items silently misclassified.
- **Validation**: Staple items appear in StapleLibrary.listAll() after creation; one-off items do not

### store_section

- **Source of truth**: Bottom sheet section text input
- **Consumers**: AddTripItemRequest.storeLocation.section, AddStapleRequest.storeLocation.section, section auto-suggest source (after creation), StoreView section grouping
- **Owner**: Bottom sheet component
- **Integration risk**: MEDIUM -- free-text field means "Dairy" and "dairy" could create duplicates. Section comparison should be case-insensitive for suggestions.
- **Validation**: Section name in trip item matches what was entered in bottom sheet. Previously used sections appear in auto-suggest on next use.

### aisle_number

- **Source of truth**: Bottom sheet aisle text input (nullable)
- **Consumers**: AddTripItemRequest.storeLocation.aisleNumber, AddStapleRequest.storeLocation.aisleNumber, StoreView aisle grouping
- **Owner**: Bottom sheet component
- **Integration risk**: LOW -- nullable numeric field, straightforward
- **Validation**: Aisle number in trip item matches input. Null when left blank.

### recent_sections

- **Source of truth**: StapleLibrary -- derived from distinct `storeLocation.section` values across all staples
- **Consumers**: Bottom sheet section auto-suggest dropdown
- **Owner**: StapleLibrary (derived data)
- **Integration risk**: LOW -- read-only derivation from existing staples
- **Validation**: Sections shown in auto-suggest match distinct sections in StapleLibrary.listAll()

### context_mode

- **Source of truth**: HomeView sweep progress state (`sweepProgress.allAreasComplete`)
- **Consumers**: Bottom sheet default type (sweep=staple, whiteboard=one-off), bottom sheet area pre-selection logic
- **Owner**: HomeView / useTrip hook
- **Integration risk**: MEDIUM -- determines smart defaults. If sweep/whiteboard detection is wrong, defaults will confuse Carlos.
- **Validation**: When allAreasComplete is false and activeArea is set, defaults are sweep-mode. When allAreasComplete is true, defaults are whiteboard-mode.
