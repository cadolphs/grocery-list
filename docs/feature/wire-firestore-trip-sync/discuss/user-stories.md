# User Stories: wire-firestore-trip-sync

## Context

The `correct-sync-behavior` feature (US-01 through US-08) built the full sync infrastructure:
- Firestore trip storage adapter with onSnapshot and onChange support
- Echo detection for own-write suppression
- Migration logic (AsyncStorage to Firestore)
- Duplicate prevention guards
- Listener cleanup on unmount/logout

However, **production factories still use AsyncStorage for trips** (`useAppInitialization.ts:218`).
This feature wires the existing Firestore trip adapter into production and adds the onChange
handler so trip changes sync in real-time across devices.

## System Constraints

- All constraints from `correct-sync-behavior` apply
- No new adapters or port changes needed — only wiring and orchestration
- `TripStorage` port interface remains unchanged
- `AdapterFactories.createTripStorage` signature changes from `() => ...` to `(uid, options?) => ...`

---

## US-01: Wire Firestore Trip Storage in Production Factories

### Problem

Production factories create trip storage via `createAsyncTripStorage()` (device-local).
The Firestore trip adapter exists and is fully tested, but is not used in production.
Result: trip checkoffs on web do not appear on mobile.

### Who

- Clemens | Multi-device grocery shopper | Expects trip state to sync like staples do

### Solution

Change `createProductionFactories` to use `createFirestoreTripStorage(db, uid)` instead
of `createAsyncTripStorage()`. Update the `AdapterFactories` type signature for
`createTripStorage` to accept `uid` and optional `onChange` callback, matching the
pattern used by `createStapleStorage`.

### Acceptance Criteria

- [ ] `createProductionFactories().createTripStorage(uid)` returns a Firestore-backed trip storage
- [ ] `AdapterFactories.createTripStorage` signature accepts `uid: string` and optional `options`
- [ ] Legacy factories still return AsyncStorage-backed trip storage (no uid needed)
- [ ] All existing tests pass after the type change

---

## US-02: Wire Trip onChange Handler for Real-Time Sync

### Problem

When a remote device writes a trip change (e.g., checkoff), the Firestore trip adapter's
`onChange` callback fires, but nothing is wired to handle it. The `TripService` holds stale
in-memory state and the UI does not update.

Staples already have this wiring (`handleStapleChange` in `initializeApp`), but trips do not.

### Who

- Clemens | Shopping on phone while partner plans on web | Expects checkoffs to appear live

### Solution

In `initializeApp`, pass an `onChange` callback when creating the trip storage. When it fires:
1. TripService reloads its state from storage (`loadFromStorage()`)
2. TripService notifies its subscribers so React re-renders

### Acceptance Criteria

- [ ] Trip storage is created with an `onChange` callback in `initializeApp`
- [ ] When `onChange` fires, `TripService.loadFromStorage()` is called
- [ ] After `loadFromStorage()`, TripService subscribers are notified (UI re-renders)
- [ ] Own-write echoes do not cause unnecessary reloads (handled by adapter's echo detection)
- [ ] Remote checkoff on device A appears on device B without restart

---

## US-03: TripService Notifies Subscribers After Remote State Load

### Problem

`TripService.loadFromStorage()` updates the in-memory `items` array but does not call
`notify()`. Subscribers (React hooks) are not informed of the change, so the UI stays stale
even after the data is loaded.

### Who

- Clemens | Using the app while partner makes changes | Expects UI to update

### Solution

Ensure `loadFromStorage()` calls `notify()` after updating state, so all subscribers
(including `useTrip` hook) re-render with the new data.

### Acceptance Criteria

- [ ] `loadFromStorage()` calls `notify()` after updating items and completedAreas
- [ ] React components using `useTrip` re-render when remote trip changes arrive
- [ ] No unnecessary notifications when loaded state equals current state
