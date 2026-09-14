# Evolution — fix-offline-staple-cache-wipe

**Feature ID**: fix-offline-staple-cache-wipe
**Date**: 2026-09-14
**Type**: BUGFIX (`/nw-bugfix` → `/nw-deliver`)
**Finishes**: `fix-native-firestore-offline-cache` (April 2026) — §4.2 scope delivered for one adapter only
**Status**: SHIPPED
**Paradigm**: Functional TypeScript (per CLAUDE.md)
**Density**: lean

---

## 1. Summary

**Problem (user report)**: "The whole goal of the app is to be offline first so I don't run into issues when firing it up in a store with bad wifi. But on a recent shopping trip, I was staring at an empty shopping list while it, I guess, repeatedly tried to load the list from firebase storage."

Worse than reported. The empty list was not merely displayed — it was **persisted over the durable local mirror**, destroying the real list.

**Root cause**: the AsyncStorage write-through mirror was only ever built for one of four Firestore adapters. `docs/feature/fix-native-firestore-offline-cache/rca.md` §4.2 scoped it for all of them in April; commit `a8a3093` delivered it for the trip adapter alone. The staple, area and section-order adapters had **zero** local durability, because `persistentLocalCache()` is enabled web-only (`firebase-config.ts`) — it throws `UNIMPLEMENTED` on React Native (firebase-js-sdk#7947). Their only source of truth was the network.

**Causal chain** (verified against source, not inferred):

1. `useAppInitialization.ts:219-224` awaits `Promise.all` over all four `initialize()` calls.
2. Each adapter's `initialize()` resolved only from *inside* its first `onSnapshot` callback — readiness bound to a remote round trip.
3. Firestore withholds the initial event until it determines `OnlineState.Offline` (`event_manager.ts` `shouldRaiseInitialEvent`). Connected-but-dead wifi: ~10s. **Flapping wifi: the timer re-arms on each stream restart, so the wait is potentially unbounded** — the user's "repeatedly tried to load".
4. When the snapshot arrived offline, the doc did not exist → staple `cache = []`.
5. `useAppInitialization.ts:235` called `tripService.initializeFromStorage([])`.
6. `trip.ts` completed branch (the steady state between trips) rebuilt `items = [] + carryover = []`, cleared carryover, and called `persistTrip()`.
7. `persistTrip()` mirrored the empty trip to AsyncStorage. **Data loss.**

**Secondary symptom**: the area adapter fell back to `DEFAULT_HOUSE_AREAS` on an empty snapshot, so trip items in custom areas were silently dropped by `groupByArea`. Affects custom-area users only; default-area users were still fully exposed to the primary cause.

**Solution**: close the destructive rebuild in the domain, then finish the mirror for the three adapters that never got it.

---

## 2. Scope Decision

User approved **F1 + F2**. Deliberately excluded:

- **F3** (render from local cache without awaiting the network). Deferred because it must not ship without a local-write watermark: `firestore-trip-storage.ts` disarms its empty-snapshot guard on every local write, and F3 would widen the window in which a late server snapshot clobbers an offline edit. **The ~10s-to-unbounded wait on a flaky cold start therefore still exists** — the list is now correct when it appears, but it does not appear faster.
- Auth-gate additivity (auth revalidation and the Firestore wait are sequential, not overlapping, so worst case is their sum).
- The `onIdTokenChanged` latent re-init fragility (not currently triggered — `onAuthStateChanged` dedups on uid).

---

## 3. Key Decisions

**D1 — Order F2 before F1.** The domain guard is the data-loss stopper, is independent of the adapters, and alone restores a visible list from the trip mirror. It had to be in place before the adapters changed underneath it.

**D2 — The guard is a closed-world heuristic, not a hydration signal.** The domain cannot observe adapter hydration without a `StapleStorage` port change, which would have made F2 depend on F1 and inverted D1. Rule: refuse a rebuild whose inputs (staples ∪ carryover) are empty while the stored completed trip still has items.

**D3 — Known limitation, accepted and pinned.** D2 has a permanent false positive: a user who deletes *every* staple, with a completed stored trip still holding items and no carryover, sees that trip restored rather than a fresh empty one. Storage is still not written. Recovery is Reset Sweep.

This does **not** self-correct once the staple mirror ships — the guard reads only (staples, carryover, stored items) and never observes the mirror. The roadmap reviewer initially claimed it converges after F1; that claim was wrong and was corrected before implementation, so no code comment or test name asserts convergence. Pinned by a dedicated test.

Trade accepted: a rare, recoverable surprise beats silent destruction of the list on every offline cold start.

**D4 — New adapters diverge from the trip adapter on guard disarm.** The trip adapter disarms on *every local write*. The three new mirrors disarm only when a snapshot *carries data*. A local write is no evidence about server state; copying the trip semantics would have left this sequence able to wipe: offline cold start → hydrate N items → user adds one → absent snapshot arrives → wipe. **This leaves the four adapters inconsistent — see Follow-ups.**

**D5 — Each adapter's notion of absence is distinct**, which is why the three were not a copy-paste:
- Staples: absent value is `[]`.
- Areas: `DEFAULT_HOUSE_AREAS` demoted from "what we return when the snapshot is absent" to "what we return when neither mirror nor server has anything". Mirror wins over defaults.
- Section order: `null` is a *legitimate stored value*, so the mirror stores an envelope `{ order: string[] | null }` to make "no entry" representable rather than inferred.

**D6 — Accepted residual.** If a *different device* clears all staples/areas/section order while this session has not yet seen server data, the guard keeps the local value and a later cold start can resurrect it. Self-heals on the next local write or non-empty snapshot. Errs toward keeping data over losing it, as the acceptance criteria mandate.

---

## 4. Implementation

| Step | Commit | Change |
|---|---|---|
| 01-01 | `42f5368` | `src/domain/trip.ts` — completed branch refuses a rebuild that would erase stored items; falls through to the pre-existing adopt-stored-trip code rather than duplicating it (19 insertions) |
| 02-01 | `28dadfa` | `firestore-staple-storage.ts` — versioned uid-scoped mirror, hydrate-before-subscribe, empty-snapshot preservation, write-through on all four mutators |
| 02-02 | `64e07b5` | `firestore-area-storage.ts` + `firestore-section-order-storage.ts` — same mirror with the D5 semantics |

Cache keys: `firestore-cache:v1:{uid}:{trip|staples|areas|sectionOrder}` — versioned, uid-scoped, non-colliding.

`initialize()` resolution timing is unchanged in all three steps (F3 stayed out of scope).

---

## 5. Test Strategy — closing the gaps that let this ship

The RCA's "Why tests missed it" named four gaps. Each is now closed:

1. **Offline was only ever modelled as fast hard failure** (airplane mode). `tests/regression/firestore-offline-cold-start-mirror.test.ts` adds `withheld` (callback registered, never invoked — connected-but-dead wifi) and `delayed` modes, and asserts `loadAll()` *while `initialize()` is still pending*. This is the regime the user actually hit.
2. **No test called trip hydration with an empty staple list.** A 16-case `test.each` matrix over stored-trip state × staples × carryover now covers it; 8 of 16 cases pass an empty staple list.
3. **Both directions of the guard pinned** — a genuine new user always rebuilds; an unhydrated cache never does.
4. **Empty snapshot never overwrites** mirrored staples, areas or section order.

Each matrix case asserts the full observable universe (items, completed areas, trip identity, `saveTrip` and `clearCarryover` call counts), not the single slot under test.

**Note on an unmet literal**: the RCA asked that `grep -rn "initializeFromStorage(\[\])"` become non-empty. It is still empty — the matrix passes empty staple arrays through a variable. The intent behind that proxy is met far more strongly than a literal call would; a contrived call was not added merely to satisfy a string match.

---

## 6. Quality Gates

| Gate | Result |
|---|---|
| Test suite | 781 passed, 23 skipped, 106 suites (from 734 passing at feature start) |
| `tsc --noEmit` | clean |
| `eslint` | clean |
| Mutation (`src/domain/trip.ts`, per-feature strategy, ≥80% gate) | **89.00%** — 267 killed, 32 survived, 0 errors |
| Adversarial review | APPROVED — Testing Theater 7-pattern detection passed; tests confirmed genuinely RED-before-fix for semantic reasons |
| DES integrity | exit 0, all 3 steps with complete RED→GREEN→COMMIT traces |

Mutation survivors are pre-existing constants (house-area string literals, trip-id generator), not the new guard.

---

## 7. SSOT Back-Propagation

`docs/product/architecture/brief.md` corrected in three places. **The brief's own false premise is why this bug existed**:

1. Constraints listed "`persistentLocalCache()` already enabled on Firestore client" as fact. False on native. Now states the web-only reality and names it as the origin of this defect.
2. The Fault Tolerance strategy claimed `persistentLocalCache()` "ensures offline writes queue and replay". True on web only; native durability now correctly attributed to the per-adapter mirror.
3. The Real-Time Sync Pattern was a six-step contract. Extended to seven: hydrate from the mirror before subscribing; treat an absent or empty first snapshot as *unknown*, never *empty*; write through on every local mutation. The D4 inconsistency is recorded there.

---

## 8. Follow-ups (not in this fix)

1. **Harmonise the trip adapter's disarm semantics** with the three new adapters (D4). It currently disarms on every local write, the widening that keeps F3 blocked.
2. **F3 — render from local cache without awaiting the network.** Needs the local-write watermark first. Until then, a flaky cold start still waits before showing the (now correct) list.
3. **`firestore-area-storage.ts` imports `DEFAULT_HOUSE_AREAS` from `../async-storage/async-area-storage`** — a pre-existing adapter-to-adapter import that violates the brief's own enforcement rule. Not introduced here. Clean fix: relocate the constant to the domain.
4. **ADR numbering collision** in `docs/adrs/` — two ADR-001, two ADR-002, two ADR-003, from two merged series. Renumber before adding ADR-009.
