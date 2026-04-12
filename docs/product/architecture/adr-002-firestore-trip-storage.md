# ADR-002: Firestore Trip Storage Adapter

## Status

Accepted

## Context

Trip data is currently stored in AsyncStorage (device-local). This means trips are invisible across devices. The app needs trip data in Firestore so that:
1. Trip state syncs between Android and web
2. Real-time listeners (ADR-001) can deliver trip changes to other devices
3. Trip data survives device loss

The `TripStorage` port interface is already defined with: `loadTrip`, `saveTrip`, `loadCheckoffs`, `saveCheckoffs`, `updateItemArea`, `saveCarryover`, `loadCarryover`, `clearCarryover`.

## Decision

Create a new `firestore-trip-storage.ts` adapter that implements the `TripStorage` port, following the same cached-read/background-write pattern as the existing `firestore-staple-storage.ts`.

Firestore document paths:
- Trip: `users/{uid}/data/trip`
- Carryover: `users/{uid}/data/carryover`

The `loadCheckoffs` and `saveCheckoffs` methods are implemented as no-ops. Checkoff state is already embedded in `TripItem.checked` / `TripItem.checkedAt` within the Trip document. The separate checkoffs storage was a legacy artifact from the AsyncStorage implementation.

The adapter uses `onSnapshot` for real-time listening (per ADR-001) and accepts an `onChange` callback for remote update notification.

The `AdapterFactories.createTripStorage` signature changes from `() => InitializableStorage<TripStorage>` to `(uid: string) => InitializableStorage<TripStorage>` to support user-scoped Firestore paths.

## Alternatives Considered

### Keep AsyncStorage + manual sync

Write trip to both AsyncStorage and Firestore. Use AsyncStorage as primary, Firestore as backup.

**Evaluation:**
- Pro: No risk of breaking existing trip behavior
- Con: Dual-write complexity; conflict resolution between local and remote
- Con: Does not support real-time sync (AsyncStorage has no listener mechanism)
- Rejected: Does not solve the core problem (real-time trip sync)

### Firestore sub-collections (items as individual documents)

Store each TripItem as a separate Firestore document in a sub-collection.

**Evaluation:**
- Pro: Granular updates -- changing one item does not rewrite the whole trip
- Con: Trip has ~15-30 items; sub-collection adds read complexity and cost
- Con: Breaks the existing `TripStorage` port which operates on whole-trip granularity
- Con: Firestore billing: each document read costs; reading 30 docs vs 1 doc per sync
- Rejected: Over-engineering; single-document approach matches existing port contract and is well within Firestore's 1MB document limit

## Consequences

### Positive

- Trip data accessible from any authenticated device
- Follows established adapter pattern (low learning curve)
- Checkoffs legacy eliminated (no-op methods simplify the adapter)
- Real-time trip sync enabled via onSnapshot

### Negative

- Entire trip document written on every state change (checkoff, skip, etc.) -- acceptable given small document size (~5-15 KB)
- Migration needed for existing AsyncStorage trip data (see US-06)

### Quality Attribute Impact

| Attribute | Impact |
|-----------|--------|
| Real-time consistency | Enabled -- trip changes propagate via onSnapshot |
| Fault tolerance | Maintained -- setDoc fire-and-forget, persistentLocalCache handles offline |
| Maintainability | Positive -- one fewer storage technology for trip data |
