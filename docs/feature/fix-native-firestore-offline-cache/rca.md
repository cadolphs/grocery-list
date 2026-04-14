# RCA: Native Firestore client has no disk-backed offline cache

- **Author:** Rex (RCA specialist)
- **Date:** 2026-04-13
- **Scope:** iOS/Android builds (web is out of scope — already has `persistentLocalCache()`).
- **Severity:** High — silent data loss for writes made while offline + suspended; stale UX on cold-start offline.

---

## 1. Problem definition

### 1.1 Observable symptoms

| # | Symptom | Evidence |
|---|---------|----------|
| S1 | On native cold-start while offline, `onSnapshot` hydration returns empty/stale data until connectivity resumes. | `firestore-trip-storage.ts` hydrates `cachedTrip` exclusively from `onSnapshot` (lines 68-80+); no fallback reader. With memory-only cache, no durable data exists after process death. |
| S2 | Offline taps/check-offs are lost if iOS/Android suspends or terminates the backgrounded app before connectivity returns. | `persistTripInBackground()` in `firestore-trip-storage.ts` (line 26-32) is a fire-and-forget `setDoc()`. Firestore's in-memory write queue does not survive process death. |
| S3 | `useAppInitialization.ts` comments describe a behavior (TripStorage = AsyncStorage) that does not match runtime wiring. | Line 5-6 & line 223 comments say "TripStorage always uses AsyncStorage (not synced to cloud)" / "AsyncStorage for trips". Line 230 wires `createFirestoreTripStorage` — the opposite. |

### 1.2 Scope boundary

- **In scope:** Firestore client configuration on native (iOS/Android) via `firebase-config.ts`; `useAppInitialization.ts` stale comments; offline durability of trip/staple/area/sectionOrder writes on native.
- **Out of scope:** Web behavior (correct today); auth persistence (already correctly uses `getReactNativePersistence(AsyncStorage)`); native Firebase SDK migration (non-trivial build change — mentioned only as alternative).

### 1.3 Known hot-spots (from user)

- `src/adapters/firestore/firebase-config.ts:52-61` — native branch passes `{}` to `initializeFirestore`.
- `src/hooks/useAppInitialization.ts:5-6, 223` — stale comments.

---

## 2. Five Whys — multi-causal branches

### Branch A — Native build is configured with in-memory-only Firestore cache

**WHY 1A (Symptom):** `getFirebaseDb()` on native calls `initializeFirestore(app, {})` with no `localCache` field.
  *Evidence:* `firebase-config.ts:54-59` — the `if (Platform.OS === 'web')` block guards both `experimentalForceLongPolling` and `localCache`; native falls through with empty config.

  **WHY 2A (Context):** The `localCache` setting was intentionally removed from the native branch.
  *Evidence:* `git log -p src/adapters/firestore/firebase-config.ts` shows commit `474de6d` ("fix: syncing of trip info", 2026-04-13) refactored a previously-unconditional config into the platform-conditional form, deliberately dropping `persistentLocalCache()` on native.

  **WHY 3A (System):** That change was driven by a documented belief that `persistentLocalCache()` cannot run on React Native because RN lacks IndexedDB.
  *Evidence:* `docs/feature/fix-firebase-native-persistence/deliver/roadmap.json` step 01-02, description: *"On native, omit persistentLocalCache from Firestore config... (IndexedDB unavailable)"*. Firebase JS SDK v12 confirms this: `node_modules/@firebase/firestore/dist/common-cd010f05.rn.js:12493` throws `FirestoreError(UNIMPLEMENTED, "This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.")` when `__PRIVATE_IndexedDbPersistence.v()` returns false — which it does on RN (no `window.indexedDB`).

  **WHY 4A (Design):** Firebase JS SDK ships a React Native entry point (`index.rn.js`) that includes the IndexedDB code path but does **not** provide a polyfill, native-module bridge, or alternative durable store. Persistence support is delegated to the host platform, and RN's JS runtime provides none.
  *Evidence:* Firebase team confirmation in [firebase-js-sdk issue #7947](https://github.com/firebase/firebase-js-sdk/issues/7947): "Offline persistence is officially supported only in Android, iOS, and web apps, not in React Native's JavaScript environment." Workaround is either (a) polyfill IndexedDB, (b) switch to `@react-native-firebase/firestore` (native bridge).

  **WHY 5A (Root cause):**
  > **Root Cause A:** The Firebase JS SDK we depend on (`firebase@^12.8.0`) has no first-class durable cache for React Native, and the project chose the "disable `persistentLocalCache()` on native" remediation without pairing it with a compensating durability mechanism (e.g., AsyncStorage write-through, polyfilled IndexedDB, or migration to React Native Firebase). The previous fix correctly avoided a crash but left offline durability as an open gap.

### Branch B — Stale comments masked the regression window

**WHY 1B (Symptom):** Reviewers and maintainers reading `useAppInitialization.ts` see "TripStorage always uses AsyncStorage (not synced to cloud)" and conclude trips already have disk-backed local storage.
  *Evidence:* `useAppInitialization.ts:5-6` and `:223`.

  **WHY 2B (Context):** The comments were written when trip storage really was AsyncStorage-only, and were not updated when `createFirestoreTripStorage` replaced it at line 230.
  *Evidence:* Production wiring at `useAppInitialization.ts:230` uses `createFirestoreTripStorage(db, uid, options)`; the AsyncStorage path is only reached via `createLegacyFactories()` (unauthenticated). The comment is factually wrong for the authenticated path.

  **WHY 3B (System):** The codebase has no linter or doc-test that flags divergence between module-level comments and exported behavior. Comments are maintained by convention only.
  *Evidence:* No tooling references in `package.json` for doc-sync; no CI step verifying comment claims.

  **WHY 4B (Design):** Ports-and-adapters architecture makes the "which adapter is production" decision a single line deep inside a factory — easy to change without touching adjacent prose documentation.
  *Evidence:* Single-line swap at `createProductionFactories` (line 230) with no adjacent comment block.

  **WHY 5B (Root cause):**
  > **Root Cause B:** No enforcement mechanism keeps module-header documentation in sync with factory wiring. Stale comments turned Branch A into a *silent* regression by misleading readers into believing durable trip storage already existed.

### Branch C — No automated test exercises offline cold-start or background-kill

**WHY 1C (Symptom):** The regression shipped to both `main` and production without a failing test.
  *Evidence:* `firebase-config.test.ts` contains tests that explicitly assert the *current* (buggy) behavior: `test("initializes Firestore without persistentLocalCache", ...)` (line 122) and `test("initializes firestore without long polling on native", ...)` (line 96). These tests lock in the symptom.

  **WHY 2C (Context):** The test suite was generated alongside the `fix-firebase-native-persistence` change (step 01-01, RED-GREEN), so its GREEN state assumed the *remediation* was complete — not that durability was solved.
  *Evidence:* `docs/feature/fix-firebase-native-persistence/deliver/roadmap.json` step 01-01 acceptance criteria: *"Test verifies getFirebaseDb() does not pass persistentLocalCache on native."* This test pins the very behavior that now causes data loss.

  **WHY 3C (System):** No integration test simulates (a) offline cold-start with pre-existing local data or (b) app-kill mid-pending-write. Tests are pure unit-level over the config surface.
  *Evidence:* `grep -r "offline" src/` returns no matches; no Jest test harness mocks RN process lifecycle or network toggling.

  **WHY 4C (Design):** Firestore's in-memory cache is transparent — reads and writes succeed identically whether or not persistence is enabled. Lack of durability is only visible across a *process restart*, which unit tests never simulate.
  *Evidence:* `createFirestoreTripStorage` API is stable across cache configurations; no port method exposes "is data durable?".

  **WHY 5C (Root cause):**
  > **Root Cause C:** The test strategy optimizes for config-shape assertions rather than end-to-end durability guarantees. Tests cannot fail on "writes lost after kill" because nothing in the harness models process death.

### Cross-validation

- **A + B consistency:** Non-contradictory. B (stale comments) *amplifies* A by masking it during review. If comments had been accurate, the missing durable storage for trips would have been flagged sooner.
- **A + C consistency:** Non-contradictory and mutually reinforcing. C locked A in place via a test that asserts the buggy shape.
- **All symptoms explained?**
  - S1 (offline cold-start empty) ← A (no on-disk cache to hydrate from).
  - S2 (writes lost on kill) ← A (in-memory queue only).
  - S3 (stale comments) ← B directly.
  - No orphan symptoms.
- **Backward validation:** If `persistentLocalCache()` is absent on native AND no compensating durable store exists AND no test checks durability, then cold-start offline yields empty `onSnapshot` and pending writes vanish on kill. Matches observed symptoms.

---

## 3. Contributing factors

1. **Firebase SDK limitation.** `firebase@12.8.0` on React Native has no supported durable cache (confirmed: `common-cd010f05.rn.js:12493` throws UNIMPLEMENTED; issue #7947 still open).
2. **Stale documentation.** `useAppInitialization.ts:5-6, 223` comments describe prior (AsyncStorage) behavior; they read as authoritative.
3. **Test suite locks in buggy shape.** `firebase-config.test.ts:122-148` assert absence of `localCache` and `experimentalForceLongPolling` on native — correct for v12 persistence but silent on durability.
4. **No offline integration tests.** No harness for process-kill or offline cold-start.
5. **Carryover + checkoffs are also Firestore-only.** Not just the trip: `firestore-staple-storage`, `firestore-area-storage`, `firestore-section-order-storage` share the same in-memory-only cache path. Staples changes made offline are also at risk (lower impact — users rarely edit staples offline at the store, but still non-zero).

---

## 4. Proposed fix

### 4.1 Decision tree

```
Q: Can we use persistentLocalCache() on native with firebase@12.8.0?
   A: NO. It throws UNIMPLEMENTED at first IndexedDB access on RN (confirmed in installed SDK source).
      Also: Firebase team doc #7947 confirms RN is unsupported for persistence.

Q: User's initial instinct ("enable persistentLocalCache on native") — viable?
   A: NO, and this is the CRITICAL finding requested. The previous fix (474de6d)
      that removed it on native is correct for SDK v12. Re-enabling it will regress
      to the original crash/UNIMPLEMENTED path on iOS/Android.

Q: Is experimentalForceLongPolling needed on native?
   A: NO. Native RN networking uses XHR/fetch transports that do not trigger the
      long-polling-required detection paths (that flag exists for specific
      browser/proxy WebChannel issues). Keep it web-only. User's instinct was correct here.

Q: Alternative durable strategy?
   A: AsyncStorage write-through ("dual-write") cache layered INSIDE each firestore
      adapter. On every cache mutation: (1) update in-memory, (2) schedule setDoc,
      (3) mirror to AsyncStorage under a per-user key. On initialize(): hydrate
      first from AsyncStorage synchronously, then start onSnapshot which will
      reconcile with server.
```

### 4.2 Recommended fix — three-part change

#### Part 1: CORRECTION of user's proposal for `firebase-config.ts`

Do **not** add `persistentLocalCache()` to the native branch. It will crash with:

> `FirebaseError: [code=unimplemented]: This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.`

Keep the current platform split for `localCache` and `experimentalForceLongPolling`. The native branch correctness at `firebase-config.ts:52-61` is **not** the bug; the bug is the absence of a compensating mechanism.

Only change required here: the code is already correct. No edit.

(Optional hardening: add an in-line comment explaining *why* native omits `persistentLocalCache` to prevent a future maintainer from re-introducing the crash.)

Proposed comment addition:

```ts
export const getFirebaseDb = (): Firestore => {
  if (db) return db;
  const firestoreConfig: Record<string, unknown> = {};
  if (Platform.OS === 'web') {
    // Web only: long-polling works around WebChannel proxy/firewall issues;
    // persistentLocalCache() uses IndexedDB which exists on web.
    firestoreConfig.experimentalForceLongPolling = true;
    firestoreConfig.localCache = persistentLocalCache();
  }
  // Native (iOS/Android): firebase-js-sdk has no durable cache on RN
  // (IndexedDB unavailable — see firebase-js-sdk#7947). Passing
  // persistentLocalCache() here throws UNIMPLEMENTED. Durability is
  // implemented as AsyncStorage write-through inside each adapter.
  db = initializeFirestore(getOrInitializeApp(), firestoreConfig);
  return db;
};
```

#### Part 2: AsyncStorage write-through layer inside each Firestore adapter (the actual fix)

For each of `firestore-trip-storage.ts`, `firestore-staple-storage.ts`, `firestore-area-storage.ts`, `firestore-section-order-storage.ts`:

1. On every cache mutation, mirror the new cache snapshot to AsyncStorage under a namespaced key: `firestore-cache:v1:{uid}:{entity}` (entity ∈ `trip`, `carryover`, `staples`, `areas`, `sectionOrder`).
2. On `initialize()`:
   a. Synchronously read AsyncStorage snapshot into `cachedX` and fire `onChange` so UI hydrates instantly.
   b. Subscribe `onSnapshot`; when server data arrives, overwrite AsyncStorage with the server snapshot (server wins on reconciliation — Firestore's own ordering resolves offline merges).
3. On every outbound `setDoc` attempt, keep current fire-and-forget semantics. The AsyncStorage mirror is the *read* durability layer. For **write** durability on kill, add a lightweight "pending writes" queue:
   - On write: append `{timestamp, docPath, payload}` to AsyncStorage key `firestore-pending:v1:{uid}`.
   - On write success (use `setDoc().then(...)`): remove entry.
   - On `initialize()`, after auth is ready, drain pending queue by re-issuing `setDoc`.
   - Firestore server timestamps + last-write-wins semantics mean replay-on-restart is safe for trip/staple/area docs (all are whole-document overwrites via `setDoc`, not partial updates).

This is a ports-and-adapters-clean approach: no domain code changes, no port contract changes. Hooks, domain services, and UI remain untouched.

#### Part 3: Comment correction in `useAppInitialization.ts`

```diff
- // When authenticated: creates Firestore adapters for staples, areas, section order.
- // TripStorage always uses AsyncStorage (not synced to cloud).
- // When not authenticated: signals needsAuth without creating adapters.
+ // When authenticated: creates Firestore adapters for staples, areas, section
+ //   order, AND trip. All Firestore adapters maintain an AsyncStorage
+ //   write-through cache for offline durability (Firebase JS SDK has no
+ //   persistent cache on React Native).
+ // When not authenticated: signals needsAuth without creating adapters; the
+ //   legacy factories fall back to pure AsyncStorage adapters.
```

And at line 223:

```diff
- // Production factories: Firestore for staples/areas/sectionOrder, AsyncStorage for trips
+ // Production factories: Firestore for staples/areas/sectionOrder/trip.
+ // Each Firestore adapter mirrors cache to AsyncStorage for offline durability.
```

### 4.3 Risk assessment (explicit answers to the three questions posed)

| Concern | Assessment |
|---------|------------|
| **(a) Does `persistentLocalCache()` work on RN with AsyncStorage?** | **NO.** It requires IndexedDB and throws `UNIMPLEMENTED` at bootstrap on RN. Confirmed by reading installed bundle `@firebase/firestore/dist/common-cd010f05.rn.js:12493` and firebase-js-sdk#7947. AsyncStorage is *not* an IndexedDB shim and the SDK does not consume it for persistence. User's initial instinct would regress to a crash. Mitigation path is AsyncStorage write-through inside adapters (Part 2 above). |
| **(b) Data migration concerns for existing users.** | **LOW.** The new AsyncStorage keys (`firestore-cache:v1:{uid}:*`) are namespaced and versioned — no collision with existing `async-staple-storage`, `async-trip-storage`, etc. keys. First run on an upgraded app: AsyncStorage mirror empty → adapter hydrates from `onSnapshot` as today → mirror populates. Zero UX regression. Pending-write queue is empty for upgraded users — also a no-op on first run. Existing `migrateTripIfNeeded` (from legacy AsyncStorage-only trips) is unaffected. |
| **(c) Cold-start performance impact.** | **MINOR POSITIVE** on first-paint offline; **neutral-to-slight-negative** online. AsyncStorage reads are ~5-20ms for small JSON on modern devices. Reading four keys in parallel during `initialize()` adds one ~20ms batch. In online cold-start this happens alongside `onSnapshot` subscription and is not on the critical path once server data arrives. In offline cold-start it *replaces* "empty UI for N seconds" with "stale-but-usable UI in 20ms" — major UX win. Writes add one AsyncStorage `setItem` per mutation (~2-5ms, non-blocking). |

Additional risks not in the user's list:
- **Reconciliation conflict window:** Between AsyncStorage hydration and first `onSnapshot` event, the user might act on stale data. Acceptable: Firestore's server timestamps + `setDoc` whole-document overwrite mean the most recent writer wins, which is identical to online behavior.
- **Pending queue bloat:** Cap queue length (e.g., 500 entries) to defend against a user stuck offline for a week. Warn via log when approaching cap.
- **Cross-device concurrent edit offline:** If two devices edit the same trip offline and both replay on reconnect, last-writer-wins drops earlier changes. This is unchanged from today — not a regression.

### 4.4 Alternative considered and rejected

**Alt 1: Migrate to `@react-native-firebase/firestore`.** Has native-SDK-backed durable cache built in. Rejected here as out-of-scope for a fix: requires EAS custom dev client, breaks `expo start`/Expo Go testing workflow, requires iOS pod re-integration and Android gradle updates, and conflicts with Expo SDK 54 New Architecture integration patterns. Worth a separate design-level evaluation. If chosen later, Part 2 of this fix is straightforward to remove.

**Alt 2: Polyfill IndexedDB on RN.** Third-party shims (e.g., `react-native-indexeddb`) exist but are unmaintained and firebase-js-sdk contributors explicitly call them unsupported. High risk of subtle concurrency/transaction bugs. Rejected.

---

## 5. Files affected

| File | Change |
|------|--------|
| `src/adapters/firestore/firebase-config.ts` | Explanatory comment only (code already correct). |
| `src/adapters/firestore/firestore-trip-storage.ts` | Add AsyncStorage write-through + pending-write queue. |
| `src/adapters/firestore/firestore-staple-storage.ts` | Add AsyncStorage write-through + pending-write queue. |
| `src/adapters/firestore/firestore-area-storage.ts` | Add AsyncStorage write-through + pending-write queue. |
| `src/adapters/firestore/firestore-section-order-storage.ts` | Add AsyncStorage write-through + pending-write queue. |
| `src/hooks/useAppInitialization.ts` | Correct stale comments at lines 5-6 and 223. |
| `src/adapters/firestore/firebase-config.test.ts` | Keep existing assertions. Optionally add: test that `persistentLocalCache` is NOT passed on native (lock in the fix-direction). |
| `src/adapters/firestore/firestore-trip-storage.test.ts` (+ peers) | New tests: initialize hydrates from AsyncStorage when present, pending-write queue drains on initialize, writes mirror to AsyncStorage. |
| (optional) `src/adapters/firestore/async-mirror.ts` | New shared utility module for the write-through + queue primitives (DRY across four adapters). |

---

## 6. Prevention strategy

Mapped to root causes:

| Root cause | Prevention |
|------------|------------|
| A — SDK has no RN durable cache, fix was incomplete | Document the Firebase JS SDK limitation in `src/adapters/firestore/README.md` or top-of-file in `firebase-config.ts`. Track firebase-js-sdk#7947 — if resolved, simplify. |
| B — Stale comments silently mislead | Adopt convention: when changing a factory binding, `grep` the containing file for outdated prose. Lightweight PR-review checklist item. (Heavier options — doc-test or ESLint rule — deferred as P3.) |
| C — Tests lock in config shape, not durability | Add an offline-durability integration test: mock AsyncStorage + Firestore, simulate process restart, assert previously-written data is readable. This becomes the regression anchor for this class of bug. |

### 6.1 Detection improvements

- Add a dev-only warning: if `Platform.OS !== 'web'` and the pending-write queue length exceeds a threshold on initialize, log a diagnostic (indicates previous session crashed offline with unflushed writes — useful signal).
- Telemetry (future): counter for "pending writes drained on startup" — quantifies real-world offline frequency.

### 6.2 Priority

- **P0 (immediate mitigation):** None — no active incident; no user-facing crash today, just silent degradation.
- **P1 (this sprint):** Parts 2 + 3 (write-through layer + comment fix). Part 1 comment for future-proofing.
- **P2 (next sprint):** Offline integration test harness.
- **P3 (backlog):** Design review of `@react-native-firebase` migration.

---

## 7. Summary

The user's instinct to re-enable `persistentLocalCache()` on native is **incorrect for Firebase JS SDK v12** — it throws `UNIMPLEMENTED` at runtime on RN. The previous fix at commit `474de6d` correctly removed it; the residual defect is the missing *compensating* durability layer. The correct fix is AsyncStorage write-through inside each Firestore adapter (keeping the current platform-conditional config in `firebase-config.ts` untouched), plus correcting the stale comments in `useAppInitialization.ts` that masked the regression. `experimentalForceLongPolling` should remain web-only (user was correct on this point).

### Sources

- [Firestore Persistence Support for Expo / React Native — firebase-js-sdk#7947](https://github.com/firebase/firebase-js-sdk/issues/7947)
- [PersistentLocalCache interface — Firebase JS API reference](https://firebase.google.com/docs/reference/js/firestore_.persistentlocalcache)
- [Access data offline — Firestore docs](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
- Installed SDK evidence: `node_modules/@firebase/firestore/dist/common-cd010f05.rn.js:12493` (UNIMPLEMENTED throw).
- Git history: commits `480c3d2`, `474de6d`, `84a27ac` on `src/adapters/firestore/firebase-config.ts`.
- Prior feature design: `docs/feature/fix-firebase-native-persistence/deliver/roadmap.json`.
