# Component Boundaries: Edit Staple Location

**Feature ID**: edit-staple
**Date**: 2026-03-22

---

## Release 1: Core Edit (US-ES-01, US-ES-02)

### Domain Layer

#### StapleLibrary (modified: `src/domain/staple-library.ts`)

| Operation | Status | Responsibility |
|-----------|--------|---------------|
| `addStaple` | Existing | Unchanged |
| `listAll` | Existing | Unchanged |
| `listByArea` | Existing | Unchanged |
| `search` | Existing | Unchanged |
| `remove` | Existing | Unchanged |
| `updateStaple(id, changes)` | **New** | Validate no duplicate (excluding self), merge changes onto existing staple, persist via `storage.update` |

**New type**: `UpdateStapleRequest` -- partial update containing optional `houseArea` and optional `storeLocation`. Name and type are not editable.

**Return type**: Reuses existing `AddStapleResult` discriminated union (`{ success: true }` or `{ success: false; error: string }`). Consider renaming to a generic `StapleResult` if the crafter sees value, but the shape is identical.

**Internal helper change**: The existing `isDuplicate` function gains an optional `excludeId` parameter to skip the staple being edited during duplicate checks.

#### Types (modified: `src/domain/types.ts`)

| Type | Status | Change |
|------|--------|--------|
| `StapleItem` | Existing | Unchanged (still immutable; edits produce new objects) |
| `UpdateStapleRequest` | **New** | `{ houseArea?: HouseArea; storeLocation?: StoreLocation }` |

### Port Layer

#### StapleStorage (modified: `src/ports/staple-storage.ts`)

| Method | Status | Responsibility |
|--------|--------|---------------|
| `loadAll` | Existing | Unchanged |
| `save` | Existing | Unchanged (append) |
| `remove` | Existing | Unchanged |
| `search` | Existing | Unchanged |
| `updateArea` | Existing | Unchanged (batch rename) |
| `update(item: StapleItem)` | **New** | Replace a single staple by ID in storage |

### Adapter Layer

#### AsyncStapleStorage (modified: `src/adapters/async-storage/async-staple-storage.ts`)

New `update` method: find item in cache by ID, replace with new item, persist in background. Follows existing `remove` pattern (find index, splice, persist).

#### NullStapleStorage (modified: `src/adapters/null/null-staple-storage.ts`)

New `update` method: find-and-replace in the in-memory array. Used by tests.

### UI Layer

#### MetadataBottomSheet (modified: `src/ui/MetadataBottomSheet.tsx`)

| Prop | Status | Purpose |
|------|--------|---------|
| `mode` | **New** | `'add' \| 'edit'` -- controls title, buttons, field initialization, callbacks |
| `editStaple` | **New** | `StapleItem \| undefined` -- the staple being edited (provides pre-fill values in edit mode) |
| `onSaveEdit` | **New** | `(id: string, changes: UpdateStapleRequest) => AddStapleResult` -- callback for saving edits |
| All existing props | Existing | Unchanged; `mode` defaults to `'add'` for backward compatibility |

**Behavioral changes in edit mode**:
- Title: "Edit '{name}'" instead of "Add '{name}'"
- Type toggle: hidden (type not editable)
- Area picker: pre-selected to staple's current area
- Section input: pre-filled with staple's current section
- Aisle input: pre-filled with staple's current aisle number
- Primary button: "Save Changes" instead of "Add Item"
- Secondary button: "Cancel" instead of "Skip, add with defaults"
- On save: calls `onSaveEdit` instead of `onSubmitStaple` + `onSubmitTripItem`
- Duplicate check: calls `onFindDuplicate` but must exclude the staple being edited

#### AreaSection (modified: `src/ui/AreaSection.tsx`)

| Prop | Status | Purpose |
|------|--------|---------|
| `onEditStaple` | **New** | `(item: TripItem) => void` -- called when a staple item is tapped |
| All existing props | Existing | Unchanged |

**Behavioral change**: For needed items with `itemType === 'staple'`, passes `onPress` to `TripItemRow` that calls `onEditStaple`. One-off items do not receive `onPress`.

#### TripItemRow (unchanged: `src/ui/TripItemRow.tsx`)

Already accepts `onPress` prop. No changes needed.

#### HomeView (modified: `src/ui/HomeView.tsx`)

New responsibilities:
- Handle `onEditStaple` callback from `AreaSection`: look up full `StapleItem` from `stapleLibrary`, set edit state, open `MetadataBottomSheet` in edit mode
- Handle `onSaveEdit` callback: call `stapleLibrary.updateStaple(id, changes)`, dismiss sheet on success, show error on failure
- New state: `editingStaple: StapleItem | null` to track which staple is being edited
- Pass `onFindDuplicate` with ID exclusion when in edit mode

---

## Release 2: Remove + Trip Sync (US-ES-03, US-ES-04)

### Domain Layer

#### TripService (modified: `src/domain/trip.ts`)

| Operation | Status | Responsibility |
|-----------|--------|---------------|
| `updateItemLocation(name, oldArea, newArea, newStoreLocation)` | **New** | Find trip item by name+oldArea, update area and store location, preserve checked/needed/checkedAt state |
| `convertToOneOff(name, area)` | **New** | Find trip item by name+area, change `itemType` from `'staple'` to `'one-off'` |
| All existing operations | Existing | Unchanged |

### UI Layer

#### MetadataBottomSheet (modified for Release 2)

| Element | Change |
|---------|--------|
| "Remove from Staples" button | **New** -- appears in edit mode only, at bottom of form |
| `onRemoveStaple` | **New prop** -- `(id: string) => void` -- called after confirmation |
| Confirmation prompt | **New** -- inline or alert, with confirm/cancel |

#### HomeView (modified for Release 2)

New responsibilities:
- After successful `updateStaple`: call `tripService.updateItemLocation` if a trip is active
- Handle `onRemoveStaple`: call `stapleLibrary.remove(id)`, call `tripService.convertToOneOff(name, area)` if trip active, dismiss sheet

---

## Unchanged Components

These components require zero modifications:

| Component | Reason |
|-----------|--------|
| `AreaManagement` | Manages areas, not individual staples |
| `AreaStorage` | No new area operations needed |
| `TripStorage` | Release 1 does not touch trip persistence; Release 2 uses existing `saveTrip` |
| `SectionOrderStorage` | Unrelated to staple editing |
| `QuickAdd` | Add flow unchanged |
| `useAreas` | No area changes |
| `useTrip` | Release 1 does not modify trip items; Release 2 adds calls through existing `TripService` |

---

## Dependency Direction

All dependencies point inward (toward domain), consistent with existing architecture:

```
UI (HomeView, MetadataBottomSheet, AreaSection)
  -> Hooks (useServices)
    -> Domain (StapleLibrary.updateStaple)
      -> Ports (StapleStorage.update)
        <- Adapters (AsyncStapleStorage, NullStapleStorage)
```

No new circular dependencies. No new modules. No new ports. Only extensions to existing interfaces.
