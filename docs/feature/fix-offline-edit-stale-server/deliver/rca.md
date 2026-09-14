# RCA — Offline edit lost after process restart when the server answers with an older document (R7, "stale-server-wins")

Date: 2026-09-14. Method: Toyota 5 Whys, multi-causal, evidence at every level.
Builds on `docs/feature/fix-slow-render-flaky-network/deliver/rca.md` Branch C (WHY 4C/5C, §8.1) and `docs/evolution/2026-09-14-fix-slow-render-flaky-network.md` §8.1 — not repeated here; cited as *prior-RCA* / *evolution*.

Paths in this document are relative to the repository root. SDK citations are into `node_modules/@firebase/firestore/dist/` (firebase 12.8.0; `common-cd010f05.rn.js` = *common*, `index.rn.js` = *index*).

---

## 1. Problem definition and scope

**Problem statement.** On React Native, an edit made while offline in session 1 is written to the in-memory Firestore mutation queue and to the AsyncStorage mirror. When the process is killed before the queue drains, the mutation is gone (*prior-RCA* E25). On the next cold start the adapter hydrates from the mirror (F3) and subscribes; if the first data-bearing snapshot carries an *older* server document (written before session 1 by this device or another), every adapter adopts it, disarms the hydrated-from-local guard, **overwrites the mirror with the older value**, and fires `onChange`. The offline edit is lost from memory, from disk, and from the server — silently.

**In scope.** All four Firestore adapters in `src/adapters/firestore/`: trip + carryover, staples, areas, section order. Design of the watermark, mirror schema migration, re-push path, multi-device semantics, test impact.

**Out of scope** (per task): auth-gate additivity, field-level merges, the web `persistentLocalCache` path except to state whether the fix is harmless there. Whole-document LWW is pre-existing and noted, not solved.

**Not a regression of F3.** *Prior-RCA* Branch C and *evolution* §6 R7 establish the defect predates and is independent of mirror-first readiness. Confirmed below (§2 S1–S5: the adoption path is the same with or without an early render).

---

## 2. Evidence register

| # | Evidence | Source |
|---|----------|--------|
| S1 | Trip handler: absent-snapshot guard only (`incomingTrip === null`); any data-bearing snapshot whose serialized content differs replaces the cache, disarms the guard, **re-mirrors the server value**, fires `onChange`. No recency comparison anywhere. | `src/adapters/firestore/firestore-trip-storage.ts:169-185` |
| S2 | Carryover handler: same shape; additionally has no init gating and no echo compare — `cachedCarryover = incomingItems` on every existing document, then re-mirror. | `firestore-trip-storage.ts:195-205` |
| S3 | Staple handler: guard at 100 for `!serverHasStaples`; differing data-bearing snapshot → `cache = resolvedItems`, disarm, **re-mirror**, `onChange`. | `firestore-staple-storage.ts:100-125` |
| S4 | Area handler: identical structure. | `firestore-area-storage.ts:124-151` |
| S5 | Section-order handler: identical structure. | `firestore-section-order-storage.ts:134-158` |
| S6 | Hydration reads the mirror before subscribing and sets `hydratedFromLocal` / `isInitialized`. | trip `214-227`; staple `134-139`; area `161-166`; section-order `168-173` |
| S7 | Mirror **writers** store the raw value (trip `62`, carryover `69`, staple `50`, area `56`); section-order stores an envelope `{ order }` (`59-64`, type at `39-41`). Mirror **readers**: trip `72-92`, staple `53-63` (raw parse), area `60-72` (**returns null for empty or non-array**), section-order `67-82` (`{ order: null }` is a legitimate mirrored decision). | as listed |
| S8 | Key builders, all `firestore-cache:v1:{uid}:{doc}`. | trip `37-41`; staple `36-37`; area `42-43`; section-order `48-49` |
| S9 | `setDoc` payloads carry the value only: `{ trip }`, `{ items }`, `{ items }`, `{ items: areas }`, `{ order }`. No timestamp field exists on any doc; domain types carry `createdAt` only. | trip `48`, `56`; staple `44`; area `50`; section-order `56`; `src/domain/types.ts:18,69` |
| S10 | RN uses `MemoryMutationQueue`; queued writes die with the process. | *common* `11488`; `src/adapters/firestore/firebase-config.ts:55-66`; *prior-RCA* E25 |
| S11 | `serverTimestamp()` under a pending write: `snapshot.data(options)` forwards `options.serverTimestamps` (*index* `1150-1159`); `convertValue(e, t = "none")` (*common* `20815`); `convertServerTimestamp`: `'previous'` → previous value or null, `'estimate'` → the **client's** local write time, default `'none'` → **`null`** (*common* `20882-20896`). The local overlay stores a sentinel `{ __type__: 'server_timestamp', __local_write_time__ }` (*common* `3467`, `5304-5320`). `Timestamp.now()` is `Date.now()` (*common* `1275-1281`). |
| S12 | View change tracking: if `oldDoc.data.isEqual(newDoc.data)` the change is **Metadata-only** (type 3); listeners without `includeMetadataChanges` receive an event only when `docChanges.length > 0` (metadata-only changes are stripped). Ack of a server-transform write is coalesced (`su`). Verbatim excerpts in §6.4. | *common* `16591-16603`, `16342-16348`, `16636-16643` |
| S13 | `SnapshotMetadata(hasPendingWrites, fromCache)` is public on every snapshot. | *index* `1107`, `2012` |
| S14 | Security rules are path/uid-only; no document-shape validation, so an added field is accepted. | `firestore.rules:6-8` |
| S15 | Web: SDK durable cache is web-only (`firebase-config.ts:55-66`); the adapters have **no platform branch** (`grep Platform.OS src` → only `firebase-config.ts` and UI files), and AsyncStorage's web build is `window.localStorage` (`node_modules/@react-native-async-storage/async-storage/lib/module/AsyncStorage.js:22-71`). The mirror path therefore runs on web too. |
| S16 | Shared harness: `setDoc` never publishes (`44`), `onSnapshot` captures callbacks and honours `immediate | withheld | delayed` (`46-54`), `deliverSnapshot` accepts arbitrary doc data (`67-70`), `forgetRemoteDoc` (`73-75`), `settlePendingReads` (`80-81`). `firestoreModule.setDoc` is reachable for call-count assertions. | `tests/regression/helpers/offline-firestore-harness.ts` |
| S17 | Unit tests asserting the **exact** `setDoc` payload (will fail when a watermark field is added): trip `132-135`, `212-215`, `243-246`; staple `127-130`, `141-144`, `166-169`; area `113-116`; section-order `121-124`. | `src/adapters/firestore/*.test.ts` |
| S18 | Tests that deliver **unstamped** server data and expect it to replace the mirror: `tests/regression/firestore-trip-offline-cold-start.test.ts:185-210`, `275-294`; `tests/regression/firestore-offline-cold-start-mirror.test.ts:193-214` (staples), `392-411` (areas), `592-611` (section order); unit tests using `simulateRemoteSnapshot(path, { trip })` e.g. trip `274-290`, `328-341`. |
| S19 | No test reads or writes `firestore-cache:*` keys directly (`grep -rln firestore-cache src tests` → the four adapters only). Unit tests clear the mock between cases (`AsyncStorage.clear()`, trip test `96`). `migration.test.ts` exercises ports only. |
| S20 | Unit-test Firestore mocks: `mockSetDoc` **publishes** to `mockStore` (trip test `14-16`), `onSnapshot` fires immediately from `mockStore` (`20-31`); snapshot objects have `exists`/`data` only — no `metadata`. |
| S21 | Section-order adapter is created without options (no `onChange`) in production. | `src/hooks/useAppInitialization.ts:308` |
| S22 | No UUID source: no `uuid`/`expo-crypto`/`react-native-get-random-values` in `package.json`; SDK `_AutoId` is excluded from public typings (`index.d.ts:142`); the domain generates ids as `Date.now() + Math.random()` (`src/domain/staple-library.ts:27-28`). |
| S23 | Brief's Real-Time Sync Pattern step 5 defines own-write echo detection as serialized-content comparison; step 7 defines the mirror as a value cache. | `docs/product/architecture/brief.md:159-167` |
| S24 | *Evolution* D4 (line 49): "Only a snapshot that carries data disarms the guard; local writes never touch it." §8.1 (line 115): user-approved sketch `{ value, writtenAt }` + `updatedAt: serverTimestamp()`. |

---

## 3. Precise reproduction (design question 1)

Sequence, using the trip adapter as the reference; the other adapters differ only in line numbers.

| Step | Session | What happens | Evidence |
|------|---------|--------------|----------|
| 1 | 1 (offline) | `saveTrip(T1)` → `commitLocalTripChange`: cache = T1; `setDoc({ trip: T1 })` queued in `MemoryMutationQueue`; mirror ← `JSON.stringify(T1)` under `firestore-cache:v1:{uid}:trip`. | trip `143-147`, `48`, `62`; S10 |
| 2 | — | Process killed. Mutation queue gone. Mirror holds T1. Server holds T0 (older). | S10 |
| 3 | 2 | `initialize()`: mirror read → `cachedTrip = T1`, `isTripInitialized = true`, `tripHydratedFromLocal = true`; both mirrors present → `initialize()` resolves immediately (F3) and the UI renders T1. | trip `214-227`, `238`, `265` |
| 4 | 2 | First snapshot: `exists()=true`, `data() = { trip: T0 }`. `incomingTrip = T0 ≠ null` → guard at 169 does **not** fire. `serializeTrip(T0) !== serializeTrip(T1)` → `cachedTrip = T0`; `tripHydratedFromLocal = false`; **`mirrorTripToAsyncStorage(uid, T0)`**; `onChange()` → domain reloads T0. | trip `169-185` |
| 5 | 2 | T1 no longer exists anywhere: not in memory, not on disk (mirror overwritten in step 4), not on the server (the mutation died in step 2). | — |

**Which adapters mirror the server value back on adoption (so the edit is gone from disk too):** all of them — trip `182`, carryover `204`, staples `123`, areas `148`, section order `155`. Carryover is the most aggressive: it has no echo compare, so it re-mirrors on every existing-document snapshot (S2).

Equivalent lines for the other adapters: staples `100-125` (adopt at `118-123`), areas `124-151` (adopt at `143-148`), section order `134-158` (adopt at `150-155`).

---

## 4. Five Whys

Branches A and B are independent root causes (ordering; replay). Branch C is followed to depth 5 because it is the reason the loss is *irrecoverable*, but it resolves to A and is recorded as a contributing factor, not a third root cause.

```
PROBLEM: An offline edit written to the mirror in session 1 is silently replaced,
         in memory and on disk, by an OLDER server document on the next cold start.

WHY 1A: The first data-bearing snapshot after hydration replaces the mirrored
        value even when the server document is older than the mirrored edit.
        [S1-S5: adoption is gated on `incoming !== null` and on content
         inequality only]
  WHY 2A: The handlers have no recency signal to consult: neither the Firestore
          document nor the mirror carries any write ordering — both hold the
          value alone.
          [S7 raw mirror values; S9 setDoc payloads carry no timestamp; the
           domain has createdAt only (types.ts:18,69)]
    WHY 3A: "Different from cache" is therefore the only available signal, and
            the pattern deliberately treats it as "server is authoritative":
            the guard stands down and the server value is re-mirrored so that
            the NEXT cold start recovers the server-authoritative value.
            [trip 178-183 comment "authoritative for the rest of this
             session"; regression tests at S18 pin this behaviour]
      WHY 4A: That rule was designed for the in-process case, where it is
              correct: a local setDoc overlays every later snapshot for that
              doc with hasPendingWrites until acked, so within one process the
              SDK never delivers a document older than the last local write.
              Across a process restart on RN the overlay is gone with the
              memory-only queue, and the invariant "any data-bearing snapshot
              is at least as new as my last write" silently stops holding.
              [prior-RCA E24 (overlay), S10 (MemoryMutationQueue),
               brief.md:159-163 steps 4-5 define echo detection by content]
        WHY 5A: The sync pattern has no notion of WRITE ORDER that survives a
                process boundary. The AsyncStorage mirror added durability of
                the VALUE (step 7) without the ordering metadata that
                durability requires to be compared against the server.
                [S23 brief step 7 "mirror"; S24 D4 scopes the guard to
                 presence/absence only]
        -> ROOT CAUSE A: The mirror is a value cache, not a write record: no
           per-document write watermark exists on either side, so the adapter
           cannot distinguish "server is newer" from "server is older".
        -> SOLUTION A: Stamp every local write with a client-generated,
           monotonic `writtenAt`, persist it on the document AND in the mirror,
           and gate adoption on `server.writtenAt >= mirror.writtenAt` (§6).

WHY 1B: Even where adoption could be skipped, the server never receives the
        offline edit: nothing re-submits it after the restart.
        [S10; harness models exactly this at offline-firestore-harness.ts:42-44]
  WHY 2B: Writes are fire-and-forget: setDoc's promise is discarded and no
          acknowledgement is tracked, so the adapter cannot know whether a
          mirrored value ever reached the server.
          [trip 48, 56; staple 44; area 50; section-order 56;
           brief.md:162 step 4 "fire-and-forget (unchanged)"]
    WHY 3B: The mirror is written unconditionally on both local writes AND on
            server adoption (S1-S5), so it cannot represent "locally dirty,
            not yet acknowledged" — the state a replay would need.
            [trip 146 vs 182; staple 88 vs 123; area 114 vs 148; s-o 123 vs 155]
      WHY 4B: The design delegated queueing/replay entirely to the SDK on the
              assumption that the SDK queue is durable. That holds on web
              (persistentLocalCache, IndexedDB) and fails on RN, and the
              adapters contain no platform branch to compensate.
              [S15; firebase-config.ts:55-66 comment states the mirror
               "compensates" but only for reads]
        WHY 5B: The platform asymmetry in SDK durability was propagated into
                the READ path (mirror hydration) but never into the WRITE path
                (replay). The adapter contract is identical on both platforms.
        -> ROOT CAUSE B: No durable record of un-acknowledged local writes on
           RN; the mirror cannot be replayed because it cannot tell pending
           from confirmed.
        -> SOLUTION B: The same watermark makes the mirror replayable without a
           dirty flag: "mirror newer than server" is exactly "un-acknowledged
           local write"; re-push the mirror with its own watermark (§6.4).

WHY 1C: The loss is silent and irrecoverable — the user sees T0 and has no
        copy of T1 anywhere.
        [step 4-5 in §3; onChange fires so the domain re-renders T0]
  WHY 2C: Adoption overwrites the mirror in place (single slot per document).
          [trip 182, 204; staple 123; area 148; s-o 155]
    WHY 3C: Re-mirroring on adoption is REQUIRED for F1 correctness — the next
            cold start must recover the server-authoritative value, not a
            stale mirror (regression tests at S18 assert exactly this).
      WHY 4C: A single slot is sufficient only if adoption is always correct;
              there is no adoption precondition other than "data-bearing", so
              the slot is overwritten in the one case (older server) where it
              held the only surviving copy.
        WHY 5C: Same fundamental cause as A — adoption is not recency-gated.
                A two-slot or journal design is NOT needed once adoption is
                gated: the overwrite only happens when the server is provably
                at least as new.
        -> ROOT CAUSE C: Contributing, not independent: the single-slot mirror
           turns a wrong adoption into an unrecoverable one.
        -> SOLUTION C: Covered by Solution A; explicitly reject a journal.
```

**Completeness check at each level.** Also considered and excluded: (i) the F3 early render — the adoption path (step 4) is identical whether `initialize()` resolved from the mirror or awaited the snapshot, so F3 changes *when* the user sees T1, not whether T1 survives; (ii) the D4 disarm rule — a data-bearing snapshot disarming the empty-snapshot guard is correct and orthogonal (§6.7); (iii) `onChange` not wired for section order (S21) — affects UI refresh, not data survival; (iv) migration (`migrateTripIfNeeded`, `migration.ts:41-54`) — runs only when `loadTrip()` is null, which the mirror prevents; unrelated.

---

## 5. Validation

**Backwards chain.** If no write watermark exists on either side (A) → the adapter can only compare content → an older-but-different server doc is adopted → mirror overwritten (C) → and since nothing replays the mirror (B), the edit is gone from all three stores. Reproduces §3 exactly.

**Cross-validation.** A and B are consistent and share one fix (a watermark both gates adoption and identifies what to replay). C is a consequence of A. No contradiction with *prior-RCA* Branch C or with D4: in-process, the SDK overlay already guarantees `server.writtenAt >= mirror.writtenAt` for own writes, so the new check is a no-op there.

**All symptoms explained.** Memory loss (A), disk loss (C), server never updated (B), silence (`onChange` fires, no error path) — yes.

---

## 6. Design

### 6.1 Ordering scheme — evaluation (design question 2)

| Option | Same clock on both sides? | Under `hasPendingWrites` | Loop-safe on own echo? | Verdict |
|--------|---------------------------|--------------------------|------------------------|---------|
| (a) `updatedAt: serverTimestamp()` on the doc vs client `writtenAt` in the mirror (the §8.1 sketch) | **No.** Server clock vs device clock. | `data()` returns **`null`** for the pending field (S11 default `'none'`); `'estimate'` returns the *client* write time, i.e. the same clock as the mirror — but only until ack, after which it flips to server time. | **No.** If the device clock is ahead of the server by more than the write RTT, the acked `updatedAt` is *less than* `writtenAt` → "server older" → re-push → new ack still older → **unbounded write loop**, one network write per iteration. Needs extra state ("expected echo") to break. | Reject |
| (b) Per-write UUID echoed back from the doc | Clock-free | Exact echo detection | Yes | Gives *identity* but **no order**: `server.writeId !== mirror.writeId` says "different", not "older". Needs an ordering key anyway. Also no UUID source on RN (S22). Reject as sole scheme |
| (c) **Client-generated `writtenAt` (ms) stored as a plain number on the doc AND in the mirror, generated as a hybrid logical clock: `writtenAt = max(Date.now(), lastSeenWrittenAt + 1)`** | **Yes, by construction**: the doc's watermark is whatever client clock stamped it; the mirror's is the same value. The server clock is never involved. | The pending overlay carries the plain number unchanged. | **Yes.** Own echo carries exactly `mirror.writtenAt` → `>=` → adopt → content equal → no-op. Ack changes no bytes → no event at all (S12). | **Recommend** |

**Simpler schemes considered and rejected.**
- *Snapshot metadata alone (`hasPendingWrites` / `fromCache`, S13).* Both describe the *current process's* SDK state. After a process kill the overlay is gone, so the older server doc arrives with `hasPendingWrites=false` and (once connected) `fromCache=false` — indistinguishable from a legitimately newer doc written by another device. Metadata carries no information about session 1. Insufficient as a sole scheme; not needed alongside (c) either, because (c) never has to know whether a snapshot is an overlay.
- *Option (a) rescued by `serverTimestamps: 'estimate'`.* Under `'estimate'` the pending field reads as the client write time (S11 `20888-20889`, which is `Timestamp.now()` = `Date.now()`, S11 `1275-1281`), so the *echo* would compare on the same clock. But the moment the write is acked, the same field flips to the server's clock (the sentinel is replaced by the real `timestampValue`), and the ack is delivered as a Modified doc change because the bytes differ. If the device clock is ahead of the server by more than the RTT, that acked value is `< mirror.writtenAt` → re-push → the loop of §6.1a. `'estimate'` only moves the first comparison, not the second. Rejected.
- *Conditional write / transaction gated on the server's `updatedAt`.* Would need `runTransaction`, which requires the network and so cannot run at the moment the offline edit is made; it also re-introduces the cross-clock comparison. Rejected.

**Why the HLC bump matters.** `lastSeenWrittenAt` is the highest watermark this adapter has observed (from the mirror at hydration, from every adopted server doc, and from its own writes). Bumping past it guarantees that a local edit made *after seeing* a server value is ordered after that value even if this device's clock is behind the device that wrote it. Without the bump, a slow-clock device would lose every edit to a fast-clock device's older doc.

**What (c) cannot handle** — stated, not solved:
1. Two devices editing while *both* are offline and neither has seen the other's write: ordered by their respective wall clocks; if the clocks are skewed, the wrong one may win. This is whole-document LWW with clock-ordered ties, a strict improvement over today's arrival-ordered LWW (*evolution* R2, pre-existing).
2. A device whose clock is far ahead stamps a far-future watermark; every other device that sees it bumps past it (self-healing), but a device that *never* sees it and edits with a true clock loses at its next comparison. Bounded by "one bad-clock device poisons until every device has observed the doc once".
3. Documents without a watermark on either side (legacy docs, old app versions, v1 mirrors) — today's behaviour applies (§6.3, decision D2).

**Answer to the question posed:** comparing `server.updatedAt` (server clock) against `mirror.writtenAt` (device clock) is *not* achievable safely; the fix is to keep the whole comparison on the client clock by writing the client's own stamp to the document. `serverTimestamp()` is not used. (If server-side audit time is ever wanted, it can be added as a *separate* field that never participates in the comparison.)

### 6.2 Adoption rule

On every data-bearing snapshot (`incoming !== null` per each adapter's existing extractor), after the existing absent-snapshot guard and after the existing content-equality short-circuit:

```
serverWrittenAt = data.writtenAt (number | undefined → null)
mirrorWrittenAt = watermark of the value currently in cache (number | null)

if (serverWrittenAt !== null && mirrorWrittenAt !== null && serverWrittenAt < mirrorWrittenAt)
  → REPUSH: keep cache, setDoc({ value: cache, writtenAt: mirrorWrittenAt }), disarm guard, no onChange, return
else
  → ADOPT (today's path): cache = server value, lastSeen = max(lastSeen, serverWrittenAt ?? -∞),
    disarm guard, mirror v2 { value, writtenAt: serverWrittenAt }, onChange
```

Ties (`==`) adopt: a tie is either the own echo (content equal, already short-circuited) or two devices stamping the same millisecond, where "server wins" is the pre-existing LWW.

**Scope of the check.** Applied on every data-bearing snapshot, not only while the hydrated-from-local guard is armed. Rationale: (i) no coupling to guard state; (ii) covers the in-process variant of the same defect (a local write dropped by a rejected mutation, then an older doc from another device); (iii) convergence holds — see §6.4.

### 6.3 Mirror schema migration (design question 3)

**Decision: bump to v2 with a uniform envelope; read v1 as a watermark-less fallback; never write v1 again.**

```
key:   firestore-cache:v2:{uid}:{doc}
value: { "value": <T>, "writtenAt": <number> | null }
```

| Adapter | v2 `value` | v1 fallback reader (unchanged parse, wrapped as `{ value, writtenAt: null }`) |
|---------|------------|------------------------------------------------------------------------------|
| trip | `Trip` | trip `72-80` |
| carryover | `TripItem[]` | trip `82-92` |
| staples | `StapleItem[]` (empty list is a recorded decision, kept) | staple `53-63` |
| areas | `string[]` — **keep the rule that an empty/non-array `value` yields "no usable mirror"** (area `67`) so the defaults fallback stays a genuine-no-data fallback | area `60-72` |
| section order | `string[] \| null` — the v2 envelope's *presence* already distinguishes "no entry" from "mirrored null", so the inner `{ order }` envelope is dropped in v2 | section-order `67-82` still parses `{ order }` for v1 |

**Why not "read v1 and upgrade lazily in place under the same key"?** The reader would have to sniff shape per adapter (raw array vs `{ order }` vs `{ value, writtenAt }`), and for section order `{ order: null }` vs `{ value: null, writtenAt: null }` are both objects — fragile. A separate key makes the v2 reader exact and the v1 reader untouched.

**Why not "bump and ignore v1"?** A user who upgrades and cold-starts on dead wifi would have no mirror → the F1/F3 empty-cache defect returns for one launch. The fallback read costs one extra `getItem` only when v2 is absent.

**Semantics of a missing watermark (either side):** the comparison in §6.2 is skipped → today's behaviour (data-bearing server wins). This makes a v1 mirror, a legacy server doc, and a doc written by an older app version all behave exactly as they do today. The first local write after upgrade produces a v2 mirror; the first *online* write stamps the server doc. Until the doc is stamped, an offline edit + kill + older-server sequence is still vulnerable — this is the residual window, accepted (decision D2).

**v1 key cleanup (definite rule):** `writeMirrorEnvelope` removes the v1 key (`AsyncStorage.removeItem`, fire-and-forget) every time it writes v2. The v1 key therefore disappears on the first local write or first adoption after upgrade, and the fallback read path is exercised at most once per document. Not "optional": leaving v1 in place would let a stale v1 value mask a v2 write failure on a later launch.

### 6.4 Re-push path (design question 4)

Trigger: `serverWrittenAt < mirrorWrittenAt` (both present). Action: `setDoc(docRef, { <value field>: cache, writtenAt: mirrorWrittenAt })` — **re-using** the mirror's watermark, not bumping it. Re-using makes the re-push idempotent (a second re-push writes identical bytes) and keeps the document's stamp equal to when the edit was actually made.

**Cannot loop on its own echo.** After `setDoc`, the SDK overlays the local view with the written data and raises one snapshot with `hasPendingWrites: true` (*prior-RCA* E24). Its `writtenAt` equals `mirrorWrittenAt` → not `<` → ADOPT branch → serialized content equal → return before any write. On ack, the document bytes do not change (plain number, no server transform) → view computes a Metadata-only change → stripped for listeners without `includeMetadataChanges` → no callback at all. There is no path from a re-push back to a `<` comparison for this document unless a genuinely different, lower-stamped write arrives from elsewhere.

SDK excerpts backing this (firebase 12.8.0, `common-cd010f05.rn.js`, verbatim, minified identifiers):

```js
// 16597-16603 — View.computeDocChanges: same bytes → Metadata change, not Modified
if (u && c) {
    u.data.isEqual(c.data) ? l !== h && (n.track({
        type: 3 /* ChangeType.Metadata */ ,
        doc: c
    }), P = !0) : this.su(u, c) || (n.track({
        type: 2 /* ChangeType.Modified */ ,
        doc: c
    }), ...

// 16342-16348 — QueryListener.shouldRaiseEvent: no doc changes and no
// includeMetadataChanges → no event
Ba(e) {
    if (e.docChanges.length > 0) return !0;
    const t = this.Na && this.Na.hasPendingWrites !== e.hasPendingWrites;
    return !(!e.syncStateChanged && !t) && !0 === this.options.includeMetadataChanges;
}
```

The adapters subscribe with `onSnapshot(docRef, callback)` and no options (trip `252`, `258`; staple `153`; area `181`; section-order `187`), so `includeMetadataChanges` is unset. Regression case (d) in §8 additionally exercises the scenario end-to-end through the harness.

**Cannot fight another device.** Watermarks are numbers, so the comparison is a total order with server-wins ties. Let A hold `(W_A, X)` and B hold `(W_B, Y)`, `W_A > W_B`, both re-pushing after cold starts. Whatever order the server applies them, the doc ends as one of the two; A sees `(W_B, Y)` at most transiently and re-pushes once; B sees `(W_A, X)`, `W_A >= W_B` → adopts, re-mirrors, and its `lastSeen` becomes `W_A`. Converged on `X` with at most one extra write per device. A re-push never raises a watermark, so no device can "escalate"; a new watermark is only minted by a user edit, and via the HLC bump it exceeds everything that device has seen. Equal watermarks with different content (same ms on two devices) converge on whichever the server holds — both adopt.

**Interaction with whole-document LWW** (pre-existing, *evolution* R2): unchanged in kind; the fix only changes the tiebreak from "arrived last" to "stamped later". Noted, not solved.

### 6.5 Multi-device semantics (design question 5)

Scenario: A edits online at t=10 (doc `writtenAt=10`). B made an offline edit at t=5 that never synced (mirror `writtenAt=5`), cold-starts at t=20, sees `10 >= 5` → adopts A's doc; B's edit is lost.

**Argued as the intended outcome.** B's edit *was* made earlier; A's edit is the later human intention. Resurrecting B's t=5 state over A's t=10 state would be worse: it would revert a deliberate, already-synced edit with a stale one, and A would experience "my change vanished" with no offline involvement at all. Today's behaviour already loses B's edit — the fix does not make this case worse, it makes the loss *principled* (older loses) instead of arbitrary (server always wins), and it *saves* B's edit in the mirror-newer case (B edits at t=15 → `15 > 10` → re-push). The residual asymmetry — B's edit is discarded rather than merged — is the pre-existing whole-document LWW; field-level merges are the only real refinement and are out of scope.

**No refinement proposed.** Recorded as decision D3 for confirmation.

### 6.6 Web behaviour

Harmless. On web the SDK queue is durable (S15), so after a restart the first snapshot already carries the pending write's overlay with the mirror's own `writtenAt` → `>=` → adopt → content equal → no-op. If another device wrote in between, the SDK applies the pending mutation over it and the server resolves by its own LWW; the adapter observes the final doc and, by the same total order, converges. The v1→v2 mirror migration also runs on web (localStorage) with the same fallback. No platform branch is added.

### 6.7 Disarm rule stays as-is (design question 7)

Confirmed. "Only a data-bearing snapshot disarms the guard; local writes never touch it" (D4) remains the sole rule for the *absent-snapshot* guard. Both branches of §6.2 (ADOPT and REPUSH) disarm, because in both the server has spoken with data and the in-process overlay now protects the cache (*prior-RCA* E24). The watermark decides only *which value* to keep; the guard decides only *whether an absent snapshot may clear the cache*. They read no shared state beyond `cache`.

---

## 7. Proposed fix — per-adapter changes

**Shared pure helpers** (new, functional; suggested `src/adapters/firestore/local-write-watermark.ts`):
- `nextWrittenAt(now: number, lastSeen: number | null): number` — `max(now, (lastSeen ?? -Infinity) + 1)`.
- `resolveAdoption(serverWrittenAt: number | null, mirrorWrittenAt: number | null): 'adopt' | 'repush'`.
- `readMirrorEnvelope<T>(uid, doc, parseV1: (raw) => T | null, validateV2: (unknown) => T | null): Promise<{ value: T; writtenAt: number | null } | null>` — v2 key first, v1 fallback.
- `writeMirrorEnvelope<T>(uid, doc, value: T, writtenAt: number | null): void` — fire-and-forget, removes the v1 key.
- `extractWrittenAt(data: Record<string, unknown> | undefined): number | null`.

These are adapter-layer helpers (not domain), so they fall outside the Stryker scope per `CLAUDE.md`; unit-test them directly (`src/adapters/firestore/local-write-watermark.test.ts`):

| Helper | Case | Expect |
|--------|------|--------|
| `nextWrittenAt(now, lastSeen)` | `lastSeen = null` | `now` |
| | `lastSeen < now` | `now` |
| | `lastSeen >= now` (clock behind, or same ms) | `lastSeen + 1` |
| `resolveAdoption(server, mirror)` | `(null, null)`, `(null, 5)`, `(5, null)` | `'adopt'` (no comparison) |
| | `(5, 5)`, `(6, 5)` | `'adopt'` |
| | `(4, 5)` | `'repush'` |
| `extractWrittenAt(data)` | `undefined`, `{}`, `{ writtenAt: 'x' }`, `{ writtenAt: NaN }` | `null` |
| | `{ writtenAt: 42 }` | `42` |
| `readMirrorEnvelope` | v2 present | v2 value + stamp, v1 ignored even if present |
| | v2 absent, v1 present (per adapter: raw trip, raw array, area `[]` → null, section-order `{ order: null }`) | `{ value, writtenAt: null }`; area `[]` → `null`; section-order → `{ value: null, writtenAt: null }` |
| | v2 present with `{ value: null, writtenAt: 7 }` (section order) | `{ value: null, writtenAt: 7 }` — a present envelope, not "no entry" |
| | v2 unparseable | falls through to v1, then `null` |
| `writeMirrorEnvelope` | any write | `setItem(v2Key, JSON)` and `removeItem(v1Key)` both called |

| Adapter | Change | Lines today |
|---------|--------|-------------|
| **trip** | Key builders → v2 (+ v1 fallback in reader) | `37-41` |
| | `persistTripInBackground` / `persistCarryoverInBackground` take `writtenAt`; payloads `{ trip, writtenAt }`, `{ items, writtenAt }` | `43-57` |
| | Mirror writers/readers → envelope helpers (trip and carryover separately) | `59-92` |
| | Closure state: `tripWrittenAt`, `carryoverWrittenAt` (watermark of the cached value; `null` when unknown) | after `139-140` |
| | `commitLocalTripChange` / `commitLocalCarryoverChange`: `writtenAt = nextWrittenAt(Date.now(), <doc>WrittenAt)`; store; pass to persist + mirror | `143-153` |
| | `handleTripSnapshot`: extract `writtenAt`; after guard `169-171` and content compare `173-176`, apply §6.2; on ADOPT set `tripWrittenAt = serverWrittenAt` and mirror v2; on REPUSH `setDoc` with `cachedTrip` + `tripWrittenAt`, `tripHydratedFromLocal = false`, return | `155-186` |
| | `handleCarryoverSnapshot`: same; add a content-equality short-circuit before the watermark check (today it re-mirrors unconditionally) | `188-206` |
| | Hydration: read envelopes, set `tripWrittenAt` / `carryoverWrittenAt` from them | `214-227` |
| **staples** | Key `36-37`; persist `39-45` → `{ items, writtenAt }`; mirror `47-63` → envelope; state + `commitLocalChange` `85-89`; `handleSnapshot`: after guard `100-102`, init `106-111`, echo `114-116`, insert §6.2 before `118`; ADOPT at `118-125` re-mirrors with server watermark; hydration `134-139` | as listed |
| **areas** | Key `42-43`; persist `45-51` → `{ items: areas, writtenAt }`; mirror `53-72` → envelope, keeping the empty/non-array → null rule; `commitLocalChange` `111-115`; `handleSnapshot`: after `124-126`, `131-136`, `139-141`, insert §6.2 before `143`; hydration `161-166` | as listed |
| **section order** | Type `39-41` retired for v2 (kept for v1 parse); key `48-49`; persist `51-57` → `{ order, writtenAt }`; mirror `59-82` → envelope with `value: string[] \| null`; `commitLocalChange` `120-125`; `handleSnapshot`: after `134-136`, `138-143`, `146-148`, insert §6.2 before `150`; hydration `168-173`. Note: a remote **clear** (`order: null`) is still "silence" per `extractIncomingOrder` `87-93` and never reaches the watermark check — unchanged, pre-existing | as listed |
| **brief.md** | Extend Real-Time Sync Pattern with step 8: local-write watermark, v2 envelope, adoption rule, re-push | `docs/product/architecture/brief.md:159-170` |

Type note: the snapshot `data()` casts in each handler (`{ trip: Trip }` etc.) widen to `{ trip: Trip; writtenAt?: number }`; `extractWrittenAt` tolerates absence and non-numbers (→ `null`).

---

## 8. Files affected

**Production**
- `src/adapters/firestore/firestore-trip-storage.ts`
- `src/adapters/firestore/firestore-staple-storage.ts`
- `src/adapters/firestore/firestore-area-storage.ts`
- `src/adapters/firestore/firestore-section-order-storage.ts`
- `src/adapters/firestore/local-write-watermark.ts` (new)
- `docs/product/architecture/brief.md` (pattern step 8)

**Existing tests that break and why** (design question 6)
- Exact `setDoc` payload assertions (S17): trip test `132-135`, `212-215`, `243-246`; staple `127-130`, `141-144`, `166-169`; area `113-116`; section-order `121-124` → add `writtenAt: expect.any(Number)` (preferred over `objectContaining`, so an accidental extra field still fails).
- Under the recommended missing-watermark rule (§6.3), **no** other existing test breaks (every S18 range was read in full — each delivers server data without a `writtenAt` field): the unstamped-server-wins tests (S18) exercise exactly the "no watermark on the server side → today's behaviour" path; no test inspects mirror keys (S19); `migration.test.ts` is port-level; the unit-test mocks publish writes to `mockStore` (S20), so their echo tests receive the stamped doc back and hit the equal-content short-circuit. Under the *alternative* rule ("missing server watermark → mirror wins") all S18 tests would fail and the trip echo test at `274-290` would issue an extra `setDoc` — a further reason to reject that alternative.
- Section-order regression `503-512` and `534-551` (mirrored cleared order) pass provided the v2 reader treats `{ value: null, writtenAt }` as a present envelope.

**New regression tests** — `tests/regression/firestore-stale-server-watermark.test.ts`, shared harness, assertions through the port surface only. The harness needs no change: `deliverSnapshot` accepts `{ trip, writtenAt }` as-is, and `firestoreModule.setDoc` is a `jest.fn` for call counting. Run each case for all five documents (trip, carryover, staples, areas, section order) via `describe.each` over adapter factories.

| Case | Setup | Assert |
|------|-------|--------|
| (a) offline edit survives an older data-bearing snapshot and is re-pushed | adapter A: save V0 then edit to V1 (mirror stamped W1 ≥ `Date.now()` at edit); `setSnapshotMode('delayed')`; adapter B, `settlePendingReads()`; `deliverSnapshot(path, { <field>: V0, writtenAt: 1 })` | `B.load*()` equals V1; `onChange` not called; exactly one additional `setDoc` with `{ <field>: V1, writtenAt: <B's mirror stamp> }` (use `expect.any(Number)` and check it equals the stamp of A's last `setDoc` call); after `setSnapshotMode('immediate')` + `forgetRemoteDoc`, adapter C hydrates V1 |
| (b) a newer server snapshot still wins | as (a) but `deliverSnapshot(path, { <field>: V2, writtenAt: Date.now() + 1e6 })` | `B.load*()` equals V2; `onChange` called once; no `setDoc` from B; adapter C hydrates V2 |
| (c) a v1 mirror without watermark behaves as today | seed `AsyncStorage.setItem('firestore-cache:v1:{uid}:{doc}', <v1 shape>)` directly (the one place a test must touch a key — it is simulating a pre-upgrade device); adapter B under `delayed`; deliver older-looking `{ <field>: V0, writtenAt: 1 }` and, in a second case, an unstamped `{ <field>: V0 }` | `B.load*()` equals V0 in both; no `setDoc`; adapter C hydrates V0 (mirror migrated to v2 on adoption) |
| (d) re-push does not loop on its own echo | after (a)'s re-push, deliver the echo `{ <field>: V1, writtenAt: <same stamp> }` twice, then an absent snapshot | `setDoc` call count unchanged after the echoes; `onChange` still not called; `B.load*()` still V1 after the echoes; the absent snapshot after a data-bearing one is honoured (guard disarmed) — for trip `loadTrip()` becomes null, matching today's `firestore-trip-offline-cold-start.test.ts:199-202` |
| (e) section order: a cleared order survives the v2 envelope | adapter A: `saveOrder(O)` then `clearOrder()` (mirror v2 `{ value: null, writtenAt: W }`); adapter B under `withheld` | `initialize()` resolves (envelope present); `loadOrder()` is `null`; then under `delayed` deliver `{ order: O, writtenAt: 1 }` → still `null` and one re-push `{ order: null, writtenAt: W }` (a clear is a stamped decision and beats an older server order). Extends `firestore-offline-cold-start-mirror.test.ts:503-512`, `534-551` |

Plus unit tests for `local-write-watermark.ts`: `nextWrittenAt` monotonicity (`lastSeen` ahead of `now`), `resolveAdoption` truth table including both-null / one-null, v2 read with v1 fallback per adapter shape (area empty-array → null; section-order `{ order: null }` v1 → `{ value: null, writtenAt: null }`).

---

## 9. Risk assessment

| # | Risk | Likelihood | Impact | Mitigation / status |
|---|------|-----------|--------|---------------------|
| R1 | Device clock skew between two devices (§6.1 limitation 1) | Low (phones NTP-sync) | Medium (wrong edit wins in a both-offline race) | HLC bump orders any edit made after observing the other device's write; residual is the pre-existing LWW race. Accepted. |
| R2 | One device with a far-future clock (limitation 2) | Very low | Medium, self-healing | Every device that sees the doc bumps past it; document why in the helper. Accepted. |
| R3 | Web | — | None | §6.6: overlay carries the mirror stamp; migration identical; no platform branch. |
| R4 | v1 → v2 migration on a dead-wifi cold start | Medium (any upgrade) | High if v1 were ignored | v1 fallback read keeps F1/F3 intact for the upgrade launch. |
| R5 | Residual window: server doc never stamped since upgrade, then offline edit + kill + older server | Low, shrinks to zero after the first online write per doc | High (same as today) | Accepted by D2; alternative rule would fight older app versions and break S18 tests. |
| R6 | Mixed app versions on the user's devices | Transient | None new | Old version writes unstamped docs → treated as "unknown" → today's behaviour. No fight because the new version only re-pushes when the server stamp is *present and lower*. |
| R7 | Write amplification from re-push | — | Negligible | At most one write per document per cold start; idempotent bytes. |
| R8 | Security rules | — | None | Path/uid-only rules (S14). |
| R9 | Existing tests | Certain | Low | 8 assertions to update (S17); nothing else under the recommended D2. |
| R10 | Section-order envelope change | Low | Medium (cleared order resurrected) if v2 reader mis-handles `value: null` | Explicit unit test for `{ value: null, writtenAt }` → present envelope; regression `503-512` / `534-551` remain as guards. |

Overall risk: **Low–medium**, dominated by the schema migration (R4/R10), both covered by tests.

---

## 10. Design decisions for the user (max 3)

**D1 — Ordering scheme.** Client-generated hybrid-logical-clock `writtenAt` (plain number) stored on the Firestore document and in the mirror; no `serverTimestamp()`; comparison applied on every data-bearing snapshot with server-wins ties. Rejects the §8.1 sketch's `updatedAt: serverTimestamp()` because it mixes clocks and can loop under skew (§6.1a). *Confirm.*

**D2 — Mirror schema v2 and the missing-watermark rule.** (i) New key `firestore-cache:v2:{uid}:{doc}` with a uniform `{ value, writtenAt }` envelope for all five documents (section order drops its inner `{ order }` wrapper); v1 is read as a watermark-less fallback and its key is deleted on the first v2 write (§6.3). (ii) A missing watermark on *either* side means "no comparison → today's behaviour (server wins)". Keeps v1 mirrors, legacy docs and older app versions behaving exactly as now; accepts the residual window in R5 until each document's first online write after upgrade. The alternative ("missing server stamp → mirror wins") closes that window but fights older app versions and breaks the S18 tests. *Confirm both parts.*

**D3 — Multi-device: an older offline edit loses to a newer online edit from another device** (§6.5). Accepted as the correct extension of whole-document LWW; no refinement proposed. *Confirm.*

---

## 11. Solutions mapped to root causes

| Root cause | Permanent fix | Type | Early detection |
|-----------|---------------|------|-----------------|
| A — no write order across process boundary | HLC `writtenAt` on doc + mirror v2; recency-gated adoption (§6.1–6.3) | Permanent | Regression (a), (b), (c) |
| B — un-acked local writes not replayable on RN | Re-push mirror when newer than server (§6.4) | Permanent | Regression (a), (d) |
| C — single-slot mirror makes wrong adoption irrecoverable | Resolved by gating (no journal) | Permanent via A | Regression (a): adapter C hydrates the edit |

No immediate mitigation exists short of the fix; the defect requires a process kill while offline, which is not user-controllable. Prevention for the systemic factor (WHY 5B: platform asymmetry not propagated to the write path): record in `brief.md` step 8 that on RN the mirror is the *only* durable record of a local write, so any future change to the write path must preserve the watermark.
