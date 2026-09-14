# RCA: Adding a staple duplicates it

## Bug

User adds new staple via QuickAdd → MetadataBottomSheet → "Add Item". Two trip rows appear instead of one. One has `stapleId`, one does not.

## Root cause (primary)

`MetadataBottomSheet.handleSubmit` Staple branch performs **two writes** that each independently add a trip row:

1. `onSubmitStaple(...)` (`src/ui/MetadataBottomSheet.tsx:250`) → `stapleLibrary.addStaple` → `notify()` → `stapleLibrary.subscribe` handler in `useAppInitialization.ts:256-268` → `applyAddedStaplesToTrip` (`useAppInitialization.ts:151-168`) → `tripService.addItem(... stapleId: staple.id, source: 'preloaded')`. **Row 1** added with stapleId.
2. `onSubmitTripItem(...)` (`src/ui/MetadataBottomSheet.tsx:256`) → `tripService.addItem(...)` directly. No `stapleId` (sheet never receives id back from `addStaple`). **Row 2** added without stapleId.

`addItem` dedup guard at `src/domain/trip.ts:178` is stapleId-only:
```ts
if (request.stapleId && items.some(i => i.stapleId === request.stapleId))
```
The leading `request.stapleId &&` short-circuits when stapleId missing → guard bypassed → row 2 slips in.

## Contributing factors

- **Identity asymmetry**: `removeItemsByStaple` (`trip.ts:82-86`) uses `(name, houseArea)` fallback (`matchesStapleIdentity`); `addItem` does not. Add path is strict, remove path forgiving.
- **API shape**: `StapleLibrary.addStaple` returns `{success, error?}` — no created staple/id payload. UI cannot pass stapleId to the manual `onSubmitTripItem` even if it wanted to.

## Why now

Commit `b32cd42` (fix-staple-delete-trip-sync) removed the analogous dual-write on **delete** in HomeView but left the symmetrical dual-write on **add** in MetadataBottomSheet. Latent since then. Section-order-by-section feature is adjacent (not causal) — user exercised add flows during acceptance and noticed.

## Fix

### Primary (kills bug)
File: `src/ui/MetadataBottomSheet.tsx` — drop lines 256-262 (`onSubmitTripItem` call) from the Staple-success branch of `handleSubmit`. Subscription path is single source of truth.

**Leave alone**: One-off branch (`addOneOff` notifies but `applyAddedStaplesToTrip` filters `type === 'staple'`), "Add to trip instead" branch (no library mutation, no subscription fires), "Skip, add with defaults" branch (one-off path).

### Defense-in-depth (recommended)
File: `src/domain/trip.ts` — extend `addItem` guard at line 178: when `itemType === 'staple'`, also reject if existing item has same `name + houseArea`. Mirrors `matchesStapleIdentity`.

```ts
if (request.itemType === 'staple' &&
    items.some(i => i.itemType === 'staple' &&
                    i.name === request.name &&
                    i.houseArea === request.houseArea)) {
  return { success: false, error: 'staple already in trip' };
}
```

## Files affected

Required:
- `src/ui/MetadataBottomSheet.tsx`
- `src/domain/trip.ts`

Tests:
- `src/domain/trip.test.ts` — regression: addItem rejects second staple with same (name, houseArea), no stapleId
- Integration (HomeView or MetadataBottomSheet test) — full flow: new staple submit → exactly one trip row with correct stapleId

## Why tests missed it

- `useAppInitialization.test.ts` covers subscription in isolation.
- Sheet/HomeView tests cover manual `onSubmitTripItem` in isolation.
- No test exercised both paths wired together → integration seam bug invisible.

## Risk

LOW. Subscription path already in production for delete-sync. Guard hardening is pure additive validation; `staple-library.isDuplicate` already forbids same-name+area at library level so no false positive risk.
