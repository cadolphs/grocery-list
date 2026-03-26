# Edit Staple - Wave Decisions

## Design Decisions

### D1: updateStaple as driving port method
`library.updateStaple(id, changes)` is the single entry point for all edit operations. This keeps the test boundary clean -- acceptance tests never reach into storage directly.

### D2: Partial update object
The changes parameter accepts `{ houseArea?, storeLocation? }` -- only provided fields are updated. This matches the UI where users may change area only, or section/aisle only.

### D3: Duplicate detection with self-exclusion
Duplicate check on edit excludes the staple being edited (matched by ID). This prevents false positives when a user changes only the aisle number without changing name or area.

### D4: Trip sync as separate call
`trip.syncStapleUpdate(stapleId, changes)` is a separate call from `library.updateStaple`. The UI layer orchestrates both calls. This keeps domain functions focused and testable independently.

### D5: Remove reuses existing library.remove
US-ES-03 does not need new domain logic -- `library.remove(id)` already exists. The acceptance test validates the user journey (remove from edit sheet, confirm gone from future trips).

## Implementation Sequence for DELIVER

1. Add `update(item: StapleItem)` to `StapleStorage` port
2. Add `update` to null adapter
3. Add `updateStaple(id, changes)` to `StapleLibrary` type and `createStapleLibrary`
4. Add `syncStapleUpdate(stapleId, changes)` to Trip type and `createTrip`
5. Enable walking skeleton tests one at a time
6. Enable milestone-1 tests one at a time

## New Driving Port Methods Required

| Port | Method | Signature |
|------|--------|-----------|
| StapleLibrary | updateStaple | `(id: string, changes: { houseArea?: HouseArea; storeLocation?: StoreLocation }) => UpdateStapleResult` |
| Trip | syncStapleUpdate | `(stapleId: string, changes: { houseArea?: HouseArea; storeLocation?: StoreLocation }) => void` |

## New Driven Port Methods Required

| Port | Method | Signature |
|------|--------|-----------|
| StapleStorage | update | `(item: StapleItem) => void` |
