# Evolution — fix-offline-edit-stale-server

**Feature ID**: fix-offline-edit-stale-server
**Date**: 2026-09-14
**Type**: BUGFIX (`/nw-bugfix` → `/nw-deliver`)
**Finishes**: `fix-slow-render-flaky-network` (same day) — §8 follow-up 1 (R7, local-write watermark)
**Status**: SHIPPED
**Paradigm**: Functional TypeScript (per CLAUDE.md)
**Density**: lean

---

## 1. Summary

**Problem**: on React Native, an edit made while offline in session 1 goes to the in-memory Firestore mutation queue and to the AsyncStorage mirror. Kill the process before the queue drains and the mutation is gone; the mirror still holds the edit. On the next cold start the adapter hydrates from the mirror, subscribes, and — if the first data-bearing snapshot carries an *older* server document — adopts it, disarms the hydrated-from-local guard, **overwrites the mirror with the older value**, and fires `onChange`. The edit is lost from memory, from disk and from the server, silently. Reproduced step by step in the RCA (§3) against the trip adapter; the other four documents differ only in line numbers.

**Root cause A — the mirror was a value cache with no write ordering.** Neither the Firestore document nor the mirror carried any recency signal (`setDoc` payloads were `{ trip }`, `{ items }`, `{ order }`; the domain has `createdAt` only). "Different from cache" was therefore the only available signal, and the sync pattern deliberately read it as "server is authoritative". That rule is correct *in-process*: a local `setDoc` overlays every later snapshot with `hasPendingWrites`, so the SDK never delivers a doc older than the last local write. Across a process restart on RN the overlay dies with `MemoryMutationQueue`, and the invariant "any data-bearing snapshot is at least as new as my last write" silently stops holding.

**Root cause B — un-acknowledged local writes are not replayable on RN.** Writes are fire-and-forget and the mirror is written on both local writes *and* server adoption, so it cannot represent "locally dirty". The platform asymmetry in SDK durability had been propagated into the read path (mirror hydration, `fix-offline-staple-cache-wipe`) but never into the write path.

**Contributing C — the single-slot mirror turns a wrong adoption into an unrecoverable one.** Re-mirroring on adoption is required for F1 correctness; it is only harmful because adoption had no precondition beyond "data-bearing". Resolved by gating A; a journal was explicitly rejected.

**Solution**: stamp every local write with a client-generated hybrid-logical-clock `writtenAt`, persist it on the document *and* in a v2 mirror envelope, and gate adoption on it. "Mirror newer than server" is exactly "un-acknowledged local write", so the same stamp closes B by re-pushing the mirror — no dirty flag, no journal.

---

## 2. Scope Decision

User approved the RCA's three decisions verbatim (§3 below). Deliberately excluded:

- **Auth-gate additivity** (`App.tsx`, `useAppInitialization.ts`) — unchanged from the prior fix; out of scope.
- **Field-level merges** — the only real refinement of whole-document LWW; noted in D3, not attempted.
- **Web `persistentLocalCache` path** — harmless per RCA §6.6 (the durable SDK queue replays the pending write carrying the mirror's own stamp; the v1→v2 mirror migration runs identically on `localStorage`). No platform branch added.
- **Wiring `onChange` for the section-order adapter in production** (RCA S21) — UI refresh only.
- **Whole-document LWW** — pre-existing; the fix changes the tiebreak from "arrived last" to "stamped later", nothing more.

---

## 3. Key Decisions

**D1 — Ordering scheme: client HLC `writtenAt` on document and mirror; `serverTimestamp()` rejected.** The prior evolution doc's §8.1 sketch (`updatedAt: serverTimestamp()` on the doc vs. client `writtenAt` in the mirror) was re-examined against the SDK and rejected on two counts: (i) under a pending write, `snapshot.data()` returns **`null`** for the field (default `serverTimestamps: 'none'`); `'estimate'` only moves the first comparison — on ack the field flips to the server clock; (ii) mixing server and device clocks means a device ahead of the server by more than the write RTT sees its own acked write as "older", re-pushes, and loops without bound. The shipped stamp is a plain ms number, `writtenAt = max(Date.now(), lastSeen + 1)`, so both sides are always compared on the client clock and the server clock never participates. The HLC bump orders any edit made *after observing* another device's write strictly after it, even on a slow-clock device. Per-write UUIDs (identity without order; no UUID source on RN) and snapshot metadata alone (`hasPendingWrites`/`fromCache` describe this process only) were also rejected.

**Adoption rule** (applied on every data-bearing snapshot, after the existing absent-snapshot guard and the existing content-equality short-circuit): adopt **unless** both stamps are present and the server's is strictly older, in which case keep the cache and re-push it with the mirror's own stamp — re-used, not bumped, so a second re-push writes identical bytes. Ties adopt (own echo, or two devices in the same ms → pre-existing server-wins). A missing stamp on either side adopts (D2 ii).

**D2 — Mirror schema v2 and the missing-watermark rule.** (i) New key `firestore-cache:v2:{uid}:{doc}` with a uniform `{ value, writtenAt }` envelope for all five documents; section order drops its inner `{ order }` wrapper because the v2 envelope's *presence* already distinguishes "no entry" from "mirrored null". v1 is read as a watermark-less fallback and the v1 key is removed on every v2 write (a stale v1 value must never mask a failed v2 write on a later launch). Lazy in-place upgrade under the v1 key was rejected — the reader would have to sniff shape per adapter, and for section order `{ order: null }` vs `{ value: null, writtenAt: null }` are both objects. (ii) A missing stamp on *either* side means no comparison → today's behaviour. Keeps v1 mirrors, legacy server docs and older app versions behaving exactly as before, at the cost of the R5 residual window.

**D3 — Multi-device: an older offline edit loses to a newer online edit from another device.** B edits offline at t=5 and never syncs; A edits online at t=10; B cold-starts and sees `10 >= 5` → adopts A. Argued as the intended outcome: A's is the later human intention, and resurrecting B's state would revert a deliberate, already-synced edit with no offline involvement on A's side. Today's behaviour already loses B's edit; the fix makes the loss principled (older loses) rather than arbitrary (server always wins), and *saves* B's edit in the mirror-newer case. Accepted as the correct extension of whole-document LWW.

**D4 — Two stamps per document: `DocumentWatermark { cachedValueWrittenAt, highestObservedWrittenAt }`.** The RCA §7 shorthand had one closure value per document; §6.2 needed two. `cachedValueWrittenAt` is the comparison key — the stamp of the value currently in cache, `null` after hydrating a v1 mirror or adopting an unstamped doc. `highestObservedWrittenAt` is the HLC floor for the next local stamp — the highest stamp ever seen, **never lowered** by adopting an unstamped document. One transition, `observeStamp`, serves hydration, local writes and adoption alike.

**D5 — Loop safety, argued from the SDK and pinned by regression case (d).** After a re-push, the SDK raises one overlay snapshot carrying exactly `mirror.writtenAt` → not `<` → ADOPT branch → content equal → return before any write. On ack the document bytes do not change (plain number, no server transform), so `View.computeDocChanges` records a Metadata-only change, which `QueryListener.shouldRaiseEvent` strips for listeners without `includeMetadataChanges` — the adapters pass no options. Two devices re-pushing against each other converge on the higher stamp with at most one extra write per device; a re-push never mints a new stamp, so no device can escalate.

**D6 — The D4 disarm rule from `fix-slow-render-flaky-network` is unchanged.** Both ADOPT and REPUSH stand the absent-snapshot guard down, because in both the server has spoken with data and the in-process overlay now protects the cache. The watermark decides *which value* to keep; the guard decides *whether an absent snapshot may clear the cache*. The carryover handler additionally gained the content-equality short-circuit it never had (it used to re-mirror on every existing-document snapshot).

---

## 4. Implementation

| Step | Commit | Change |
|---|---|---|
| 01-01 | `b4cd227` | New `src/adapters/firestore/local-write-watermark.ts`: `nextWrittenAt(now, lastSeen)` with the clock injected; `resolveAdoption` → `'adopt' \| 'repush'`; `extractWrittenAt` (finite numbers only); v1/v2 key builders over `MirrorDocName`; `readMirrorEnvelope` (v2 first, v1 fallback wrapped as `{ value, writtenAt: null }`); `writeMirrorEnvelope` (fire-and-forget `setItem` v2 + `removeItem` v1). Functions only, imports none of the adapters. +41 tests. |
| 02-01 | `000b14c` | `firestore-trip-storage.ts`: stamped `setDoc` payloads `{ trip, writtenAt }` / `{ items, writtenAt }`; v2 hydration with v1 fallback for both documents; ADOPT/REPUSH split in both handlers; carryover content-equality short-circuit. New `tests/regression/firestore-stale-server-watermark.test.ts` with the `describe.each` row table (trip, carryover rows). Three trip unit-test payload literals repaired. |
| 02-02 | `cb4bfff` | Same shape in `firestore-staple-storage.ts`, `firestore-area-storage.ts`, `firestore-section-order-storage.ts`; section-order v2 value is bare `string[] \| null`, v1 `{ order }` parsed by its own `parseV1Mirror`; area rule (empty/non-array → no usable mirror) applied to v1 and v2 alike. Three rows appended, case (e) added. Six unit-test payload literals repaired. `DocumentWatermark`, `UNSTAMPED`, `observeStamp`, `rePushStamp` lifted from the trip adapter into the helper. `docs/product/architecture/brief.md` step 8 (§7 below). |
| refactor | `72299e6` | L3: `mintLocalStamp(watermark)` (the one `Date.now()` call) and `buildRawJsonV1Parser(isValue)` moved into the helper; the four adapters' hand-rolled v1 parsers and stamp mints deleted. -64/+44, assertions unchanged. |

Production diff: 4 adapters + 1 new helper module in `src/adapters/firestore/`, plus `brief.md`; no port, hook, domain or `App.tsx` change. `InitializableStorage.initialize` and the mirror-first readiness predicate keep their meaning (an envelope from either key counts as "mirror yielded an entry"; the trip predicate stays compound).

**Deviations from the roadmap** (all recorded during delivery; none changes the design):

1. **Nine payload literals repaired, not eight.** RCA S17 listed five for 02-02; the section-order unit test carried a second exact literal (`{ order: null }` at 133-136, the clear path) that the RCA grep missed. Repair form was the exact literal + `writtenAt: expect.any(Number)` throughout, never `objectContaining`.
2. **Helper signatures.** `ParseV1<T>` returns `{ value: T } | null` (wrapped) and `ValidateV2<T>` is a type predicate rather than the RCA's `T | null` shape — both because section order's `T` is `string[] | null`, so a bare `null` return could not distinguish "mirrored clear" from "nothing usable".
3. **`DocumentWatermark` lifted into the helper in 02-02** rather than living in each adapter — orchestrator-approved extension of the step so the three F1 adapters did not copy the two-stamp state four times over.

---

## 5. Test Strategy

1. **Exhaustive matrices instead of PBT** (01-01). `fast-check` is not a dependency and was not added; each invariant is a `test.each` over the full input partition: `nextWrittenAt` over null/behind/equal/ahead plus a fold over the clock sequence `[100, 100, 50, 200, 150]` asserting strictly increasing stamps; `resolveAdoption` over present/missing × older/equal/newer; `extractWrittenAt` over `undefined`, `{}`, string, `NaN`, non-finite, number; key builders for all five documents; `readMirrorEnvelope` v1 fallback per adapter shape (raw trip, raw arrays, area `[]` → `null`, section-order `{ order: null }` → `{ value: null, writtenAt: null }`), present-null v2 envelope, unparseable-v2 and failed-`validateV2` fallthrough; `writeMirrorEnvelope` write-plus-remove and a round-trip.
2. **Regression through the port surface only** (`tests/regression/firestore-stale-server-watermark.test.ts`, shared harness unchanged). `describe.each` over five rows — trip, carryover, staples, areas, section order — for: (a) an older stamped snapshot leaves the mirrored edit in place, re-pushes it once with A's own stamp, and a later cold start (adapter C, remote doc forgotten) hydrates the edit; (b) a newer stamped snapshot wins, `onChange` once, no re-push; (c) a pre-upgrade v1 mirror seeded directly behaves as today against both a stamped-older and an unstamped server document — server wins, no re-push, v1 key removed; (d) the re-push echo delivered twice issues no further `setDoc` and no `onChange`, and an absent snapshot afterwards is honoured (guard disarmed). Plus (e), section order only: a mirrored clear is a present v2 envelope — `initialize()` resolves from it, `loadOrder()` is `null`, and an older stamped server order is rejected with one re-push of `{ order: null, writtenAt: W }`. Cases (a), (d) and (e) were RED against the pre-fix adapters. 26 tests.
3. **Case (c) pinned in each adapter step**, not only in 02-02, because each step ships the v1 key deletion for its own documents.
4. **Existing tests stayed green unchanged** under D2 ii: the unstamped-server-wins regressions (trip 185-210, 275-294; mirror 193-214, 392-411, 592-611) exercise precisely the missing-server-stamp path, and the mirrored-cleared-order tests (503-512, 534-551) became the R10 guard for the v2 `{ value: null, writtenAt }` reader. Only the nine exact `setDoc` payload literals needed repair.

Adapter cold-start sequencing is single-example integration testing; property coverage lives in 01-01.

---

## 6. Quality Gates and Accepted Risks

| Gate | Result |
|---|---|
| Test suite | 862 passed, 23 skipped (pre-existing) — from 795 at feature start; +67 tests |
| `tsc --noEmit` | clean |
| `eslint` | clean — 170 files linted, 0 messages (`eslint.config.mjs`, tracked since `11db9c3`) |
| Mutation | SKIPPED — no changed files in Stryker scope (`src/domain/**`, `src/ports/**`); `src/adapters/` excluded per CLAUDE.md |
| Adversarial review | APPROVED, 0 blocking |
| DES integrity | exit 0, 3/3 steps with complete RED→GREEN→COMMIT traces |

Accepted risks (RCA §9), not mitigated here:

- **R1 — clock skew in a both-offline race.** Two devices editing offline without having seen each other's write are ordered by their wall clocks; skew can pick the wrong one. Strict improvement over arrival-ordered LWW; the HLC bump orders any edit made after observing the other write.
- **R2 — one device with a far-future clock.** Stamps a far-future watermark; every device that sees it bumps past it (self-healing). A device that never sees it and edits with a true clock loses its next comparison. Documented in the helper header.
- **R5 — residual window until each document's first online write post-upgrade.** Until the server doc carries a stamp, offline edit + kill + older server is exactly as vulnerable as before. Shrinks to zero per document; the alternative rule ("missing server stamp → mirror wins") would fight older app versions and break the S18 tests.
- **R6 — mixed app versions.** An old version writes unstamped docs → "unknown" → today's behaviour; the new version only re-pushes when the server stamp is present and lower, so no fight.
- **R7 — write amplification.** At most one extra `setDoc` per document per cold start, idempotent bytes.
- **Pre-existing whole-document LWW** (prior evolution doc R2) — unchanged in kind; only the tiebreak moved from "arrived last" to "stamped later".

---

## 7. SSOT Back-Propagation

`docs/product/architecture/brief.md`, Real-Time Sync Pattern:

1. New **step 8 — Local-write watermark**: client HLC `writtenAt` carried on the document and in the mirror; v2 envelope `{ value, writtenAt }` under `firestore-cache:v2:{uid}:{doc}`, v1 read as a stamp-less fallback and removed on first v2 write; adoption rule with server-wins ties and no comparison when a stamp is missing; the re-push; and the durability note — *on React Native the mirror is the only durable record of a local write, so any future change to the write path must preserve the watermark* (the WHY 5B prevention).
2. Landing note "Step 8 added 2026-09-14 (feature `fix-offline-edit-stale-server`)" in the style of the step 7 note. Steps 1-7 not reworded; step 7 still names the v1 key as its historical shape.

The prior evolution doc's §8 follow-up 1 is marked closed by this feature.

---

## 8. Follow-ups (not in this fix)

1. **Auth-gate additivity** (`App.tsx`, `useAppInitialization.ts`) — auth revalidation and the Firestore wait are still sequential. Out of scope for the second fix running.
2. **Field-level merges** — the only real refinement of D3 / whole-document LWW. A concurrent edit on another device is discarded rather than merged; the watermark decides which whole document survives.
3. **Section-order remote clear is still silence** (`extractIncomingOrder` maps `{ order: null }` to `null`, so a remote clear never reaches the watermark check) and the section-order adapter is still created without `onChange` in production (S21). Both pre-existing; recorded, not changed.
4. **Startup probing** — no `probe()` was added to the adapters (none existed, the RCA did not ask for one); adding AsyncStorage/Firestore startup probing is a separate design item per the roadmap note.
5. **Carried over from prior evolution docs**: docstring on `commitLocalTripChange` / `commitLocalCarryoverChange` stating that local writes never disarm the guard; `firestore-area-storage.ts` imports `DEFAULT_HOUSE_AREAS` from `../async-storage/async-area-storage` (adapter-to-adapter import); ADR numbering collision in `docs/adrs/`; the `reorder-home-areas` feature is stalled after DISCUSS.
