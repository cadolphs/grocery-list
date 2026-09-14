# RCA — fix-slow-render-flaky-network

**Feature ID**: fix-slow-render-flaky-network
**Date**: 2026-09-14
**Type**: BUGFIX (follow-ups D4 + F3 from `docs/evolution/2026-09-14-fix-offline-staple-cache-wipe.md` §8)
**Builds on**: `docs/feature/fix-offline-staple-cache-wipe/deliver/rca.md` (cache-wipe chain, lines 60-100, is taken as established and not re-investigated)
**Paradigm**: Functional TypeScript — factory functions, no classes
**Method**: Toyota 5 Whys, multi-causal, evidence at every level (`file:line`)

---

## 1. Problem statement (scoped)

On a cold start with flaky or dead wifi, an authenticated user sees `LoadingScreen` for ~10 s (dead wifi) to unbounded (flapping wifi) even though every Firestore adapter has already hydrated a correct list from its AsyncStorage mirror. The list, when it appears, is correct (fixed by F1+F2 today); it does not appear sooner.

**In scope**
- Why `initialize()` blocks in all four Firestore adapters, and how `useAppInitialization` / `App.tsx` turn that into a blocked render.
- Why the trip adapter's guard-disarm semantics (D4) make the obvious fix (F3, resolve on mirror hydration) unsafe, and what disarm semantics are safe.
- What the Firebase JS SDK v12.8.0 guarantees on React Native about queued offline writes and snapshot ordering.
- Which existing tests pin the blocking behaviour.

**Out of scope**: auth-gate additivity (`App.tsx:20-22`, `useAppInitialization.ts:350-352`); the cache-wipe chain itself.

---

## 2. Evidence index

| # | Claim | Evidence |
|---|---|---|
| E1 | Trip `initialize()` resolves only inside the first `onSnapshot` callbacks (trip AND carryover) | `src/adapters/firestore/firestore-trip-storage.ts:212-237` — `new Promise` resolved by `maybeResolve()` at 216-220, called only from the two `onSnapshot` callbacks at 222-228 and 230-236 |
| E2 | Staple `initialize()` same pattern | `firestore-staple-storage.ts:141-150` |
| E3 | Area `initialize()` same pattern | `firestore-area-storage.ts:168-177` |
| E4 | Section-order `initialize()` same pattern | `firestore-section-order-storage.ts:175-184` |
| E5 | Mirror hydration completes *before* subscribing, in all four | trip `197-210`; staple `134-139`; area `161-166`; section-order `168-173` |
| E6 | Orchestrator awaits all four with `Promise.all` | `src/hooks/useAppInitialization.ts:219-224` |
| E7 | `isReady: true` is returned only after that await + migration + domain init | `useAppInitialization.ts:226-293` (return at 287-293) |
| E8 | Hook publishes result via `setResult` only when the promise settles | `useAppInitialization.ts:356-365` |
| E9 | `App.tsx` renders `LoadingScreen` until `isReady && services` | `App.tsx:40-46` |
| E10 | Trip `onChange` is wired to `tripService.loadFromStorage` | `useAppInitialization.ts:217` (passes `onTripChange`), `238-240` (binds handler) |
| E11 | `loadFromStorage` notifies subscribers when state changed | `src/domain/trip.ts:272-290` (`notify()` at 287) |
| E12 | `useTrip` subscribes and calls `setItems` → re-render | `src/hooks/useTrip.ts:32-39` |
| E13 | Staple `onChange` → `handleStapleChange` → diff → auto-add/remove on the trip | `useAppInitialization.ts:214`, `256-268` |
| E14 | Area/section-order re-render via their own `subscribe` fan-out | `firestore-area-storage.ts:150-151`, `firestore-section-order-storage.ts:157-158`; consumers `src/hooks/useAreas.ts:29`, `src/hooks/useSectionOrder.ts:50` |
| E15 | Trip adapter disarms empty-snapshot guard on every local write | `firestore-trip-storage.ts:249` (`saveTrip`), `263` (`saveCheckoffs`), `278` (`updateItemArea`), `285` (`saveCarryover`), `294` (`clearCarryover`) |
| E16 | Carryover snapshot handler disarms on every snapshot that passes the guard, including `exists=false`. The guard at 179 checks only "do we hold local data worth keeping" (`hydratedFromLocal && cachedCarryover.length > 0`); nothing checks "does this snapshot carry server data" before clearing the flag at 185 | `firestore-trip-storage.ts:179-185` |
| E17 | Trip snapshot handler disarms only inside the "differs" branch but regardless of `incomingTrip === null` | `firestore-trip-storage.ts:160-169` (disarm at 164, null-check only for mirroring at 165) |
| E18 | The three F1 adapters disarm only on a data-bearing snapshot; local writes deliberately do not | staple `119-123` + comment `76-81`; area `144-148` + `97-102`; section-order `151-155` + `106-111`; `commitLocalChange` never touches the flag (staple `85-89`, area `111-115`, section-order `120-125`) |
| E19 | The write-disarm was introduced with the mirror, not the sync adapter | `git blame -L 249,249` → `a8a3093` (2026-04-14 "AsyncStorage write-through for trip adapter"); the `initialize` promise at 212-237 is from `f81ba4e` (2026-04-10) |
| E20 | D4 was a deliberate, recorded divergence | `docs/evolution/2026-09-14-fix-offline-staple-cache-wipe.md:59`, `:126-127` |
| E21 | SDK withholds the initial snapshot until `OnlineState.Offline` unless the view has docs/cached results | `node_modules/@firebase/firestore/dist/common-cd010f05.rn.js:16327-16336` (`La`, the minified `shouldRaiseInitialEvent`): `if (!e.fromCache) return true; … return (!waitForSyncWhenOnline || !online) && (!docs.isEmpty() || hasCachedResults || onlineState === Offline)` |
| E22 | `Offline` is declared after a 10 s timer armed on watch-stream start | `common-cd010f05.rn.js:15355-15357` (`enqueueAfterDelay("online_state_timeout", 1e4, …)`, log "Backend didn't respond within 10 seconds.") |
| E23 | The timer is armed only when the failure counter is 0; a successful connect resets the counter to 0; a subsequent drop from `Online` goes to `Unknown` **without** incrementing it, so the next stream start re-arms a fresh 10 s timer (flapping = unbounded) | `common-cd010f05.rn.js:15355` (`0 === this.oa && …`), `15364-15367` (`ha`: `"Online" === this.state ? this.ca("Unknown") : (this.oa++ …)`), `15375-15378` (`set`: `this.oa = 0`) |
| E24 | Local writes are applied to the local view immediately (latency compensation) and surface in the listener with `hasPendingWrites` | `common-cd010f05.rn.js:16995-17020` (`syncEngineWrite` → `localStoreWriteLocally` → overlays), `16346` (view compares `hasPendingWrites`), `2012` (`SnapshotMetadata(hasPendingWrites, fromCache)`) |
| E25 | On React Native the SDK runs `MemoryPersistence` / `MemoryMutationQueue`; IndexedDB persistence throws `UNIMPLEMENTED` | `src/adapters/firestore/firebase-config.ts:55-66` (cache configured web-only); `common-cd010f05.rn.js:17777` (`UNIMPLEMENTED … only available on platforms that support LocalStorage`), `11488` (`MemoryMutationQueue`), `11894` (`MemoryPersistence`), `18469` (default `MemoryOfflineComponentProvider`) |
| E26 | Snapshot callbacks are delivered on a fresh macrotask (`setTimeout`), never synchronously with SDK state | `common-cd010f05.rn.js:17927` (`AsyncObserver` → `setTimeout(() => … e(t))`) |
| E27 | Three tests assert `initialize()` must **stay pending** while the mirror is readable | `tests/regression/firestore-offline-cold-start-mirror.test.ts:162`, `:350`, `:508` (`expect(initializeResolved).toBe(false)`) |
| E28 | Trip regression test fires the snapshot synchronously; it has no `withheld`/`delayed` regime and no late-empty-snapshot case | `tests/regression/firestore-trip-offline-cold-start.test.ts:43-51`, `100-127` |
| E29 | No test pins the trip adapter's disarm-on-write; the flag is referenced only in adapter sources and the prior RCA | `grep -rln "tripHydratedFromLocal\|hydratedFromLocal\|disarm" src tests` → sources + `docs/feature/fix-offline-staple-cache-wipe/deliver/{rca.md,roadmap.json}` only |
| E30 | `migrationNeeded` reads the adapter cache after `initialize()`; `migrateTripIfNeeded` short-circuits on a non-null cloud trip | `src/adapters/firestore/migration.ts:14-15`, `41-43`; called at `useAppInitialization.ts:226`, `94`, `97` |
| E31 | `initializeFromStorage` refuses the destructive completed-trip rebuild when inputs are empty (F2) | `src/domain/trip.ts:342-355` |
| E32 | The domain never calls `saveCheckoffs`/`loadCheckoffs`; checkoffs persist through `saveTrip` via `persistTrip` | `grep -rn "saveCheckoffs\|loadCheckoffs" src` → adapters + port only; `src/domain/trip.ts:138-140` |
| E33 | No app code calls `deleteDoc`; trip/carryover docs are only ever `setDoc`'d | `grep -rn deleteDoc src` → no matches; `firestore-trip-storage.ts:14,48,56` |

---

## 3. Toyota 5 Whys — three branches

```
PROBLEM: On a flaky-network cold start the authenticated app shows LoadingScreen
for ~10 s to unbounded although every adapter already holds a correct,
mirror-hydrated list in memory.
```

### Branch A — Readiness is bound to the first network event

```
WHY 1A: App.tsx renders LoadingScreen until isReady is true.
  [E9: App.tsx:40-46]
  WHY 2A: isReady becomes true only when initializeApp() resolves, which awaits
          Promise.all over the four adapters' initialize().
    [E6, E7, E8: useAppInitialization.ts:219-224, 287-293, 356-365]
    WHY 3A: Each initialize() hydrates from AsyncStorage first (E5) but then
            returns a Promise that is resolved ONLY from inside the first
            onSnapshot callback — trip needs BOTH trip and carryover callbacks.
      [E1-E4: trip 212-237, staple 141-150, area 168-177, section-order 175-184]
      WHY 4A: The SDK withholds a from-cache initial event for an empty local
              view until OnlineState becomes Offline (E21), which takes a 10 s
              timer (E22) that re-arms on every stream restart while flapping
              (E23). On RN the local view IS empty at cold start because the
              cache is memory-only (E25). So the first callback = "server
              answered" OR "10 s of silence", whichever first; on flapping wifi
              neither may happen for a long time.
        [E21-E25]
        WHY 5A: initialize() was written (f81ba4e, April 10) when the ONLY
                source of truth was the network — "ready" legitimately meant
                "first snapshot seen". The mirror was bolted on four days later
                (a8a3093) and again today (28dadfa, 64e07b5) as a hydration step
                *before* the same unchanged Promise (E5 vs E1-E4, E19;
                evolution doc §4: "initialize() resolution timing is unchanged").
                Readiness semantics were never revisited when a second, local
                source of truth was introduced.
        -> ROOT CAUSE A: "Adapter ready" is defined as "first remote snapshot
           observed", a definition inherited from the pre-mirror design and
           never redefined as "has any authoritative-enough data to render".
        -> SOLUTION A (F3): resolve initialize() as soon as mirror hydration
           yields a mirrored decision; keep the subscription live and let the
           existing onChange/subscribe fan-out (E10-E14) apply later snapshots.
```

### Branch B — The trip adapter's guard disarms on local writes (D4)

```
WHY 1B: F3 was explicitly deferred; the blocker named is the trip adapter's
        disarm-on-write (prior RCA 93-97; evolution §2, §8.1-2).
  [E20]
  WHY 2B: With F3 the user can interact BEFORE the first snapshot. Any edit in
          that window runs saveTrip → tripHydratedFromLocal = false (E15).
          When the first snapshot then arrives as exists=false, the guard at
          153 no longer holds, so 160-169 sets cachedTrip = null and fires
          onChange. Carryover is worse: handleCarryoverSnapshot disarms on
          EVERY snapshot including an absent one (E16), so a second absent
          snapshot (flapping reconnect) can zero cachedCarryover regardless of
          any write.
    [E15, E16, E17]
    WHY 3B: Without F3 the window is closed by construction: the app cannot
            render (Branch A) until the first snapshot has ALREADY been
            processed while the guard was still armed. The unsafe semantics
            were masked by the slow render. F3 unmasks them.
      [E1, E6, E9 — the render gate is the only thing sequencing "edit" after
       "first snapshot"]
      WHY 4B: The write-disarm was added in a8a3093 alongside the mirror with
              the rationale "server is authoritative once we've written" (see
              comment at 162-163 which talks about SERVER data, yet the same
              flag is cleared by LOCAL writes at 249/263/278/285/294). A local
              write is evidence about local intent, not about server state;
              the F1 adapters written today state this explicitly (E18).
        [E15, E18, E19]
        WHY 5B: The trip adapter was the prototype; its mirror semantics were
                never re-validated against the rule the team later derived
                ("only a data-bearing snapshot disarms"), and no test pins the
                trip disarm either way (E29), so the asymmetry survived review
                and was recorded as a known inconsistency (E20) rather than
                fixed.
        -> ROOT CAUSE B: Guard-disarm semantics were derived per adapter and
           never unified; the trip adapter conflates "we wrote locally" with
           "the server has spoken", and the carryover path disarms on silence.
        -> SOLUTION B (D4): trip adapter disarms ONLY when a snapshot carries
           data (trip: incomingTrip !== null; carryover: snapshot.exists()).
           Local writes never touch the flag. Must land BEFORE F3.
```

### Branch C — The SDK's own offline guarantees (why a watermark is NOT needed for F3, and what it IS needed for)

```
WHY 1C: The prior RCA asserted F3 "must not ship without a local-write
        watermark". Verify whether the SDK's ordering guarantees make the
        clobber reachable at all, and by which sequence.
  [prior rca.md:93-97; evolution §2]
  WHY 2C: In-process, a setDoc() is applied to the local view immediately and
          every subsequent snapshot for that doc reflects the overlay with
          hasPendingWrites=true (E24). Therefore, after a local write, the SDK
          cannot deliver exists=false for that doc in the same process unless
          the mutation is rejected by the backend or another client deletes
          the doc (the app never deletes — E33).
    [E24, E33]
    WHY 3C: The reachable clobber is therefore an ORDERING race at the
            adapter, not an SDK ordering violation: the exists=false event is
            computed by the sync engine (e.g. at the 10 s Offline transition)
            and delivered on a later macrotask (E26). If the user's tap
            handler runs between those two points, the adapter observes:
            saveTrip (disarm, cache=T') → callback(exists=false) → cache=null.
            The SDK's *next* event (the write overlay, exists=true T') then
            restores the cache; net effect is a transient null cache plus a
            spurious onChange. Domain items survive because loadFromStorage
            ignores a null trip (trip.ts:274), and checkoffs are not routed
            through saveCheckoffs (E32).
      [E26, E11, E32]
      WHY 4C: Across a PROCESS RESTART the picture changes: the mutation queue
              is memory-only on RN (E25), so a write made offline in session 1
              is lost from the SDK while the mirror still holds it. Session 2
              hydrates the newer T' from the mirror, and if the server later
              answers with an OLDER doc T0 (written before session 1 by this
              or another device), T0 is data-bearing → server wins → mirror
              overwritten with T0 → onChange → domain adopts T0. The offline
              edit is lost. This is independent of F3 and of D4; it exists
              today (initialize() hydrates at 202-206 and the first snapshot
              at 153-169 compares only content, never recency).
        [E25, firestore-trip-storage.ts:153-169, 202-206]
        WHY 5C: The mirror records VALUE but not RECENCY; there is no
                per-record write watermark, so "server has data" is treated as
                "server is newer". A watermark (local write timestamp or
                monotonic sequence mirrored alongside the value, compared
                against a server-side updatedAt) is what would fix this —
                but it is a different defect (stale-server-wins), not the
                empty-snapshot clobber that blocks F3.
        -> FINDING C: For the empty-snapshot clobber that gates F3, the F1
           adapters' semantics ("disarm only on data-bearing snapshot") are
           SUFFICIENT for the trip adapter; no watermark is required. A
           watermark is REQUIRED to close the pre-existing stale-server-wins
           path (WHY 4C), which F3 neither causes nor widens (the first
           data-bearing snapshot is processed identically with or without an
           early render). Recommend a separate follow-up.
```

### Alternatives considered and rejected

| Hypothesis | Why rejected | Evidence |
|---|---|---|
| Mirrors are not actually populated at cold start, so there is nothing to render early | Hydration runs and completes before `onSnapshot` is registered in all four adapters; the F1 regression tests read mirrored data while `initialize()` is still pending | E5; `firestore-offline-cold-start-mirror.test.ts:146-164, 337-352, 495-510` |
| Resolve `Promise.all` when three of four adapters settle | The trip adapter is the one that needs both trip and carryover callbacks, and `initializeFromStorage` (235) needs trip + carryover + staples; partial readiness would still block on trip or run the rebuild on incomplete inputs | E1, E6, `trip.ts:326-362` |
| Drop the Firestore subscription until the mirror has been rendered, then subscribe | Delays the server round trip further and changes nothing about the guard semantics; the subscription is cheap and must exist for cross-device sync. F3 keeps the subscription and only stops awaiting it | E10-E14 |
| Give `initialize()` a timeout (resolve after N seconds regardless) | Treats the symptom: still N seconds of blank screen, and on flapping wifi the mirror is already correct at t=0. Also leaves Branch B untouched | E22-E23 |
| A watermark is a prerequisite for F3 (prior RCA position) | The empty-snapshot clobber is closed by data-bearing-only disarm; in-process, a `setDoc` overlays every later snapshot (E24). The watermark closes a distinct defect (stale-server-wins after restart) that exists today with or without F3 | Branch C |

### Cross-validation

- **A + B**: consistent. A is why the render is slow; B is why the naive fix for A was unsafe. Fixing B removes the safety objection to fixing A.
- **A + C**: consistent. C explains the ~10 s / unbounded figures in A (E22-E23) and why the mirror is the only durable source (E25).
- **B + C**: consistent. C shows that under D4-harmonised semantics the only remaining empty-snapshot exposure is a benign transient, and that the "watermark" concern in the prior RCA conflates two defects.
- **All symptoms explained**: slow render (A); unsafe-to-fix-quickly (B); "10 s to unbounded" magnitude (C); "list correct when it appears" (F1/F2, prior RCA, unchanged).

### Backwards chain validation

- If ROOT CAUSE A exists (ready = first snapshot) and the SDK withholds the first snapshot for 10 s+ (C), then `Promise.all` cannot settle, `isReady` stays false, `LoadingScreen` stays up → observed symptom. Yes.
- If ROOT CAUSE B exists (write disarms) and F3 were shipped, then an edit before the first empty snapshot leads to `cachedTrip = null` at 161 and `cachedCarryover = []` at 184 → the clobber the prior RCA feared. Yes (with the ordering caveat in 3C).
- If FINDING C is correct, then after D4 an edit before the first empty snapshot leaves the guard armed and 153 returns early → edit survives. Yes. Regression test (b) below pins it.

---

## 4. Contributing factors

1. **Test suite pins the blocking behaviour** (E27). Three assertions in `firestore-offline-cold-start-mirror.test.ts` (162, 350, 508) require `initialize()` to remain pending under `withheld`. They were written to prove hydration does not *depend* on the snapshot; they will fail under F3 and must be inverted (they then become the F3 acceptance tests for staples/areas/section-order).
2. **Trip regression test models offline as a synchronous empty snapshot** (E28). It cannot express "before any snapshot" or "late snapshot", so neither F3 nor D4 can currently be pinned for the trip adapter.
3. **Late-binding `onChange`** (`useAppInitialization.ts:203-208`, `238-240`): an `onChange` that fires before line 238 is a no-op. Under F3 a snapshot can arrive between `initialize()` resolving and `handleTripChange` being bound. Not a defect: `initializeFromStorage` at 235 reads `storage.loadTrip()` at that moment, and 235-293 is synchronous, so any snapshot processed before 235 is picked up by the read and any after 238 by the handler. Only `runMigrationIfNeeded` (226) awaits, and it precedes 235.
4. **`migrationNeeded` observes mirror state under F3, server state today** (E30). Offline cold start: identical outcome (today the server is silent and the cache after the empty snapshot equals the mirror). Online cold start with a mirrored `[]` staple list and a non-empty server list (user deleted all staples on this device, another device added some since, and legacy AsyncStorage staples still exist): F3 would re-run the legacy migration before the server snapshot. Narrow; pre-existing in a different timing form; see Risk R4.
5. **Stale-server-wins on process restart** (Branch C, WHY 4C). Pre-existing; not widened by F3; needs the watermark follow-up. Recorded here so it is not mistaken for an F3 regression.
6. **Auth-gate additivity** (out of scope, prior RCA "Contributing factors"): the Firestore wait starts only after auth revalidation; F3 shortens the second term of the sum, not the first.

---

## 5. Proposed fix — D4 first, then F3

### Step 1 — D4: harmonise trip adapter disarm semantics (`src/adapters/firestore/firestore-trip-storage.ts`)

Rule (identical to the F1 adapters): **only a snapshot that carries data disarms the guard; local writes never touch it.**

```ts
// handleTripSnapshot — lines 157-169 become:
const incomingSerialized = serializeTrip(incomingTrip);
const currentSerialized = serializeTrip(cachedTrip);

if (incomingSerialized !== currentSerialized) {
  cachedTrip = incomingTrip;
  if (incomingTrip !== null) {
    // Server data has arrived — it is authoritative for the rest of this
    // session, so the empty-snapshot guard stands down.
    tripHydratedFromLocal = false;
    mirrorTripToAsyncStorage(uid, incomingTrip);
  }
  onChange?.();
}
```

```ts
// handleCarryoverSnapshot — lines 183-188 become:
const resolved = incomingItems ?? [];
cachedCarryover = resolved;
if (incomingItems !== null) {
  // An existing carryover document, even with items: [], is a stored decision
  // (clearCarryover persists []). Absence is silence and must not disarm.
  carryoverHydratedFromLocal = false;
  mirrorCarryoverToAsyncStorage(uid, resolved);
}
```

Delete the five local-write disarms: `saveTrip:249`, `saveCheckoffs:263`, `updateItemArea:278`, `saveCarryover:285`, `clearCarryover:294`. Update the comment at 131-135 to the F1 wording ("Only a snapshot actually carrying data disarms it — local writes deliberately do not, because a local write is no evidence about server state").

Optional, same spirit as the F1 adapters: extract `const commitTripChange = (trip: Trip): void => { cachedTrip = trip; persistTripInBackground(db, uid, trip); mirrorTripToAsyncStorage(uid, trip); }` and route `saveTrip`/`saveCheckoffs`/`updateItemArea` through it; likewise `commitCarryoverChange`. Pure refactor, keeps the adapter shape.

Residual after D4 (mirrors D6 in the evolution doc): a remote *deletion* of the trip doc while armed is ignored for the session. The app never deletes (E33), so this is theoretical.

### Step 2 — F3: resolve `initialize()` on mirror hydration, per adapter

Uniform rule: **if the mirror yielded an entry, resolve immediately; the subscription is registered either way and later snapshots flow through the existing `onChange`/`subscribe` seams.** If the mirror yielded nothing, keep today's behaviour (await the first snapshot) — a brand-new device has nothing to render and the server is all we have.

Shape (shown for staples; the other three are the same three-line change):

```ts
// firestore-staple-storage.ts — initialize, lines 129-151
initialize: async (): Promise<void> => {
  const localStaples = await readStaplesFromAsyncStorage(uid);
  const hydratedFromMirror = localStaples !== null;
  if (hydratedFromMirror) {
    cache = localStaples;
    isInitialized = true;
    hydratedFromLocal = true;
  }

  const firstSnapshot = new Promise<void>((resolve) => {
    let resolved = false;
    unsubscribeFn = onSnapshot(buildDocRef(db, uid), (snapshot) => {
      handleSnapshot(snapshot as …);
      if (!resolved) { resolved = true; resolve(); }
    });
  });

  // Mirror present: render now, let the snapshot update later via onChange.
  // No mirror: the server is all we have — keep waiting for it.
  return hydratedFromMirror ? undefined : firstSnapshot;
},
```

Per-adapter "mirror yielded an entry" predicate (all already computed by the existing hydration code):

| Adapter | Predicate | Lines today |
|---|---|---|
| staples | `localStaples !== null` (a mirrored `[]` counts — it is a recorded decision) | `134-139` |
| areas | `localAreas !== null` (reader already returns null for empty/invalid, `59-72`) | `161-166` |
| section-order | `mirroredOrder !== null` (envelope present; `order: null` is a legitimate decision) | `168-173` |
| trip | `localTrip !== null && localCarryover !== null` — require both; the completed-trip rebuild at `trip.ts:335-355` consumes carryover, so resolving with only the trip mirror could rebuild without server-side carryover and then `clearCarryover()` it. Both keys have been written together since `a8a3093` (April), so in practice both are present or both absent. | `197-210` |

Notes:
- The `firstSnapshot` promise must still be *created* (subscription registered) before returning; only the `await` is skipped. It never rejects, so an un-awaited promise is safe.
- No port change. `InitializableStorage.initialize: () => Promise<void>` (`useAppInitialization.ts:48-51`) is unchanged; `Promise.all` at 219-224 now settles as soon as the slowest *mirror read* completes when all four mirrors exist, otherwise as soon as the missing adapter's first snapshot arrives.
- Domain wiring needs no change: E10-E14 already re-render on later snapshots; `handleStapleChange` (E13) already diffs and auto-adds/removes when server staples differ from mirrored ones.

### Step 3 — Tests

- Invert E27: `tests/regression/firestore-offline-cold-start-mirror.test.ts:162, 350, 508` → `expect(initializeResolved).toBe(true)`; rename the three tests to "…initialize() resolves from the mirror before the first snapshot when it is withheld".
- Add the trip regression tests below.

---

## 6. Files affected

**Production**
- `src/adapters/firestore/firestore-trip-storage.ts` — D4 (handlers 157-169, 183-188; remove disarms at 249, 263, 278, 285, 294; comment 131-135) then F3 (initialize 192-238).
- `src/adapters/firestore/firestore-staple-storage.ts` — F3 (initialize 129-151).
- `src/adapters/firestore/firestore-area-storage.ts` — F3 (initialize 155-178).
- `src/adapters/firestore/firestore-section-order-storage.ts` — F3 (initialize 162-185).
- `src/hooks/useAppInitialization.ts` — no code change; header comment (1-9) may note that readiness is mirror-first.
- `docs/product/architecture/brief.md` — Real-Time Sync Pattern step "hydrate before subscribing" gains "and resolve readiness from the mirror"; remove the recorded D4 inconsistency (evolution §7.3).

**Tests**
- `tests/regression/firestore-offline-cold-start-mirror.test.ts` — invert 162, 350, 508 (F3 acceptance for staples/areas/section-order).
- `tests/regression/firestore-trip-offline-cold-start.test.ts` — add a `snapshotMode` (`immediate | withheld | delayed`) and `deliverSnapshot` helper mirroring the sibling file (`firestore-offline-cold-start-mirror.test.ts:38-82`), plus:

  **(a) Offline cold start renders the mirrored list before any snapshot fires**
  ```
  given  adapter A initialized (immediate, empty remote), saveTrip(T), saveCarryover(C)
  and    snapshotMode = 'withheld'
  when   adapter B is created and initialize() is called
  then   initialize() resolves (await it with a short timeout / flag)
  and    B.loadTrip() equals T, B.loadCarryover() equals C
  and    mockOnSnapshot was called for both doc paths (subscription still registered)
  ```
  A no-mirror control: with AsyncStorage cleared and `withheld`, `initialize()` stays pending (today's behaviour preserved for new devices).

  **(b) A local edit survives a late empty snapshot** (pins D4 under F3)
  ```
  given  adapter A: saveTrip(T) ; snapshotMode = 'delayed'
  when   adapter B initialize() resolves from the mirror
  and    B.saveTrip(T') where T' adds one item
  and    deliverSnapshot(tripDocPath, undefined)            // exists=false
  then   B.loadTrip() equals T'  (not null, not T)
  and    onChange was not called
  ```
  Carryover twin: `saveCarryover(C)` on A; B hydrates; `deliverSnapshot(carryoverDocPath, undefined)` twice (flapping) → `loadCarryover()` still `C`. And the positive control: `deliverSnapshot(tripDocPath, { trip: T2 })` → `loadTrip()` equals `T2` and is re-mirrored (server data still wins).

  Optional hook-level test in `src/hooks/useAppInitialization.test.ts`: a factory whose `initialize()` resolves immediately but whose `onChange` fires afterwards with a different trip → `tripService.getItems()` reflects it (E10-E12 wiring; the acceptance test `wire-firestore-trip-sync.test.ts:268-275` already covers most of this).

- `src/adapters/firestore/firestore-trip-storage.test.ts` — unaffected (snapshot fires synchronously at 22-32; AsyncStorage cleared at 96 so no mirror). Consider adding one D4 unit test: after `saveTrip`, an `exists=false` echo via `simulateRemoteSnapshot(TRIP_DOC_PATH, undefined)` does not null the cache when hydrated.
- `src/adapters/firestore/firestore-{staple,area,section-order}-storage.test.ts`, `tests/unit/hooks/useAppInitialization.test.tsx`, `tests/acceptance/wire-firestore-trip-sync/*` — unaffected (fake adapters resolve immediately, `wire-firestore-trip-sync.test.ts:60-125`; hook test uses legacy AsyncStorage adapters).

---

## 7. Risk assessment

Overall: **Low-to-medium.** D4 is a strict narrowing of when a flag is cleared; F3 changes *when* readiness is signalled, not *what* state is observed on the offline path. The behaviour change is concentrated on the *online* cold start.

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **Online cold start now renders from the mirror first, then re-renders when the snapshot arrives (~100 ms-1 s).** Single-device users see an echo (no visible change, `onChange` suppressed by the serialized compare at trip 160 / staple 114). Multi-device users may see a brief stale list that then updates. | Certain (by design) | Cosmetic | Existing seams already re-render (E10-E14). If flicker is objectionable, `LoadingScreen` could be kept for a short grace period when online — not recommended; it reintroduces the wait. |
| R2 | **Edit-on-stale-render, multi-device.** User edits the mirrored trip before the server snapshot; the whole-document `setDoc` overlays the server doc; last-write-wins discards the other device's change. | Low (requires concurrent multi-device edits within the first second) | Medium (other device's change lost) | Pre-existing property of whole-document LWW (`setDoc` at 48); F3 widens the window from "after first snapshot" to "from render". Real fix is field-level merges or the watermark follow-up; out of scope. |
| R3 | **Completed-trip rebuild runs against mirrored staples, not server staples.** If another device added/removed staples since this device last synced, the rebuild uses the mirror; the server snapshot then diffs via `handleStapleChange` (E13) and auto-adds/removes. | Low | Low (self-corrects within a second; `applyRemovedStaplesToTrip` removes, `applyAddedStaplesToTrip` adds) | Already the F1 offline behaviour; F3 only makes it the online behaviour too. Covered by `useAppInitialization.test.ts:282-370`. |
| R4 | **`migrationNeeded` sees the mirror** (Contributing factor 4): mirrored `[]` staples + non-empty server + surviving legacy AsyncStorage staples → legacy re-migrated, then LWW pushes them over the server list. | Very low (three coincidences) | Medium | Accept and record; or guard `migrationNeeded` with "and no mirror entry existed" in a later change. Offline path identical to today. |
| R5 | **Trip early-resolve with only one of trip/carryover mirrors.** Guarded by requiring both (Step 2 table); otherwise falls back to awaiting the snapshot. | Very low | Low | Predicate requires both keys. |
| R6 | **D4 residual: remote trip/carryover deletion ignored while armed.** | Theoretical | Low | App never deletes (E33). Same residual accepted for the three F1 adapters (evolution D6). |
| R7 | **Stale-server-wins after process restart** (Branch C WHY 4C). | Low-medium on real flaky usage | High (offline edit lost) | **Not introduced or widened by this fix**; needs the watermark follow-up. Called out so it is not attributed to F3 in bug reports. |
| R8 | **Test inversion masks a regression in hydration-before-subscribe.** Inverting E27 removes the assertion that hydration is independent of the snapshot. | Low | Low | The new test (a) asserts `loadTrip()` after resolution AND that `onSnapshot` was registered; keep the `withheld` regime in the tests so a future refactor that makes hydration depend on the snapshot hangs the test rather than passing. |

**Behaviour change summary for online cold start**: today — LoadingScreen until the server answers (typically <1 s), then a single render from server data. After F3 — render from the mirror as soon as AsyncStorage reads complete (tens of ms), then a snapshot-driven update that is a no-op for single-device users and a visible correction for multi-device users. Readiness for a device with no mirror (first install, new uid) is unchanged.

---

## 8. Follow-ups surfaced (not in this fix)

1. **Local-write watermark** for the trip adapter (and, by symmetry, the F1 adapters) to close stale-server-wins across a process restart (Branch C). Design sketch: mirror `{ value, writtenAt }`; persist `updatedAt: serverTimestamp()` alongside the value; on a data-bearing snapshot, adopt the server value only if `server.updatedAt >= mirror.writtenAt`, otherwise re-push the mirror.
2. Pre-existing follow-ups from the evolution doc §8.3-8.4 (area adapter's adapter-to-adapter import; ADR renumbering) — unchanged.
