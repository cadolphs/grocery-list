# DESIGN Decisions -- persist-one-offs

## Architecture Impact

**Low-moderate.** Extends existing domain type and adds a new library method. No new ports, adapters, or hooks. Existing Firestore sync handles the type change transparently since `StapleItem` is serialized as-is.

## Key Decisions

### [D1] Extend `StapleItem.type` to `'staple' | 'one-off'`

**Choice**: Widen the `type` field on `StapleItem` from the literal `'staple'` to `'staple' | 'one-off'`.

**Rationale**: The staple library already provides everything needed: persistent storage, search, CRUD, Firestore sync. Creating a separate store would duplicate all of this. The only behavioral difference (not shown in checklist, not preloaded) is a filtering concern at the consumer level.

**Impact**: `StapleItem.type` in `src/domain/types.ts` changes from `'staple'` to `'staple' | 'one-off'`. All existing code that creates `StapleItem` objects with `type: 'staple'` continues to work.

### [D2] Add `addOneOff` method to `StapleLibrary`

**Choice**: Add a dedicated `addOneOff(request: AddOneOffRequest)` method rather than reusing `addStaple` with a type parameter.

**Rationale**: `addStaple` enforces constraints that don't apply to one-offs (non-empty houseArea). A separate method makes the intent clear and avoids conditional logic inside `addStaple`. The `AddOneOffRequest` type has `name` and `storeLocation` but no `houseArea`.

```typescript
type AddOneOffRequest = {
  readonly name: string;
  readonly storeLocation: StoreLocation;
};
```

The method:
- Sets `houseArea: ''` and `type: 'one-off'` internally
- Dedup check: `existing.some(i => i.name === name && i.type === 'one-off')` (by name+type, not name+area)
- If duplicate exists, silently succeeds (no error) — the item is already persisted

### [D3] One-off `houseArea` = empty string `''`

**Choice**: Use `''` as the houseArea for persisted one-offs.

**Rationale**: The `TripItem.houseArea` is required by `addItem` (validated non-empty). For one-offs added to trips, `MetadataBottomSheet` already hardcodes `'Kitchen Cabinets'`. But the *library entry* uses `''` since one-offs don't belong to any house area. This naturally prevents name collisions with staples in the existing `isDuplicate` check which uses `(name, houseArea)`.

### [D4] Consumers filter by type

**Choice**: No changes to storage or library query methods. Consumers add `.filter(s => s.type === 'staple')` where needed.

**Where filters are needed:**
- `HomeView`: `allStaples` passed to `StapleChecklist` — filter to staples only
- Trip preloading (`initializeFromStorage`, `start`, `resetSweep`): filter `stapleLibrary.listAll()` to staples only
- `StapleLibrary.search()`: returns both types (no filter — QuickAdd needs both)

### [D5] `handleSelectSuggestion` respects item type

**Choice**: When selecting a suggestion from QuickAdd, use `staple.type` to determine `itemType` on the `TripItem`.

**Current code** (`HomeView.tsx:125-139`): hardcodes `itemType: 'staple'` for all suggestions. Must change to `itemType: staple.type === 'one-off' ? 'one-off' : 'staple'`.

Also: the duplicate check uses `(name, houseArea)`. For one-offs with `houseArea: ''` in the library, the trip item gets `houseArea: 'Kitchen Cabinets'`, so the existing check works (won't false-positive against the library entry). But to prevent adding the same one-off twice to a trip, check by name + itemType instead.

### [D6] MetadataBottomSheet saves one-offs to library

**Choice**: Add `onSubmitOneOff` callback prop to `MetadataBottomSheet`. Called alongside `onSubmitTripItem` when type is One-off. HomeView wires it to `stapleLibrary.addOneOff`.

**Alternative considered**: Having MetadataBottomSheet call the library directly. Rejected — the sheet is a presentational component and shouldn't know about the library.

### [D7] QuickAdd suggestion formatting

**Choice**: Extend `formatSuggestion` in `QuickAdd.tsx` to append ` (one-off)` when `staple.type === 'one-off'`.

**Rationale**: Simple text label. No new component needed. Users can distinguish staple vs one-off at a glance.

## Component Changes

| Component | Change | Story |
|-----------|--------|-------|
| `src/domain/types.ts` | `StapleItem.type` → `'staple' \| 'one-off'`, add `AddOneOffRequest` | US-01 |
| `src/domain/staple-library.ts` | Add `addOneOff` method to `StapleLibrary` type and `createStapleLibrary` | US-01 |
| `src/ui/MetadataBottomSheet.tsx` | Add `onSubmitOneOff` prop, call it in one-off submit + skip paths | US-01 |
| `src/ui/HomeView.tsx` | Wire `onSubmitOneOff`, filter `allStaples` for checklist, fix `handleSelectSuggestion` | US-01, US-02, US-04 |
| `src/ui/QuickAdd.tsx` | Extend `formatSuggestion` for one-off label | US-03 |
| Trip initialization callers | Filter `listAll()` to staples only when preloading | US-04 |

**No changes to**: ports, adapters, hooks, Firestore sync (serialization handles `type` field transparently).

## Technology Stack

No new dependencies.

## Constraints Established

- `addOneOff` dedup is by `(name, type: 'one-off')`, not `(name, houseArea)`
- Library `search()` returns both types — filtering is the consumer's job
- `updateStaple` validation (`houseArea` non-empty) does NOT apply to one-offs — if one-offs need editing later, a separate `updateOneOff` method would be needed. Deferred.

## Upstream Changes

None. All DISCUSS assumptions hold.
