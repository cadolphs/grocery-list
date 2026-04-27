# RCA — Staple delete in Home view does not remove item from current trip

**Author:** Rex (Toyota 5 Whys, multi-causal)
**Date:** 2026-04-27
**Defect:** "Deleting a staple in the home view keeps it in the current trip until a reset sweep occurs."
**Investigation depth:** 5 | **Multi-causal:** yes | **Evidence required:** yes

---

## 1. Problem definition (scoped)

**Observed:** A staple deleted via the Metadata bottom sheet (long-press on a sweep tile in `HomeView`) disappears from the staple library but the matching trip item continues to render in the current trip's sweep groups (and remains in the persisted trip document) until the user runs **Reset Sweep**, which rebuilds the trip from `stapleLibrary.listAll()`.

**In scope:** the staple delete flow originating from `HomeView`'s `MetadataBottomSheet` (`onDeleteStaple` handler) and the resulting trip state. Includes both fresh and legacy/carryover trip items.

**Out of scope:** unrelated reactivity (already fixed in `fix-section-order-reactive`), unrelated edit/rename flows, area rename/delete flows.

**Working hypothesis (Mike's prompt):** "Suspect a similar reactivity gap may exist in the staples ↔ trip flow."  Confirmed below — and additionally, even when reactivity *is* effectively present (via direct dual-write), the link key (`stapleId`) is missing on a non-empty class of trip items, so the dual-write itself is incomplete.

---

## 2. Five-Whys analysis (multi-causal)

### Branch A — `removeItemByStapleId` cannot remove items whose `stapleId` is `null`

**WHY 1A — Symptom**
After `handleDeleteStaple` runs, the trip still contains the deleted staple's row.
*Evidence:* `src/ui/HomeView.tsx:108-111` calls `stapleLibrary.remove(stapleId)` then `removeItemByStapleId(stapleId)`. The first succeeds (UI confirms the checklist updates next reload). The second silently no-ops for any trip item whose `stapleId !== stapleId`.

**WHY 2A — Context**
`tripService.removeItemByStapleId` filters by exact `stapleId` equality.
*Evidence:* `src/domain/trip.ts:288-292`
```
removeItemByStapleId: (stapleId: string) => {
  items = items.filter((item) => item.stapleId !== stapleId);
  notify();
  persistTrip();
},
```
Items with `stapleId === null` (or `undefined` after JSON re-hydration) survive the filter.

**WHY 3A — System**
Several legitimate code paths produce trip items with `stapleId === null`:
- `addItem` called without a `stapleId` field — e.g. `handleSubmitTripItem` in `HomeView.tsx:99-101` (`addItem(request)` of an `AddTripItemRequest`, which has no `stapleId`) and the free-text branch of `QuickAdd` (no suggestion selected).
*Evidence:* `src/domain/trip.ts:153` `stapleId: request.stapleId ?? null`.
- Carryover items predating the introduction of `stapleId`.  Trip docs persisted with `items[i].stapleId === undefined` deserialize back to `undefined`, which also fails `!== stapleId`.
*Evidence:* `src/adapters/firestore/firestore-trip-storage.ts:139-170` (no migration for `stapleId`); `src/adapters/async-storage/async-trip-storage.ts:17-24` (`JSON.parse` only).
- The existing test `src/domain/trip.test.ts:74-90` *codifies* this behaviour: "item added without stapleId is NOT removed by removeItemByStapleId" — it is therefore a known design limitation, not an oversight in the domain.

**WHY 4A — Design**
The link key from staple library to trip item was modeled as a single foreign key (`stapleId`) with no fallback identity (e.g. `name + houseArea`). The fallback pair is, in fact, used elsewhere — `HomeView.handleAddFromChecklist` (`src/ui/HomeView.tsx:124-126`) uses `(stapleId === id) || (name === name && houseArea === houseArea)` to detect duplicates. The delete path was not given the same fallback, so deletes are strictly weaker than adds.
*Evidence:* asymmetry between `HomeView.tsx:124-126` (lookup uses both keys) and `trip.ts:288-292` (filter uses only `stapleId`).

**WHY 5A — Root cause A**
**Identity asymmetry: trip-item ↔ staple link has two recognized join keys (stapleId, and name+houseArea), but `removeItemByStapleId` honours only one.** Combined with a non-empty population of `stapleId === null` items (from QuickAdd free-text, manual `AddTripItemRequest` adds, and pre-stapleId carryover/legacy data), the filter is provably incomplete.

> ROOT CAUSE A — The deletion key strategy is narrower than the add/lookup key strategy. Every trip item that originated from a code path that doesn't carry `stapleId` is unreachable by the delete primitive and survives until `resetSweep` rebuilds the trip from scratch.

---

### Branch B — Trip-sync is wired to remote storage echoes only, not to staple-library mutations

**WHY 1B — Symptom**
When deletion happens locally (via UI), the trip's diff-based sync handler (`handleStapleChange`) does not run; the only trip update is the manual dual-write in `HomeView.handleDeleteStaple`. Any code path that forgets the dual-write (or any item Branch A misses) is left stale until `resetSweep` or app restart.

**WHY 2B — Context**
`handleStapleChange` is the canonical add/remove/update sync logic between staple library and trip.  It is invoked via `onStapleChange`, which is wired only to `stapleStorage.onChange`, not to `stapleLibrary.subscribe`.
*Evidence:*
- Wiring: `src/hooks/useAppInitialization.ts:170` `factories.createStapleStorage(uid, { onChange: onStapleChange })`.
- Definition: `src/hooks/useAppInitialization.ts:212-247` (the `for (const staple of removed) tripService.removeItemByStapleId(staple.id)` loop is exactly the desired behaviour, but it never runs for local UI deletes).
- The staple library exposes a `subscribe` listener (`src/domain/staple-library.ts:22-25, 58-60, 163-168`) and `notify()` fires on every mutation (`addStaple`, `addOneOff`, `updateStaple`, `remove`). No production consumer subscribes to it for trip-sync — only `SectionOrderSettingsScreen` does (`src/ui/SectionOrderSettingsScreen.tsx:48-53`).

**WHY 3B — System**
`stapleStorage.onChange` is intentionally suppressed for local writes via own-write echo detection.
*Evidence:* `src/adapters/firestore/firestore-staple-storage.ts:56-63`:
```
if (incomingSerialized !== currentSerialized) {
  cache = incomingItems;
  onChange?.();
}
```
Local `storage.remove(id)` mutates `cache` synchronously (`firestore-staple-storage.ts:91-97`) and does *not* call `onChange`. When Firestore later echoes the change back, the snapshot equals the cache and `onChange` is suppressed. So `handleStapleChange` runs **only** on genuinely remote-driven changes.

**WHY 4B — Design**
The original intent of `handleStapleChange` was *cross-device sync* (a delete on phone B shows up on phone A). Local UI mutations were assumed to be handled imperatively by the UI layer (the dual-write in `HomeView.handleDeleteStaple`).  This assumption is the same shape as the one fixed in `fix-section-order-reactive` — UI code was assumed to imperatively notify, instead of subscribing to a domain-level event.
*Evidence (precedent):* commit `0b99b24 fix(fix-section-order-reactive): make SectionOrderStorage reactive` and `SectionOrderSettingsScreen.tsx:48-53` (subscribes to `stapleLibrary.subscribe` for new-section detection).

**WHY 5B — Root cause B**
**The trip-sync diff handler is connected to the *adapter* layer's remote-only event (`stapleStorage.onChange`) instead of to the *domain* layer's mutation event (`stapleLibrary.subscribe`).** The result is two parallel sync paths: a complete-but-remote-only diff path, and an incomplete-but-local manual dual-write path. Any defect in either (Branch A is one such defect) leaks through.

> ROOT CAUSE B — Architectural reactivity gap: trip-sync logic listens to remote echoes, not to local domain mutations, so it must be paper-mached over by per-call-site dual-writes. The same anti-pattern was just removed from the section-order flow; it persists in the staple↔trip flow.

---

### Branch C — `HomeView` derived staple data is not reactive (secondary symptom)

**WHY 1C — Symptom**
Even when Branches A/B are worked around, the *checklist* mode of HomeView shows the deleted staple until the screen unmounts/remounts.

**WHY 2C — Context**
`HomeView.allStaples` and `checklistStaples` are memoized with the staple library *reference* as the only dependency.
*Evidence:* `src/ui/HomeView.tsx:34-38`
```
const allStaples = useMemo(() => stapleLibrary.listAll(), [stapleLibrary]);
const checklistStaples = useMemo(() => allStaples.filter((s) => s.type === 'staple'), [allStaples]);
```
The `stapleLibrary` reference is stable across mutations (returned by `ServiceProvider`), so these memos never recompute on add/update/remove.

**WHY 3C — System**
There is no `useEffect`-driven version-counter or subscription to `stapleLibrary.subscribe()` in `HomeView`. The only screen that does this correctly is `SectionOrderSettingsScreen` (`src/ui/SectionOrderSettingsScreen.tsx:47-53`):
```
const [stapleRevision, setStapleRevision] = useState(0);
useEffect(() => stapleLibrary.subscribe(() => setStapleRevision(p => p + 1)), [stapleLibrary]);
```

**WHY 4C — Design**
At the time HomeView was built, the staple library did not yet have `subscribe`; it was added during `fix-section-order-reactive`. HomeView was not updated to consume the new event. Same root pattern as Branch B but on a different consumer.

**WHY 5C — Root cause C**
**Incomplete propagation of the new `stapleLibrary.subscribe` reactivity primitive.** Adding the subscription mechanism without sweeping all consumers leaves a subset of derived data permanently stale.

> ROOT CAUSE C — Consumer sweep was incomplete: only `SectionOrderSettingsScreen` was migrated to the subscription model; `HomeView` (and `StoreView`'s `existingSections`) still treat `stapleLibrary.listAll()` as referentially stable.

`StoreView.tsx:33-36` shows the same pattern (`existingSections` memo over `stapleLibrary` reference).

---

## 3. Cross-validation

**Backwards chain validation**

- *Root cause A → symptom?* Yes. With at least one trip item carrying `stapleId !== currentStapleId` (or `null`), the `items.filter((item) => item.stapleId !== stapleId)` is a no-op for that item; the row keeps rendering in `groupByArea(items, areas)` until `resetSweep` rebuilds `items` from staples. ✓
- *Root cause B → symptom?* Yes (architectural). Even if Branch A items are absent, the system relies on a per-handler dual-write; any future code path that deletes a staple without invoking `removeItemByStapleId` would reproduce the bug. The `handleStapleChange` removal loop *would* fix it via the staple-library subscription path, but it is not wired up. ✓
- *Root cause C → symptom?* Partially — explains the **checklist mode** persistence (deleted staple keeps appearing in `StapleChecklist`), and the staleness of `existingSections` / `tripItemNameSet` derived data. ✓

**Cross-cause consistency**

- A (identity asymmetry) and B (architectural wiring) are independent and additive. Fixing only A leaves B's fragility in place; fixing only B (subscribe `handleStapleChange` to the library) will still miss `stapleId: null` carryover items. **Both must be addressed.**
- C is independent of A/B — it is about derived UI memos, not trip mutation. Including it in this fix prevents a separately-reported "checklist still shows deleted staple" follow-up.

**Completeness check**

- All three branches collectively explain: (i) trip row persists in sweep view; (ii) bug surfaces only "until reset sweep" (resetSweep rebuilds items from `stapleLibrary.listAll()`, which omits the deleted one regardless of stapleId); (iii) checklist mode also shows staleness; (iv) `StoreView`'s `existingSections` exhibits same staleness on staple add/edit/delete.
- No additional branches identified for the stated symptom.

---

## 4. Contributing factors

1. **Test coverage gap**: no integration test exercises `HomeView.handleDeleteStaple` end-to-end. `src/domain/trip.test.ts:74-90` even *encodes* the limitation as expected behaviour, removing pressure to fix it.
2. **API asymmetry**: `addItem`'s lookup uses two keys (`stapleId` OR `name+houseArea`), while `removeItemByStapleId` uses only one. Any reader inspecting only one direction would not notice.
3. **Mixed reactivity model**: `stapleStorage.onChange` (remote echo, with own-write suppression) and `stapleLibrary.subscribe` (all mutations, never suppressed) coexist; no documented guidance on which to consume for which use case. The diff-based sync was bound to the wrong one.
4. **Recent precedent not generalized**: the `fix-section-order-reactive` work fixed the same shape of bug in section ordering; the lesson was not propagated to other consumers (HomeView, StoreView, useAppInitialization sync wiring).

---

## 5. Proposed fix

Three changes, mapped 1:1 to root causes A/B/C. Together they restore single-source-of-truth reactivity for staple→trip propagation.

### Fix A — Make trip removal robust to missing `stapleId`

**File:** `src/domain/trip.ts`

Add a fallback identity match. Prefer a new `removeItemsByStaple(staple)` that takes the full staple (so the domain knows both `id` and `name+houseArea`); keep the old method as a thin wrapper for back-compat.

Diff sketch:
```diff
-    removeItemByStapleId: (stapleId: string) => {
-      items = items.filter((item) => item.stapleId !== stapleId);
-      notify();
-      persistTrip();
-    },
+    removeItemsByStaple: (staple: { id: string; name: string; houseArea: HouseArea }) => {
+      const next = items.filter((item) => {
+        if (item.stapleId !== null && item.stapleId !== undefined) {
+          return item.stapleId !== staple.id;
+        }
+        // Fallback: legacy/quick-add items with no stapleId.
+        // Match by (name, houseArea) to mirror the duplicate-detection rule
+        // already used by HomeView.handleAddFromChecklist.
+        return !(item.name === staple.name && item.houseArea === staple.houseArea);
+      });
+      if (next.length === items.length) return;
+      items = next;
+      notify();
+      persistTrip();
+    },
+    // Back-compat wrapper: id-only removal (used by remote-sync diff path,
+    // which only has the deleted id, not the deleted record).
+    removeItemByStapleId: (stapleId: string) => {
+      const next = items.filter((item) => item.stapleId !== stapleId);
+      if (next.length === items.length) return;
+      items = next;
+      notify();
+      persistTrip();
+    },
```

**File:** `src/domain/trip.test.ts`
- Update the `'item added without stapleId is NOT removed by removeItemByStapleId'` test to reflect the new contract: keep it for `removeItemByStapleId(id)` (id-only path is still id-only), and add a new test asserting `removeItemsByStaple({id, name, houseArea})` *does* remove a stapleId-less item with matching name/area. Add a sibling test that name+area match does NOT remove a one-off (`itemType !== 'staple'`) — fallback applies only when both items represent the same staple identity.

### Fix B — Subscribe trip-sync to the domain event, not the adapter event

**File:** `src/hooks/useAppInitialization.ts`

Add a staple-library subscription that triggers the same diff handler. Keep the storage `onChange` wiring for cross-device remote sync; both fan into the same handler (it is idempotent — `diffStaples` against `previousStaples` makes the second call a no-op).

Diff sketch (around lines 211-247):
```diff
     // Wire auto-add/remove: track previous staples, diff on change
     let previousStaples = stapleLibrary.listAll().filter((s) => s.type === 'staple');
     handleStapleChange = () => {
       const currentStaples = stapleLibrary.listAll().filter((s) => s.type === 'staple');
       const { added, removed, updated } = diffStaples(previousStaples, currentStaples);

       for (const staple of added) {
         const alreadyInTrip = tripService.getItems().some(item => item.stapleId === staple.id);
         if (alreadyInTrip) continue;
         tripService.addItem({ ... });
       }

-      for (const staple of removed) {
-        tripService.removeItemByStapleId(staple.id);
-      }
+      for (const staple of removed) {
+        tripService.removeItemsByStaple(staple);  // robust to stapleId === null
+      }

       for (const staple of updated) { ... }

       previousStaples = currentStaples;
     };

+    // Bind the diff handler to BOTH the adapter's remote echo (cross-device
+    // sync) AND the domain library's mutation notifier (local UI mutations).
+    // diffStaples is idempotent when previousStaples === currentStaples, so
+    // double-firing is safe.
+    const unsubscribeStapleLibrary = stapleLibrary.subscribe(onStapleChange);
```

And make sure `unsubscribeAll` calls `unsubscribeStapleLibrary()`.

### Fix B-cont — Remove the manual dual-write from HomeView (now redundant)

**File:** `src/ui/HomeView.tsx`

Diff sketch (lines 108-111):
```diff
-  const handleDeleteStaple = useCallback((stapleId: string) => {
-    stapleLibrary.remove(stapleId);
-    removeItemByStapleId(stapleId);
-  }, [stapleLibrary, removeItemByStapleId]);
+  const handleDeleteStaple = useCallback((stapleId: string) => {
+    // Trip cleanup happens via the stapleLibrary.subscribe -> handleStapleChange
+    // path wired in useAppInitialization. Removing the dual-write here.
+    stapleLibrary.remove(stapleId);
+  }, [stapleLibrary]);
```
And drop `removeItemByStapleId` from the `useTrip` destructure (`HomeView.tsx:28`).

(Optional: same cleanup in `StoreView` if there is or will be a delete path there.)

### Fix C — Reactivity for HomeView/StoreView derived staple data

**File:** `src/ui/HomeView.tsx`

Add the same revision-counter pattern used in `SectionOrderSettingsScreen`:

```diff
+  const [stapleRevision, setStapleRevision] = useState(0);
+  useEffect(() => stapleLibrary.subscribe(() => setStapleRevision(p => p + 1)),
+    [stapleLibrary]);

-  const allStaples = useMemo(() => stapleLibrary.listAll(), [stapleLibrary]);
+  const allStaples = useMemo(() => stapleLibrary.listAll(),
+    [stapleLibrary, stapleRevision]);
```

`checklistStaples`, `existingSections`, and `handleEditStaple`'s `stapleLibrary.listAll().find(...)` will all transitively re-evaluate.

**File:** `src/ui/StoreView.tsx`

Same pattern for `existingSections` (lines 33-36). Even though StoreView has no delete path today, an edit-staple add of a new section is currently invisible until remount.

### Optional follow-up (not strictly required for this defect)

- Extract the `useStapleLibrary()` hook that returns `{ allStaples, revision }` so consumers don't repeat the subscribe/revision boilerplate.

---

## 6. Files affected

| File | Change | Risk |
|---|---|---|
| `src/domain/trip.ts` | Add `removeItemsByStaple({id,name,houseArea})`; keep `removeItemByStapleId(id)` as id-only back-compat wrapper. Both no-op when nothing changes (skip notify/persist). | Domain change. Pure. Easily unit-tested. |
| `src/domain/trip.test.ts` | Update the `not-removed-without-stapleId` test, add fallback-match test, add no-op test, add cross-itemType safety test. | Test-only. |
| `src/hooks/useAppInitialization.ts` | Subscribe `onStapleChange` to `stapleLibrary.subscribe` in addition to `stapleStorage.onChange`; switch the `removed` loop to call `removeItemsByStaple`; track unsubscribe in `unsubscribeAll`. | Hook wiring. Idempotent diff means double-firing is safe. |
| `src/hooks/useAppInitialization.test.ts` (if present) | Add test: local `stapleLibrary.remove()` triggers trip cleanup without going through Firestore echo. | Test-only. |
| `src/ui/HomeView.tsx` | Drop dual-write in `handleDeleteStaple`; add `stapleRevision` state + `useEffect`-subscribe; thread revision through `allStaples` memo. | UI reactive memo. Low risk. |
| `src/ui/StoreView.tsx` | Same revision pattern for `existingSections`. | UI reactive memo. Low risk. |
| `src/hooks/useTrip.ts` | If the `removeItemByStapleId` UI consumer is fully removed, the hook-level export can stay (still useful for tests / future callers) — no change required. | None. |

---

## 7. Risk assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Fallback name+area match removes an unrelated trip item that coincidentally shares name+area with a deleted staple** | Low — a staple-typed trip item with same name+area as a deleted staple is, by the duplicate-detection invariant in `staple-library.isDuplicate` (`staple-library.ts:30-37`) and `handleAddFromChecklist` (`HomeView.tsx:124-126`), the *same* logical item. | Medium if it happened. | Restrict fallback to `itemType === 'staple'` items (one-offs preserved). Add test. The same `(name, houseArea)` pair already serves as the canonical staple identity in the codebase. |
| **Double-firing of `handleStapleChange` (once from `stapleLibrary.subscribe`, once from delayed Firestore echo) causes spurious trip writes** | Medium — own-write echo is mostly suppressed at the adapter layer, but timing is not guaranteed. | Low — `diffStaples(previousStaples, currentStaples)` returns empty arrays once the first fire has already updated `previousStaples`. The `if (next.length === items.length) return` guard in `removeItemsByStaple` prevents redundant `notify()`/`persistTrip()`. | Already mitigated by idempotent diff + early-return; covered by adding a "fires once" assertion to the integration test. |
| **`tripService.subscribe` listeners re-render `useTrip` consumers twice (once from manual `setItems`, once from notify) on every operation** | Already true today (no regression). | Low. | None required; a separate cleanup PR could remove the manual `setItems` calls in `useTrip` since `subscribe` now covers them. |
| **Removing the dual-write in HomeView before `useAppInitialization` is updated would regress the *fresh-stapleId* delete path** | Sequencing risk during code review/merge. | High during a partial merge. | Land Fix A + Fix B (init wiring) in the same commit as the HomeView dual-write removal. Tests in `useAppInitialization.test.ts` should fail loudly if the wiring is dropped. |
| **`StoreView` revision-counter reflow causes extra renders on every staple library mutation** | Certain. | Negligible — `existingSections` is a small set, render is cheap. | None required. Consistent with `SectionOrderSettingsScreen` already in production. |
| **Carryover items with `stapleId === undefined` (legacy data) suddenly become deletable** | Intended outcome, but is a behaviour change visible to existing users who currently rely on the bug-as-feature. | Low — described as a defect, not a feature. | Mention in delivery notes. |
| **Mutation testing (kill rate ≥ 80% on `src/domain/`)** | Domain change must keep mutation kill rate. | Medium for CI gating. | New tests for both branches of the fallback (id-match and name+area-match), the `itemType` guard, and the no-op early-return — all of these exist as natural targets for surviving mutants if not covered. |

**Overall risk:** **Low–Medium.** The change is in well-tested, pure domain code plus a single hook wiring change. The architectural correction (Fix B) generalizes a precedent already shipped (`fix-section-order-reactive`). The behavioural change (Fix A's name+area fallback) is gated to staple-typed items and aligns the delete contract with the add/duplicate-detection contract that already governs the codebase.

---

## 8. Prevention recommendations

1. **Lint/test rule:** add an integration test under `src/ui/HomeView.test.tsx` (currently missing) covering the full delete loop.
2. **Document the reactivity contract:** add a short note to `src/domain/staple-library.ts` (or a `docs/architecture/reactivity.md`) stating that domain mutators consume `stapleLibrary.subscribe`, while only adapter-level remote-sync logic consumes `stapleStorage.onChange`. This is the same boundary that `fix-section-order-reactive` established.
3. **Audit other domain ports** for the same pattern (`tripService.subscribe`, `areaManagement.subscribe`, `sectionOrderStorage.subscribe`) — confirm every consumer of `listAll()`-style reads is either explicitly subscribed or clearly documented as snapshot-only.
4. **Tighten the trip identity contract:** consider a non-null `stapleId` invariant for `itemType === 'staple'` trip items, with a one-shot migration that backfills `stapleId` by `(name, houseArea)` lookup against the current staple library on next load.  This would let us simplify Fix A back to id-only matching — but only after the migration has shipped to all users.

---

## Appendix — key code references

- `src/ui/HomeView.tsx:28, 34-46, 108-111, 323` — delete handler and stale memos.
- `src/hooks/useTrip.ts:120-126` — `removeItemByStapleId` React shim.
- `src/domain/trip.ts:269-292` — `syncStapleUpdate` and `removeItemByStapleId` (filter on `stapleId` only).
- `src/domain/staple-library.ts:22-25, 58-60, 158-168` — `subscribe`/`notify`, `remove`.
- `src/hooks/useAppInitialization.ts:159-173, 211-247` — `handleStapleChange` wired to `stapleStorage.onChange`.
- `src/adapters/firestore/firestore-staple-storage.ts:56-63, 91-97` — own-write echo suppression; local `remove` does not call `onChange`.
- `src/ui/SectionOrderSettingsScreen.tsx:47-53` — reactive subscription precedent (use as template).
- `src/domain/trip.test.ts:74-90` — test that codifies the Branch-A limitation.
