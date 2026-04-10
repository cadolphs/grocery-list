# Shared Artifacts Registry: correct-sync-behavior

## Artifacts

### staples_document

- **Source of truth**: `Firestore: users/{uid}/data/staples`
- **Consumers**: firestore-staple-storage cache, StapleLibrary.listAll(), QuickAdd search, Sweep view, auto-add-to-trip logic
- **Owner**: existing (grocery-smart-list), modified by this feature (onSnapshot listener)
- **Integration risk**: HIGH -- switching from getDoc to onSnapshot changes timing of cache updates. All consumers must handle asynchronous cache refreshes.
- **Validation**: Add staple on device A; verify it appears on device B within 5 seconds without restart.

### areas_document

- **Source of truth**: `Firestore: users/{uid}/data/areas`
- **Consumers**: firestore-area-storage cache, AreaManagement, Sweep area completion, Trip initialization
- **Owner**: existing (custom-house-areas), modified by this feature (onSnapshot listener)
- **Integration risk**: MEDIUM -- area list changes less frequently than staples. Same onSnapshot pattern applies.
- **Validation**: Rename area on device A; verify rename propagates to device B.

### section_order_document

- **Source of truth**: `Firestore: users/{uid}/data/sectionOrder`
- **Consumers**: firestore-section-order-storage cache, Shopping list sort order
- **Owner**: existing, modified by this feature (onSnapshot listener)
- **Integration risk**: LOW -- section order is display-only, no domain logic depends on it.
- **Validation**: Reorder sections on device A; verify order on device B.

### trip_document (NEW)

- **Source of truth**: `Firestore: users/{uid}/data/trip`
- **Consumers**: firestore-trip-storage cache, TripService.persistTrip(), TripService.loadFromStorage(), TripService.initializeFromStorage(), TripService.complete()
- **Owner**: correct-sync-behavior feature
- **Integration risk**: HIGH -- trip is the core data structure controlling what appears in sweep, whiteboard, and shopping views. If trip fails to sync, user sees different items on different devices. Document contains the full Trip object including items array, status, createdAt, completedAreas.
- **Validation**: Check off item on device A; verify checked state appears on device B within 5 seconds.

### carryover_document (NEW)

- **Source of truth**: `Firestore: users/{uid}/data/carryover`
- **Consumers**: firestore-trip-storage cache, TripService.complete(), TripService.startWithCarryover(), TripService.initializeFromStorage()
- **Owner**: correct-sync-behavior feature
- **Integration risk**: MEDIUM -- carryover items transfer between completed and new trips. If carryover is device-local, completing a trip on device A and starting a new one on device B loses unbought items.
- **Validation**: Complete trip on device A with unbought items; start new trip on device B; verify carryover items present.

### staple_to_trip_link

- **Source of truth**: `StapleItem.id` maps to `TripItem.stapleId`
- **Consumers**: TripService.syncStapleUpdate(), TripService.removeItemByStapleId(), stapleInputToTripItem(), auto-add-to-trip logic
- **Owner**: correct-sync-behavior feature (auto-add)
- **Integration risk**: HIGH -- this link enables the auto-add and auto-remove behaviors. If stapleId is not preserved through Firestore serialization, the link breaks.
- **Validation**: Add staple on device A; verify trip item on device B has matching stapleId.

## Design Decision: Checkoffs Storage

The current `TripStorage` port has separate `saveCheckoffs`/`loadCheckoffs` methods. However, the `Trip` type already includes `checked`/`checkedAt` on each `TripItem`. The checkoff state is embedded in the trip document. The separate checkoffs methods appear to be legacy. The Firestore trip adapter should persist the `Trip` document (which includes item check states). The separate checkoffs key can be implemented as a no-op or removed as part of this feature.

## Integration Risk Summary

| Artifact | Risk | Story | Mitigation |
|----------|------|-------|------------|
| staples_document | HIGH | US-01 | Test onSnapshot updates propagate to UI re-render |
| areas_document | MEDIUM | US-01 | Same pattern as staples |
| section_order_document | LOW | US-01 | Same pattern as staples |
| trip_document | HIGH | US-02, US-03 | Follow existing Firestore adapter pattern; test cross-device load |
| carryover_document | MEDIUM | US-02 | Test trip completion + new trip cycle across devices |
| staple_to_trip_link | HIGH | US-05 | Test stapleId preservation through Firestore serialization |
