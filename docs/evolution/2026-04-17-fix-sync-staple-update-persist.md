# Evolution: fix-sync-staple-update-persist

Date: 2026-04-17
Type: Bug fix (nwave: /nw-bugfix -> /nw-deliver)
Branch merged to: main

## Feature Summary

A two-cause defect causing trip items to appear orphaned, stuck under a stale section, or revert to pre-edit locations after a staple's `houseArea` or `storeLocation` was changed:

- **Cause A (primary — `src/domain/trip.ts` `syncStapleUpdate`)**: the mutator updated `items` via `map` but never called `persistTrip()` or `notify()`. Every other `TripService` mutator calls both. `useTrip.ts` papered over the missing `notify()` with a local `setItems(tripService.getItems())` after each sync — so the UI looked correct in the tab the user just edited in, but storage held the stale trip. Any subsequent `loadFromStorage` (cold start, Firestore echo, `handleTripChange` from multi-device sync) rehydrated the stale `houseArea` / `storeLocation` back into the in-memory trip and the UI reverted. Because the stale `houseArea` often pointed at an area the user had since renamed or deleted, the item was silently dropped from the sweep list.
- **Cause B (multi-device — `src/hooks/useAppInitialization.ts` `diffStaples` + `handleStapleChange`)**: `diffStaples` only diffed by id (ADD / REMOVE). Field-level updates to same-id staples produced empty `added`/`removed` sets, so `handleStapleChange` never called `tripService.syncStapleUpdate`. Remote staple edits (another device, Firestore onSnapshot) never reached the trip at all — the trip item stayed at its pre-edit location indefinitely.

**Fix outline**

1. **Step 01-01**: add `notify()` + `persistTrip()` to `syncStapleUpdate` behind a content-equality guard (idempotency). The guard compares `houseArea` and the structural fields of `storeLocation` (`section`, `aisleNumber`) — not references — so that freshly-constructed-but-equal change objects don't trigger spurious writes. The guard is load-bearing: it terminates the own-snapshot echo loop introduced by step 02-01.
2. **Step 02-01**: extend `diffStaples` with an `updated` array of same-id staples whose `houseArea`, `storeLocation.section`, or `storeLocation.aisleNumber` differ. `handleStapleChange` iterates `updated` and calls `tripService.syncStapleUpdate(id, { houseArea, storeLocation })` for each. Combined with the idempotency guard from 01-01, the UI-initiated path (`updateStaple` + direct `syncStapleUpdate`) and the remote-snapshot path (`diffStaples.updated` → `syncStapleUpdate`) converge without producing a write loop.

## Business Context

Users reported items disappearing from the active trip after editing a staple's house area — they'd assign "Milk" to the Fridge, open the trip, and Milk would be gone. The only recovery was to re-add the item manually, which the user perceived as the app "losing" their list. In multi-device households, a staple edited on phone A never propagated to trip view on phone B until a full app restart, and even then only if the local Firestore cache was stale enough to trigger a full read. Combined, these two causes produced a reliability gap that eroded trust in the sync story the app otherwise delivered.

Post-fix, edits propagate through both entry points (UI orchestration and remote snapshot) and survive cold starts, Firestore echoes, and cross-device sync.

## Key Decisions

Extracted from `rca.md` and the two fix steps:

**Structural equality for the idempotency guard, not reference equality.** An earlier draft used reference comparison (`item.storeLocation === nextStoreLocation`). Rejected because the UI typically reconstructs `storeLocation` on every edit, so reference-equal is almost never true even when content is equal — the guard would fail to prevent the write loop. Chose deep field equality on `section` + `aisleNumber`.

**Do not remove the UI's direct `syncStapleUpdate` call after step 02-01.** With Fix 2, the Firestore own-snapshot path will also call `syncStapleUpdate` for the just-edited staple. The UI path and the snapshot path are both correct, both idempotent (via the content guard), and the dual-writer acts as belt-and-suspenders. Deleting the UI call would work but would remove the fast path that keeps the local tab responsive before the snapshot round-trips. Deferred as a potential future cleanup.

**Bugfix scope is trip + staple-library sync only.** The `item-grouping.ts` orphan-bucket defense (from the RCA's Fix 3) was deliberately skipped — it is defensive hardening for a scenario that the A+B fixes already prevent. Adding it now would be speculative design not driven by the reported defect.

## Steps Completed

From `deliver/execution-log.json`:

| Step | Name | Status |
|------|------|--------|
| 01-01 | Regression test + fix: `syncStapleUpdate` must persist and notify | PASS — all 5 phases |
| 02-01 | Regression test + fix: `diffStaples` must detect field updates and `handleStapleChange` must sync trip | PASS — all 5 phases |

Both steps followed the full 5-phase TDD loop (PREPARE → RED_ACCEPTANCE → RED_UNIT → GREEN → COMMIT). An additional `test(trip): mutation kills for syncStapleUpdate` commit added 2 tests after Stryker surfaced 3 surviving mutants in the idempotency guard. No RPP L1-L4 refactoring was required — the code came out clean on first pass.

## Lessons Learned

1. **Invariant parity is a silent killer.** `syncStapleUpdate` was the only mutator on `TripService` that did not call `notify()` + `persistTrip()`. Every other method did. Nothing prevented the omission: no type system check, no lint rule, no invariant test. Acceptance tests for the edit-staple feature used a fresh in-memory null storage and asserted on `trip.getItems()` in-process; the missing `persistTrip()` was invisible because the test never exercised `loadFromStorage`. Candidate prevention: a test that enumerates every public mutator on `TripService` (via reflection or an explicit fixture list) and asserts "mutation persists AND mutation notifies". Would have caught this the moment it was merged.

2. **Round-trip assertions belong in acceptance tests that touch storage.** The gap between "items reflect the edit" and "items still reflect the edit after a loadFromStorage" is load-bearing in any app where storage is the source of truth and in-memory state is a cache. The acceptance tests added in step 01-01 specifically include a `loadFromStorage` step after the sync — making this round-trip pattern the default for any future trip-mutation acceptance test would prevent a whole class of defects that look identical to cause A.

3. **Id-only diffs miss field updates.** `diffStaples` was designed for the narrow case "this staple is new / this staple was removed". Field updates never entered its vocabulary. The pattern generalises: any diff helper that reduces to set-membership is implicitly asserting that no data on existing entries ever matters. Before building another `diffX` helper, ask: "is any consumer of this diff going to react to field changes on entries that were already in both lists?" If yes, the diff needs a third bucket.

4. **Idempotency guards are load-bearing for echo loops.** Step 02-01 introduces a new trigger (`handleStapleChange` → `syncStapleUpdate`) that fires on every Firestore onSnapshot, including own-writes. Without the content-equality guard added in step 01-01, every UI edit would write to trip twice (once from UI orchestration, once from the echo) and potentially loop indefinitely. The guard is not cosmetic — it's the termination condition for the sync graph. Mutation testing correctly flagged 3 surviving mutants around exactly this predicate; the two added tests (section-only change, aisle-only change) complete the truth table of `storeLocationEqual` and make the guard load-bearing in tests as well as in production.

## Mutation Gate

- **Target**: `src/domain/trip.ts` (only in-scope file — `useAppInitialization.ts` is outside Stryker's `src/domain/**` + `src/ports/**` mutation scope).
- **Initial kill rate**: 87.08% (3 surviving mutants in `syncStapleUpdate` idempotency guard).
- **Surviving mutants addressed**: `LogicalOperator &&→||` and two `ConditionalExpression` mutations in the `storeLocationEqual` predicate (section-equality and aisle-equality). Tests added in `test(trip): mutation kills for syncStapleUpdate` (commit `8c62e7a`).
- **Final kill rate**: 88.33% (212 killed / 27 survived / 240 total). 100% on the `syncStapleUpdate` region. Remaining survivors are pre-existing gaps in unrelated trip.ts functions (ID helpers, validation messages, `loadFromStorage`, `complete`/`completeTrip`) — accepted as out-of-feature-scope.
- **Verdict**: PASS (threshold 80%).

## Related Files

Production:
- `src/domain/trip.ts`
- `src/hooks/useAppInitialization.ts`

Tests:
- `src/domain/trip.test.ts`
- `src/hooks/useAppInitialization.test.ts`

Commits:
- `a8309ab` — `fix(trip): persist and notify on syncStapleUpdate` (Step 01-01)
- `bb9fd05` — `fix(sync): propagate staple field updates to trip via diffStaples` (Step 02-01)
- `8c62e7a` — `test(trip): mutation kills for syncStapleUpdate`
