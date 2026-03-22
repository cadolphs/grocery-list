# Component Boundaries: Add Item Metadata Flow

**Feature ID**: add-item-flow
**Date**: 2026-03-19

---

## Scope

This feature modifies 2 existing UI components and adds 1 new UI component. No domain, port, or adapter changes.

---

## New Component: MetadataBottomSheet

### Responsibility

Modal bottom sheet that captures item metadata (type, area, section, aisle) for new items. Handles form state, validation, section auto-suggest, duplicate detection warning, and skip shortcut. Delegates all domain operations to callbacks provided by the parent.

### Props (Input Contract)

| Prop | Type | Purpose |
|------|------|---------|
| `visible` | `boolean` | Controls modal visibility |
| `itemName` | `string` | Pre-filled item name (read-only display) |
| `defaultItemType` | `ItemType` | Smart default: 'staple' during sweep, 'one-off' during whiteboard |
| `defaultArea` | `HouseArea \| null` | Smart default: active area during sweep, null during whiteboard |
| `existingSections` | `readonly string[]` | Distinct section names for auto-suggest |
| `onSubmitStaple` | `(request: AddStapleRequest) => AddStapleResult` | Callback to add staple to library |
| `onSubmitTripItem` | `(request: AddTripItemRequest) => AddTripItemResult` | Callback to add item to trip |
| `onFindDuplicate` | `(name: string, area: HouseArea) => StapleItem \| undefined` | Callback to check for existing staple |
| `onDismiss` | `() => void` | Callback when sheet is dismissed without action |

### Internal State

| State | Type | Initial Value | Purpose |
|-------|------|---------------|---------|
| `selectedType` | `ItemType` | `defaultItemType` prop | User's type selection |
| `selectedArea` | `HouseArea \| null` | `defaultArea` prop | User's area selection |
| `sectionText` | `string` | `''` | Section input text |
| `aisleText` | `string` | `''` | Aisle input text |
| `sheetMode` | `'form' \| 'duplicate-warning'` | `'form'` | Current sheet state |
| `duplicateStaple` | `StapleItem \| null` | `null` | The existing staple when duplicate detected |

### Behaviors

**Submit (Add Item button)**:
1. Validate: area selected AND section not empty
2. Build `StoreLocation` from sectionText + parsed aisleText
3. If type is 'staple': call `onFindDuplicate(itemName, selectedArea)`
   - If duplicate found: switch to `'duplicate-warning'` mode, store duplicate
   - If no duplicate: call `onSubmitStaple`, then call `onSubmitTripItem`, then dismiss
4. If type is 'one-off': call `onSubmitTripItem`, then dismiss

**Skip (Skip, add with defaults button)**:
1. Call `onSubmitTripItem` with:
   - `houseArea`: selectedArea (which may already reflect activeArea default) or 'Kitchen Cabinets' fallback
   - `storeLocation`: `{ section: 'Uncategorized', aisleNumber: null }`
   - `itemType`: 'one-off'
   - `source`: 'quick-add'
2. Dismiss

**Duplicate Warning -- Add to trip instead**:
1. Call `onSubmitTripItem` with the existing staple's metadata
2. Dismiss

**Duplicate Warning -- Cancel**:
1. Switch back to `'form'` mode
2. Clear `duplicateStaple`

**Dismiss (tap outside / dismiss button)**:
1. Call `onDismiss`
2. No items added

### Section Auto-Suggest Behavior

- Filter `existingSections` by case-insensitive prefix match against `sectionText`
- Show filtered list below section input when sectionText is non-empty and matches exist
- Tapping a suggestion fills `sectionText` and hides suggestions
- Free-text entry always accepted (not restricted to existing sections)

### Validation Rules

| Field | Required | Validation |
|-------|----------|------------|
| Item name | Yes (pre-filled) | Non-empty (guaranteed by QuickAdd) |
| Type | Yes | Default provided, always has value |
| Area | Yes | Must be selected (no null submission) |
| Section | Yes | Non-empty string |
| Aisle | No | If provided, must be a positive integer |

### What This Component Does NOT Do

- Does NOT access React context directly (receives everything via props)
- Does NOT manage sheet visibility (parent controls `visible` prop)
- Does NOT persist data (delegates to callbacks)
- Does NOT know about sweep progress (receives computed defaults)

---

## Modified Component: QuickAdd

### Changes

**New prop**:

| Prop | Type | Purpose |
|------|------|---------|
| `onOpenMetadataSheet` | `(itemName: string) => void` | Callback when user taps "Add as new item" |

**New behavior**:
- When `inputText` is non-empty, always render an "Add '{inputText}' as new item..." row at the bottom of the suggestion list (below any staple suggestions)
- Tapping the row calls `onOpenMetadataSheet(inputText.trim())`
- The row appears even when there are partial staple matches (user may want to add a new item with a similar name)
- After calling `onOpenMetadataSheet`, QuickAdd does NOT clear the input (in case user dismisses sheet without adding)

**Existing behavior preserved**:
- Type-ahead suggestions from `onSearch` remain unchanged
- Tapping a staple suggestion still calls `onSelectSuggestion` or `onAddItem` as before
- The "Add" button behavior (hardcoded defaults) remains for backward compatibility but is secondary to the new flow

### What Changes in QuickAdd's Contract

Before: QuickAdd handles the entire add flow internally (type, hardcode defaults, call onAddItem).
After: QuickAdd also offers a "hand off to MetadataBottomSheet" path. The "Add" button with hardcoded defaults remains as a fallback but the primary new-item path is through the bottom sheet.

---

## Modified Component: HomeView

### Changes

**New state**:

| State | Type | Initial Value | Purpose |
|-------|------|---------------|---------|
| `metadataSheetVisible` | `boolean` | `false` | Controls MetadataBottomSheet visibility |
| `metadataSheetItemName` | `string` | `''` | Item name to pass to the sheet |

**New derived values** (computed, not stored):

| Value | Derivation | Purpose |
|-------|-----------|---------|
| `defaultItemType` | `sweepProgress.allAreasComplete ? 'one-off' : 'staple'` | Smart default for type toggle |
| `defaultArea` | `sweepProgress.allAreasComplete ? null : activeArea` | Smart default for area picker |
| `existingSections` | `[...new Set(stapleLibrary.listAll().map(s => s.storeLocation.section))]` | Distinct sections for auto-suggest |

**New callbacks**:

| Callback | Purpose |
|----------|---------|
| `handleOpenMetadataSheet(name)` | Sets sheetVisible=true, sheetItemName=name |
| `handleMetadataSubmitStaple(request)` | Calls stapleLibrary.addStaple(request) |
| `handleMetadataSubmitTripItem(request)` | Calls addItem(request) from useTrip |
| `handleFindDuplicate(name, area)` | Searches stapleLibrary for matching name+area |
| `handleMetadataDismiss()` | Sets sheetVisible=false |

**Rendering change**:
- Passes `onOpenMetadataSheet` to QuickAdd
- Renders MetadataBottomSheet with computed props

### Why HomeView Orchestrates

HomeView is the natural orchestrator because it already owns:
- `activeArea` state (needed for smart defaults)
- `sweepProgress` (needed for sweep vs whiteboard detection)
- `stapleLibrary` access (via useServices context)
- `addItem` (via useTrip hook)

MetadataBottomSheet should not access these directly because:
- It would couple the sheet to specific context shapes
- It would make the sheet harder to test (need to wrap in providers)
- Props-based injection follows the established pattern in this codebase (QuickAdd uses the same approach)

---

## Unchanged Components

| Component | Why Unchanged |
|-----------|--------------|
| Domain: staple-library.ts | addStaple, listAll, search already provide all needed operations |
| Domain: trip.ts | addItem already accepts full metadata via AddTripItemRequest |
| Domain: types.ts | All types (HouseArea, StoreLocation, AddStapleRequest, AddTripItemRequest) already exist |
| Domain: item-grouping.ts | No grouping changes needed |
| Ports: staple-storage.ts | No new storage operations |
| Ports: trip-storage.ts | No new storage operations |
| Adapters: all | No new persistence needs |
| Hooks: useTrip.ts | Already exposes addItem with full request shape |
| Hooks: useViewMode.ts | Not involved in this flow |
| UI: ServiceProvider.tsx | Already provides stapleLibrary and tripService |
| UI: AppShell.tsx | Not involved (HomeView handles everything internally) |
| UI: StoreView.tsx | Not involved in add flow |
| UI: AreaSection.tsx | Not involved in add flow |

---

## Interaction Sequence

```
1. User types "Oat milk" in QuickAdd
2. QuickAdd shows staple suggestions (if any) + "Add 'Oat milk' as new item..." row
3. User taps "Add 'Oat milk' as new item..."
4. QuickAdd calls onOpenMetadataSheet("Oat milk")
5. HomeView sets metadataSheetVisible=true, metadataSheetItemName="Oat milk"
6. HomeView computes defaults: type=Staple (sweep active), area=Fridge (activeArea)
7. HomeView computes existingSections from stapleLibrary.listAll()
8. MetadataBottomSheet renders with defaults applied
9. User adjusts fields (or accepts defaults), taps "Add Item"
10. MetadataBottomSheet validates, checks duplicate, calls onSubmitStaple + onSubmitTripItem
11. HomeView callbacks execute domain operations
12. MetadataBottomSheet calls onDismiss
13. HomeView sets metadataSheetVisible=false, clears input
```

---

## Testing Strategy Notes

MetadataBottomSheet is fully testable via props:
- Render with `visible=true`, assert fields appear
- Render with defaults, assert pre-selected values
- Simulate form fill + submit tap, assert callbacks called with correct arguments
- Simulate skip tap, assert callback called with default values
- Simulate duplicate scenario via `onFindDuplicate` returning a staple, assert warning state

No mocking of context or services needed -- all dependencies are props.
