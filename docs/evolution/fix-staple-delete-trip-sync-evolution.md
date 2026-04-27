# 2026-04-27 — fix-staple-delete-trip-sync

## Summary

Bug: deleting a staple via the Metadata bottom sheet in `HomeView` removed the staple from the library but the matching trip item kept rendering in the current trip's sweep groups (and in the persisted trip document) until **Reset Sweep** rebuilt the trip from scratch. The defect was visible in both sweep mode and checklist mode and affected staple-typed items added through any code path other than the staple-library "add to trip" flow.

Fix: a three-layer correction mapped 1:1 to the RCA root causes — domain-layer identity widening, reactivity wiring to the domain mutation event, and UI re-derivation via `stapleLibrary.subscribe`. The architectural correction generalizes the precedent shipped in `fix-section-order-reactive`: storage-layer `onChange` is for cross-device echoes, domain-layer `subscribe` is for local UI-driven mutations.

## User impact

Before: deleting a staple in the Home view left the corresponding trip row visible in sweep groups and in the checklist until the user pulled Reset Sweep or restarted the app. The bug was particularly bad for trip items added via QuickAdd free-text or `handleSubmitTripItem` (no `stapleId`) because even the manual dual-write workaround missed those.

After: deleting a staple removes the matching trip row on the next React tick — including stapleId-less rows that match the deleted staple by `(name, houseArea)`. No reset-sweep needed. Checklist mode and `StoreView`'s existing-sections list also refresh immediately on any staple library mutation.

## Root causes

### A — Identity asymmetry: delete used a narrower key than add

`tripService.removeItemByStapleId(id)` filtered items strictly by `stapleId === id`. Several legitimate code paths produced items with `stapleId === null`/`undefined`:

- `addItem` called without a `stapleId` field (e.g. `handleSubmitTripItem` and the free-text branch of `QuickAdd`).
- Carryover items predating the introduction of `stapleId`.

Meanwhile `HomeView.handleAddFromChecklist` already treated `(stapleId)` OR `(name + houseArea)` as duplicate-equivalent identities. The delete contract was strictly weaker than the add/lookup contract, so any item produced via the no-stapleId path survived deletion until Reset Sweep rebuilt the trip from `stapleLibrary.listAll()`.

### B — Reactivity wired to the wrong layer

The diff-based sync handler (`handleStapleChange` in `useAppInitialization`) was the canonical add/remove/update sync between staple library and trip — but it was wired only to `stapleStorage.onChange`, not to `stapleLibrary.subscribe`. The Firestore adapter's own-write echo suppression (`if (incomingSerialized !== currentSerialized) onChange?.()`) meant local UI deletes never reached `handleStapleChange`. The system relied on a per-call-site dual-write in `HomeView.handleDeleteStaple` to compensate, and that dual-write inherited Branch A's narrow identity.

This is the same anti-pattern that `fix-section-order-reactive` had just removed in the section-order flow: UI assumed it could imperatively notify, instead of subscribing to a domain-level event.

### C — UI memos referenced a stable factory reference, not a revision counter

`HomeView.allStaples` and `StoreView.existingSections` were memoized with the `stapleLibrary` reference as the only dep. Because `ServiceProvider` returns a stable factory reference across mutations, those memos never recomputed. `SectionOrderSettingsScreen` had already adopted the `stapleRevision` useState + `useEffect`-subscribe pattern; HomeView and StoreView had not been swept onto it.

## Resolution

| Step | Commit | What |
|---|---|---|
| 01-01 | `2d58611` | Domain widening: `removeItemsByStaple({id, name, houseArea})` with id-then-`(name, houseArea)` fallback gated to `itemType === 'staple'`; both removal mutators early-return on no-op (closes RC-A) |
| 01-02 | `65e21a3` | Reactivity wiring: `stapleLibrary.subscribe(onStapleChange)` added alongside `stapleStorage.onChange`; removed-loop switched to `removeItemsByStaple`; unsubscribe tracked in `unsubscribeAll` (closes RC-B — **the user-visible fix**) |
| 01-03 | `b32cd42` | UI revision pattern: `HomeView.handleDeleteStaple` dual-write removed; `stapleRevision` useState + `useEffect`-subscribe added in HomeView and StoreView; integration test covers id-path + `(name, houseArea)`-fallback path through the full UI stack (closes RC-C and lands the user-facing fix) |
| 01-04 | (folded into 01-03) | Cross-cutting acceptance for `handleSubmitTripItem` and QuickAdd free-text was already covered by the 01-03 third scenario — production paths converge on `tripService.addItem(request)` producing a `stapleId=null` item, so a separate test exercised no new code path. Logged as `SKIPPED: NOT_APPLICABLE` in `execution-log.json`. |
| L2/L3 | `9bd2994` | Trip-domain helper consolidation: `matchesStapleIdentity(staple)` (single home for the id-then-`(name, houseArea)` fallback rule), `removeWhere(predicate)` (replaces filter+notify+persist duplication), `updateItemByName(name, patch)` (replaces 4 duplicated map+persist blocks), `categorizeItems(items)` (pure split shared by inline `complete()` and standalone `completeTrip`). No behaviour change. |
| L3 | `e4b77da` | Staple-diff application split into named helpers: `applyAddedStaplesToTrip`, `applyRemovedStaplesToTrip`, `applyUpdatedStaplesToTrip`. `handleStapleChange` now reads as a three-effect pipeline. |
| L1/L2 | `388a090` | Dead UI state removed (`editStapleName`, two unused styles); `toggleItemNeeded(name, currentlyNeeded)` callback consolidates the sweep-tile and one-off-row toggle paths. |

## Key decisions

- **Two delete primitives, not one.** `removeItemsByStaple({id, name, houseArea})` exists for callers that hold the full staple record (UI delete, library subscribe path). `removeItemByStapleId(id)` is retained for the remote-sync diff path, which only has the deleted id, not the deleted record. Both share `removeWhere` and both early-return on no-op.
- **Fallback gated to `itemType === 'staple'`.** One-off items never get removed by `(name, houseArea)` coincidence — the fallback applies only when the trip item is itself staple-typed, mirroring the canonical staple identity rule already used by `staple-library.isDuplicate` and `handleAddFromChecklist`.
- **Both reactivity sources, fanned in.** The fix did not replace `stapleStorage.onChange` with `stapleLibrary.subscribe` — both fan into the same `handleStapleChange`. The storage path remains for cross-device sync; the domain path covers local UI mutations. `diffStaples(previousStaples, currentStaples)` returning empty arrays after the first fire makes double-firing a true no-op, validated by the idempotency test in `useAppInitialization.test.ts`.
- **Real in-memory factories, not Jest mocks.** `useAppInitialization.test.ts` builds a real in-memory `stapleLibrary` and `tripService` via the production factories, plus a ~20-line in-memory `stapleStorage` fake whose `onChange` is exposed but never auto-invoked. This isolates the new `stapleLibrary.subscribe` path from any Firestore echo coupling.
- **01-04 explicitly merged into 01-03.** Both production paths it would have tested (`handleSubmitTripItem`, QuickAdd free-text) converge on `tripService.addItem(request)` producing a `stapleId=null` item — the post-state, not the entry point, is what matters. The 01-03 third scenario already covers this exact post-state. Logged honestly as `SKIPPED: NOT_APPLICABLE` in the execution log rather than padded with a redundant test.
- **Refactor pass after GREEN, not during.** Phase 3 L1-L4 commits (`9bd2994`, `e4b77da`, `388a090`) were strictly behaviour-preserving — `matchesStapleIdentity` lifts the fallback rule out of `removeItemsByStaple` and into a single predicate factory, and `removeWhere` deduplicates the filter+notify+persist pattern between the two delete mutators. All 684 tests stayed green throughout.

## Mutation testing

Stryker per-feature, scoped to `src/domain/trip.ts`:
- **89.23% kill rate** (gate ≥80%).
- The four mutant-magnet branches called out in the 01-01 implementation notes (no-op early-return, `itemType` guard, id-match branch, `(name, houseArea)` fallback branch) each had at least one killing assertion.

## Adversarial review

Phase 4 review: **APPROVED** with no findings. Reviewer raised no BLOCKERs or CONCERNs against the three-step fix.

## Files touched

Production:
- `src/domain/trip.ts` — `removeItemsByStaple`, `removeItemByStapleId` no-op guard, `matchesStapleIdentity`, `removeWhere`, `updateItemByName`, `categorizeItems` helpers
- `src/hooks/useAppInitialization.ts` — `stapleLibrary.subscribe(onStapleChange)` wiring + `unsubscribeAll` integration; `applyAddedStaplesToTrip` / `applyRemovedStaplesToTrip` / `applyUpdatedStaplesToTrip` split
- `src/ui/HomeView.tsx` — `handleDeleteStaple` dual-write removed; `stapleRevision` state + `useEffect` subscribe; `toggleItemNeeded` extracted; dead `editStapleName` state and unused styles removed
- `src/ui/StoreView.tsx` — `stapleRevision` pattern applied to `existingSections` memo; dead style removed

Tests:
- `src/domain/trip.test.ts` — limitation-codifying test updated; new tests for `(name, houseArea)` fallback, `itemType` guard, no-op early-return, id-only back-compat
- `src/hooks/useAppInitialization.test.ts` (NEW) — local-remove propagation, fallback-identity propagation, unsubscribe correctness, idempotent double-fire
- `src/ui/HomeView.test.tsx` (NEW) — staple delete → sweep-group cleanup, checklist refresh, `(name, houseArea)`-fallback through the full UI stack

## Verification

- 684 tests pass, 23 pre-existing skips, 0 failures.
- Phase 6 integrity: all 4 steps complete DES traces (01-04 logged as `SKIPPED: NOT_APPLICABLE` with rationale).
- TypeScript strict + ESLint clean; mutation 89.23% on `src/domain/trip.ts`.

## Lessons learned

- **Storage-layer `onChange` is for cross-device echoes; domain-layer `subscribe` is for local UI mutations.** Storage adapters suppress own-write echoes, so any UI-driven mutation must fan out via the in-memory domain factory's `subscribe`, not the storage port. This is the same lesson `fix-section-order-reactive` shipped one week earlier — the fix here is the second application of that pattern, this time to the staple↔trip flow. Future audits should sweep every `domainFactory.listAll()` consumer for the same shape.
- **Delete contracts must be at least as wide as add contracts.** When `addItem` accepts items with `stapleId === null` and the codebase recognizes `(name, houseArea)` as a co-equal identity for duplicate detection, `remove` cannot be narrower than that without leaving items unreachable. Identity asymmetry between mutators is a smell — when two mutators on the same aggregate disagree on what "same item" means, one of them is wrong.

## Commits

```
388a090 refactor(fix-staple-delete-trip-sync): remove dead UI state and consolidate sweep toggle (L1/L2)
e4b77da refactor(fix-staple-delete-trip-sync): split staple-diff application into named helpers (L3)
9bd2994 refactor(fix-staple-delete-trip-sync): consolidate trip helpers (L2/L3)
b32cd42 fix(fix-staple-delete-trip-sync): drop HomeView dual-write, add staple revision subscription
65e21a3 fix(fix-staple-delete-trip-sync): wire stapleLibrary subscription to trip cleanup
2d58611 feat(fix-staple-delete-trip-sync): add removeItemsByStaple with name+area fallback
```
