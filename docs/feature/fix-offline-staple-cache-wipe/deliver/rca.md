# RCA: Offline cold start shows an empty shopping list

## Bug

User opens the app in a store on bad/flapping wifi. App sits in a loading state,
then renders an **empty** trip list. Offline-first contract violated. Worse than
a display bug: the empty list is persisted over the local mirror, destroying the
real list.

## Root cause (primary)

**The AsyncStorage write-through mirror was only ever built for one of four adapters.**

`docs/feature/fix-native-firestore-offline-cache/rca.md` §4.2 scoped the mirror
for every Firestore adapter. Commit `a8a3093` delivered it for the trip adapter
only. These three never got it:

- `src/adapters/firestore/firestore-staple-storage.ts`
- `src/adapters/firestore/firestore-area-storage.ts`
- `src/adapters/firestore/firestore-section-order-storage.ts`

On native there is no Firestore durable cache to fall back on:
`src/adapters/firestore/firebase-config.ts:52-66` enables `persistentLocalCache()`
**web-only**, because `persistentLocalCache()` throws `UNIMPLEMENTED` on React
Native (no IndexedDB, firebase-js-sdk#7947). So those three adapters have zero
local durability — the network is their only source of truth.

## Causal chain (verified against source)

1. `useAppInitialization.ts:219-224` awaits `Promise.all` over all four
   `initialize()` calls.
2. `firestore-staple-storage.ts:68-77` — `initialize()` resolves only from
   *inside* the first `onSnapshot` callback. Readiness is bound to a remote
   round trip.
3. Firestore withholds the initial snapshot event until it determines
   `OnlineState.Offline` (`@firebase/firestore/src/core/event_manager.ts:488-527`,
   `shouldRaiseInitialEvent`). Connected-but-dead wifi: ~10s
   (`online_state_tracker.ts:31,37`). Flapping wifi: the timer re-arms on each
   stream restart, so the wait is **potentially unbounded** — this is the
   user-reported "repeatedly tried to load".
4. When the snapshot finally arrives offline, the doc does not exist →
   `firestore-staple-storage.ts:45-52` sets `cache = []`, `isInitialized = true`.
5. `useAppInitialization.ts:235` calls
   `tripService.initializeFromStorage(stapleLibrary.listAll().filter(...))`
   with `[]`.
6. `src/domain/trip.ts:335-345` — steady state is a `completed` trip, so the
   completed branch runs: `items = [...stapleItems, ...carryover]` = `[]`,
   `storage.clearCarryover()`, then **`persistTrip()`**.
7. `persistTrip()` → `firestore-trip-storage.ts` → `mirrorTripToAsyncStorage`.
   **The empty trip overwrites the durable local mirror. Data loss.**

## Contributing factors

- **Secondary symptom (custom-area users only)**: `firestore-area-storage.ts:53-58`
  falls back to `DEFAULT_HOUSE_AREAS` on an empty snapshot. Trip items whose
  `houseArea` is a custom area are then silently dropped by `groupByArea`
  (`item-grouping.ts:186-188`). Requires: custom areas AND empty area snapshot
  AND trip items in those areas. Users on defaults are unaffected by this,
  but still fully exposed to the primary cause.
- **Auth gate (unverified, lower confidence)**: `App.tsx:20-22` passes
  `undefined` while auth is loading, which `useAppInitialization.ts:350-352`
  treats as *legacy mode*. Firestore adapters are not created until the effect
  re-runs with a real `authUser`, so the Firestore wait begins only *after*
  auth revalidation finishes. The waits are additive, not overlapping.
  Not in scope for this fix.
- **Asymmetry**: the trip adapter already models "server says empty but we have
  local data" correctly (`firestore-trip-storage.ts:150-166`). The other three
  adapters conflate "offline / unknown" with "genuinely empty".

## Fix (approved scope: F1 + F2)

### F1 — Complete the AsyncStorage write-through mirror

Apply the shipped trip-adapter pattern (`firestore-trip-storage.ts:59-92,197-210`)
to the three adapters that lack it:

- Hydrate `cache` from AsyncStorage **before** subscribing to `onSnapshot`.
- On an empty/non-existent snapshot, **keep** the locally mirrored value rather
  than overwriting with `[]` / `DEFAULT_HOUSE_AREAS`.
- Mirror to AsyncStorage on every local write (fire-and-forget).
- Versioned, uid-scoped cache keys, matching `buildTripCacheKey`.

### F2 — Guard the destructive trip rebuild

`src/domain/trip.ts` `initializeFromStorage` must not rebuild a completed trip
from an **unhydrated** staple cache. An empty staple list on the completed
branch currently wipes items and persists the result. Distinguish "no staples
exist" from "staples not loaded yet", and skip the destructive rebuild + persist
in the latter case.

### Explicitly out of scope

- **F3** (render from local cache without awaiting the network). Deferred: it
  must not ship without a local-write watermark, because
  `firestore-trip-storage.ts:247-252` disarms the empty-snapshot guard on every
  local write, widening the window where a late server snapshot clobbers an
  offline edit.
- Auth-gate additivity.
- The `onIdTokenChanged` latent re-init fragility (not currently triggered:
  `onAuthStateChanged` dedups on uid, `@firebase/auth/src/core/auth/auth_impl.ts:714-726`).

## Files affected

Production:
- `src/adapters/firestore/firestore-staple-storage.ts`
- `src/adapters/firestore/firestore-area-storage.ts`
- `src/adapters/firestore/firestore-section-order-storage.ts`
- `src/domain/trip.ts`

Tests:
- `tests/regression/firestore-trip-offline-cold-start.test.ts` — extend, or add
  a sibling, covering: offline cold start with a mirrored staple list renders
  that list; empty snapshot does not overwrite mirrored staples/areas/section order.
- `src/domain/trip.test.ts` — `initializeFromStorage` on a completed trip with an
  unhydrated staple cache must NOT clear items and must NOT persist.

## Why tests missed it

- The existing offline test models offline as **hard failure that resolves fast**
  (airplane-mode regime). The real store condition is *connected-but-dead* or
  *flapping* — slow, or never. No test exercises a delayed or withheld first snapshot.
- No test anywhere calls `initializeFromStorage([])`
  (`grep -rn "initializeFromStorage(\[\])" tests/ src/` → zero matches).
- Adapter tests cover each adapter in isolation; the wipe emerges only at the
  init seam where an empty staple cache meets a completed trip.

## Risk

MEDIUM-LOW. F1 replicates a pattern already in production for the trip adapter.
F2 is additive validation on a destructive path. Main risk is F2 over-triggering
and refusing a legitimate rebuild for a genuine new user with zero staples —
the regression test must pin both directions.
