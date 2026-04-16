# RCA: Newly-added staple sections missing from Section Order (Re-Order) screen

Date: 2026-04-16
Analyst: Rex (Toyota 5 Whys)
Configuration: investigation_depth=5, multi_causal=true, evidence_required=true

## 1. Problem Definition and Scope

### Symptom
During the Sweep flow, a user adds a new staple whose `storeLocation.section` (or `section::aisleNumber` key) does not yet appear in any existing staple. On navigating to Settings > Section Order, the newly-added section is not rendered in the re-order list. Existing sections are still shown in their saved custom order.

### Scope
- Affected surface: `SectionOrderSettingsScreen` (the re-order UI) when a custom section order has previously been saved (i.e. `sectionOrderStorage.loadOrder()` returns a non-null array).
- Affected flow: add staple via `MetadataBottomSheet` (Sweep or Checklist), then open Settings > Section Order in the same session.
- Unaffected: first-time usage where no custom order has been set (`order === null`). In that path the screen falls back to `knownSectionKeys` derived from staples, so the new section does show up.
- Unaffected: store-view ordering itself (the `sortByCustomOrder` function already sorts unknown keys to the end of the list; they are not lost in StoreView).

### Environmental Context
- React Native / Expo SDK 54, functional TypeScript, ports-and-adapters.
- Relevant domain: `src/domain/section-ordering.ts`.
- Relevant UI: `src/ui/SectionOrderSettingsScreen.tsx`.
- Relevant hook: `src/hooks/useSectionOrder.ts`.
- Relevant port: `src/ports/section-order-storage.ts` (loadOrder / saveOrder / clearOrder; no change notifications).
- Relevant design: `docs/adrs/ADR-006-section-order-storage-and-sort-override.md`.
- Relevant behavioural spec: `docs/feature/store-section-order/...` and user story US-SSO-04 "New Section Auto-Appends to Custom Order".

### Initial Evidence
1. `src/domain/section-ordering.ts:25-32` defines `appendNewSections(currentOrder, knownSectionKeys)` — a pure function purpose-built to merge new section keys into an existing saved order.
2. `Grep appendNewSections` in `src/` returns a single match: the definition at `src/domain/section-ordering.ts:25`. It is imported and used only by acceptance tests (`tests/acceptance/store-section-order/milestone-1-section-management.test.tsx:22`). No production code path calls it.
3. `src/ui/SectionOrderSettingsScreen.tsx:56-61` computes `orderedEntries` with a hard branch: if `order !== null`, the display is built exclusively from the stored `order`; the `knownSectionKeys` derived from `stapleLibrary.listAll()` is ignored whenever a custom order exists.
4. `src/ui/SectionOrderSettingsScreen.tsx:42-54` memoises `knownSectionKeys` over `[stapleLibrary]`. The `stapleLibrary` reference is stable across renders (created once in `useAppInitialization`), so the memo never re-evaluates on subsequent staple additions anyway.
5. `src/hooks/useSectionOrder.ts:13-31` keeps `order` in `useState` initialised from `sectionOrderStorage.loadOrder()` and only updates it via `reorder`/`reset`. There is no reactive subscription to staple-library mutations.
6. `src/ports/section-order-storage.ts:1-8` exposes only `loadOrder / saveOrder / clearOrder`. No subscription API; no change callback.
7. `src/domain/staple-library.ts:52-144` has no observer pattern: `addStaple`, `addOneOff`, `updateStaple`, `remove` mutate storage but emit no notification that the section-order hook could listen to.
8. Regression tests at `tests/regression/ui/section-order-settings.test.tsx` cover: accessibility, rendering known sections (no custom order), rendering in custom order, reorder up/down, and reset. There is no test for the scenario "add a new staple with a new section while a custom order is saved, then verify the new section appears in the reorder screen."

### Problem Statement (scoped)
When `sectionOrderStorage.loadOrder()` returns a non-null array and a user subsequently adds a staple introducing a section key that is absent from that array, the Section Order settings screen fails to include the new section in its row list. This defect persists until the user resets the custom order or adds the section through some other trigger that happens to force `knownSectionKeys` recomputation and the custom-order branch is changed to also merge known keys.

---

## 2. Toyota 5 Whys — Multi-Causal Analysis

Three independent causal branches were identified. All three must be addressed to fully fix the defect.

### Branch A — Domain logic: `appendNewSections` is defined but never invoked

**WHY 1A (Symptom)**: The Section Order screen does not display newly-added sections.
Evidence: `src/ui/SectionOrderSettingsScreen.tsx:56-61` — when `order !== null`, `orderedEntries` is built from `order.map(parseSectionKey)`. `knownSectionKeys` is only used as a fallback when `order === null`.

**WHY 2A (Context)**: The screen never merges "sections currently known from staples" into "sections persisted in the custom order."
Evidence: `src/ui/SectionOrderSettingsScreen.tsx:57-60` — the conditional `if (order !== null) return order.map(parseSectionKey);` short-circuits without considering `knownSectionKeys`.

**WHY 3A (System)**: There is a purpose-built pure function `appendNewSections(currentOrder, knownSectionKeys)` that would perform exactly this merge, but nothing in production calls it.
Evidence: `src/domain/section-ordering.ts:25-32`:
```ts
export const appendNewSections = (
  currentOrder: string[],
  knownSectionKeys: string[],
): string[] => {
  const existingSet = new Set(currentOrder);
  const newSections = knownSectionKeys.filter((key) => !existingSet.has(key));
  return newSections.length === 0 ? currentOrder : [...currentOrder, ...newSections];
};
```
Grep confirms only the acceptance-test file imports it (`tests/acceptance/store-section-order/milestone-1-section-management.test.tsx:22`).

**WHY 4A (Design)**: The feature was implemented bottom-up — domain function first (commit `8131257 feat: add appendNewSections pure function for auto-appending new sections`, Step-ID `02-01`), UI screen second (commit `748d8b9 feat: add SectionOrderSettingsScreen with reorder and reset`) — and the wiring step that connects the function into UI or hook was never completed. The domain-level acceptance tests at `tests/acceptance/store-section-order/milestone-1-section-management.test.tsx:48-110` exercise the function in isolation with literal arguments; they do not exercise the UI path. Because the pure-function tests passed, the "US-SSO-04 auto-append" acceptance box appeared green even though the production wiring was missing.

**WHY 5A (Root Cause)**: No call site exists to invoke `appendNewSections` on the cross-section-of-interest (custom order ∪ staple-derived known keys) at either read time (when the screen renders) or write time (when a staple is added). The design intent documented in ADR-006 and US-SSO-04 is implicit — it lives in pure-function unit tests — but there is no integration seam that performs the merge against live staple data before presenting/persisting the order.

**ROOT CAUSE A**: Dangling pure-function — `appendNewSections` was authored but never integrated into the read or write path, and no integration test asserts that it runs.

### Branch B — View not reactive to staple mutations

**WHY 1B (Symptom)**: Even if we fix branch A by calling `appendNewSections`, the Section Order screen still would not pick up a section added after the screen was first mounted, because the inputs it depends on are not reactive.
Evidence: Users navigate to the screen from `HomeView` after performing sweep actions. The screen is mounted fresh on navigation (via `settingsView === 'section-order'` in `src/ui/HomeView.tsx:162-173`), so in the reported flow it is re-mounted; however the underlying hook is still non-reactive which prevents any future "add while screen open" scenario and reveals a latent defect.

**WHY 2B (Context)**: `useSectionOrder` treats section order as purely local state initialised from storage at mount and mutated only through its own setters.
Evidence: `src/hooks/useSectionOrder.ts:15` — `const [order, setOrder] = useState<string[] | null>(() => sectionOrderStorage.loadOrder());`. Updates happen only in `reorder` (line 17-23) and `reset` (line 25-28). There is no `useEffect` re-reading storage, no subscription API, no dependency on staple counts.

**WHY 3B (System)**: The staple storage layer does not emit change notifications consumable by React, and `SectionOrderStorage` has no subscription API.
Evidence: `src/ports/section-order-storage.ts:4-8` — port exposes only `loadOrder/saveOrder/clearOrder`. `src/domain/staple-library.ts` — no observer pattern; mutations return a `Result`, no callback. `src/ui/SectionOrderSettingsScreen.tsx:42-54` memoises `knownSectionKeys` over `[stapleLibrary]`; the reference is stable (see `src/hooks/useAppInitialization.ts` where the library is constructed once), so the memo effectively never re-runs.

**WHY 4B (Design)**: The existing architecture for "cross-aggregate reactivity" is to have each hook own its own in-memory state and re-read storage only on its own setter calls. Staples live under `stapleLibrary` (no React state in the library), and `sectionOrderStorage` is a separate aggregate. No explicit design decision was made about how "new staple section" should propagate to "section order view" — it is simply an unaddressed cross-aggregate concern. ADR-006's "sections are emergent from items, not managed entities" clause actually anticipates this (sections are a derived view of staples), but the implementation did not introduce a corresponding derivation/subscription mechanism at the UI layer.

**WHY 5B (Root Cause)**: There is no reactive or pull-on-focus mechanism to ensure that `SectionOrderSettingsScreen` observes up-to-date staple-derived sections. On the specific re-navigation flow in the report, the screen does remount, so this branch is latent for the reported steps — but it compounds with Branch A (re-mounting still reads from `order`, not from `order ∪ known keys`), and becomes an active defect in any flow where a staple is added while the screen is mounted.

**ROOT CAUSE B**: Stale-read latent defect — `knownSectionKeys` is memoised against a stable reference; `order` is local state; no mechanism re-derives either from current staple data between renders triggered by navigation or external events.

### Branch C — Missing integration/regression test for the scenario

**WHY 1C (Symptom)**: The defect shipped without being caught by any automated test.
Evidence: `tests/regression/ui/section-order-settings.test.tsx` includes 6 tests (lines 54-119). None of them (a) seed a custom order AND (b) add a new staple with a new section AND (c) assert the new section is rendered.

**WHY 2C (Context)**: The acceptance tests for US-SSO-04 are pure-domain tests; the regression tests for the screen are pure-UI tests. There is no test that spans UI + staple-library + section-order-storage in the specific sequence "order exists → add staple → open screen."
Evidence: `tests/acceptance/store-section-order/milestone-1-section-management.test.tsx:48-110` calls `appendNewSections` with literal arrays. `tests/regression/ui/section-order-settings.test.tsx:20-46` seeds staples and custom order at render time but never mutates the staple library after render.

**WHY 3C (System)**: The "add staple with a new section" mutation path is a legitimate user action but the test pyramid assumed it would be covered by a dedicated acceptance test that wires UI to domain. That acceptance test was never authored/enabled.
Evidence: `tests/acceptance/store-section-order/milestone-1-section-management.test.tsx:1-16` declares Milestone 1 covers US-SSO-04 et al., but the only enabled tests for US-SSO-04 (lines 54-110) are pure-function unit tests. The heading "AC: New sections are visible in store view and settings immediately" is documented in the test file comment (lines 50-52) but has no corresponding test body.

**WHY 4C (Design)**: The delivery workflow split "design pure function" from "wire pure function into UI," and the green domain tests were interpreted as evidence that the user story was complete. No test-pyramid rule enforced "every pure function has at least one production call site exercised by an integration test."

**WHY 5C (Root Cause)**: Missing end-to-end coverage of US-SSO-04 "AC: new sections visible in settings immediately." The gap is not purely a missing assertion; it is a missing test scenario and a missing workflow gate that would have forced the wiring.

**ROOT CAUSE C**: Missing integration test asserting that newly-added staple sections appear in the Section Order screen when a custom order is already saved.

---

## 3. Cross-Validation

### Forward trace (root cause → symptom)
- Root Cause A alone produces the reported symptom on every re-open of the screen when a custom order exists.
- Root Cause B alone produces a related symptom when the screen is open at the moment of staple add (re-render does not pick up the new section even if A were fixed to merge).
- Root Cause C explains why neither A nor B was caught pre-release.
- If A is fixed (call `appendNewSections` when rendering `orderedEntries`) the reported symptom disappears for the re-navigation flow because the screen re-mounts and re-reads staples; B would remain latent until triggered by a different flow.
- If B is fixed without A, the screen would still ignore new sections because the custom-order branch never merges `knownSectionKeys`.

### Consistency check
No contradictions between branches. A is a bug in domain-to-UI wiring; B is a limitation of the reactivity model; C is a coverage gap. All three are orthogonal and additive.

### Symptom coverage
- Reported user flow "add staples, navigate to reorder screen, new sections missing" → fully explained by A; B and C compound but are not required to reproduce.

---

## 4. Contributing Factors

1. **Naming of `existingSections` in `HomeView`** (`src/ui/HomeView.tsx:38-41`) uses `new Set(allStaples.map(s => s.storeLocation.section))` but only passes the plain section names to `MetadataBottomSheet` for suggestion. It is computed inline, not shared with the settings screen. This masks the absence of a single source-of-truth helper that exposes section keys (`section::aisleNumber`) derived from staples — if such a helper existed, both call sites would likely use it, and the merge would be forced by code review.
2. **ADR-006 does not explicitly specify the "new-section-discovery" integration point.** The ADR describes the pure function (decision 3) but not where in the render/write pipeline the auto-append runs. Branch A could have been caught by ADR review.
3. **`useSectionOrder` does not take a `knownKeys` parameter or return a derived `displayOrder`.** The hook returns raw `order` and leaves the merge to the caller, which puts the burden of correctness on each UI call site. There is currently exactly one call site (`SectionOrderSettingsScreen`), and it gets it wrong.
4. **Stryker mutation testing is scoped to `src/domain/` and `src/ports/` only** (per `CLAUDE.md` > Mutation Testing Strategy). Even aggressive mutation testing of `section-ordering.ts` would not flag that `appendNewSections` has no production call site — mutations measure whether tests fail when code mutates, not whether code is reachable from production. The gap is a coverage gap in the integration-test layer, not the domain layer.

---

## 5. Proposed Fix

The fix has one required change (addresses Root Cause A, eliminates the reported symptom) and two recommended supporting changes (address Root Cause B latent defect and Root Cause C coverage gap). No fix is implemented in this RCA; the caller will execute the changes via the nwave workflow.

### 5.1 Required — Merge new sections into display and into persisted order (Root Cause A)

Behavioural decision to confirm with product: US-SSO-04 acceptance says "Auto-append happens when item is added (not deferred) / New sections are visible in store view and settings immediately." Two valid implementation strategies:

- **Strategy 1 (write-time append) — preferred, matches US-SSO-04 "not deferred":** Call `appendNewSections` from `SectionOrderSettingsScreen` on render and persist via `reorder` whenever the merged list differs from the stored list. This keeps storage consistent with the user's actual section universe.
- **Strategy 2 (read-time merge) — simpler, lower risk:** Call `appendNewSections` only when computing `orderedEntries`; never mutate storage from the settings screen. Storage stays as the user's last explicit ordering; new sections are shown but only persisted the next time the user reorders or resets.

Strategy 2 is lower-risk for the fix; Strategy 1 is more faithful to US-SSO-04. Recommend implementing Strategy 2 as the defect fix and creating a follow-up ticket to decide whether write-time persistence is actually required (it changes the semantics of "reset to default" when storage has silently absorbed sections).

**Proposed change (Strategy 2), `src/ui/SectionOrderSettingsScreen.tsx:56-61`:**

```ts
import { appendNewSections, sortByCustomOrder } from '../domain/section-ordering';
// ... (existing imports)

const orderedEntries: SectionEntry[] = useMemo(() => {
  if (order !== null) {
    const merged = appendNewSections(order, knownSectionKeys);
    return merged.map(parseSectionKey);
  }
  return knownSectionKeys.map(parseSectionKey);
}, [order, knownSectionKeys]);
```

This is a minimal, local change. It reuses the already-tested pure function.

### 5.2 Recommended — Make `knownSectionKeys` reactive to staple changes (Root Cause B)

Two orthogonal options:

- **Option B1 (small):** Lift `knownSectionKeys` out of the settings screen into a shared hook `useKnownSectionKeys()` that refreshes on focus (via `useFocusEffect` from `@react-navigation` or manual refresh in `useEffect` triggered by the settings-screen mount). Because in the reported flow the screen already re-mounts, this only hardens the code against future UI changes.
- **Option B2 (larger, architectural):** Add a lightweight observer to `StapleLibrary` (e.g. `stapleLibrary.subscribe(onChange)`) that the hook listens to. This is invasive and should be weighed against Option B1's simplicity. Not required to fix the reported defect.

Recommend Option B1 deferred until a real "add staple while settings open" scenario is reported or a future feature requires it. Flag it as a known latent defect.

### 5.3 Recommended — Add regression test for the failing scenario (Root Cause C)

Add to `tests/regression/ui/section-order-settings.test.tsx` a test of the form:

```ts
it('shows newly-added staple sections when a custom order is already saved', () => {
  const { stapleLibrary, storage } = renderAppWithSections(
    ['Deli::null', 'Dairy::3', 'Bakery::1'],
  );
  // (refactor renderAppWithSections to return the stapleLibrary too)

  // User adds a staple introducing a new section
  stapleLibrary.addStaple({
    name: 'Sushi Platter',
    houseArea: 'Fridge',
    storeLocation: { section: 'Sushi Bar', aisleNumber: null },
  });

  navigateToSectionOrderSettings();

  const sectionRows = screen.getAllByTestId(/^section-row-/);
  expect(sectionRows.map(r => r.props.testID)).toEqual([
    'section-row-Deli',
    'section-row-Dairy',
    'section-row-Bakery',
    'section-row-Sushi Bar',
  ]);
});
```

This test would have failed against the current code (the new section would be missing), would pass against the fix in 5.1, and guards against regression.

### 5.4 Non-changes
- Do NOT modify `src/domain/section-ordering.ts` — `appendNewSections` is correct.
- Do NOT modify `src/ports/section-order-storage.ts` — port contract is sufficient.
- Do NOT modify `src/hooks/useSectionOrder.ts` (unless implementing Option B1/B2).
- Do NOT modify `src/ui/StoreView.tsx` — StoreView correctly uses `sortByCustomOrder`, which already sorts unknown keys to the end; new sections are visible in the store view today.

---

## 6. Files Affected

| File | Role | Change |
|------|------|--------|
| `src/ui/SectionOrderSettingsScreen.tsx` | UI screen | Modified — call `appendNewSections` inside `orderedEntries` useMemo (5.1) |
| `tests/regression/ui/section-order-settings.test.tsx` | Regression tests | Modified — add failing-before-fix test for new-section visibility (5.3); refactor `renderAppWithSections` to return `stapleLibrary` |
| `docs/adrs/ADR-006-section-order-storage-and-sort-override.md` | ADR | Optional follow-up — document where `appendNewSections` is invoked in the render/write pipeline |
| `src/hooks/useSectionOrder.ts` | Hook | Not modified for the fix; candidate for Option B1 follow-up |
| `src/domain/section-ordering.ts` | Domain | Not modified (already correct) |
| `src/ports/section-order-storage.ts` | Port | Not modified |

---

## 7. Risk Assessment

### Risk of the proposed fix (5.1)

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Visual regression — a section the user previously removed from the custom order silently re-appears | Low | Medium — user may experience "I moved X to end and it came back" | US-SSO-04 acceptance explicitly states new sections auto-append; removing a section is not a supported op (only reordering). This is expected behaviour, but worth mentioning in the PR description. |
| Performance regression in `orderedEntries` memo | Negligible | Negligible | `appendNewSections` is O(n+m) on ≤20 sections. Identical big-O to existing code. |
| Break the existing reset flow | Very low | Low | `reset()` calls `clearOrder()`, which sets `order === null`. The new branch only runs when `order !== null`, so reset behaviour is unchanged. Covered by existing test `resets to default order and persists` (`tests/regression/ui/section-order-settings.test.tsx:108-118`). |
| Stryker mutation testing regression | None | None | Domain code is untouched; mutation testing scope (`src/domain/**`, `src/ports/**` per `CLAUDE.md`) is not affected. |
| Cross-device sync divergence (Strategy 1 only) | — | — | Not applicable to Strategy 2. If Strategy 1 is later adopted, two devices could race to append different sections; Firestore adapter's own-write echo detection (`src/adapters/firestore/firestore-section-order-storage.ts:43-61`) mitigates but re-evaluation needed. |
| `knownSectionKeys` is still non-reactive (B unresolved) | Low | Low | The reported flow re-mounts the screen, so reactivity does not block the fix. Flagged as 5.2 follow-up and as latent defect. |

### Risk of NOT fixing
User cannot reorder newly-added sections once they have a custom order. Workaround is "reset to default, re-order from scratch" — destructive and laborious. Defect will recur with every new section add.

### Overall risk rating
**LOW** for Strategy 2 (5.1) + regression test (5.3). Change is localised to one UI component, reuses an already-tested pure function, and is covered by a new regression test that demonstrates the fix value.

---

## 8. Prevention Strategies

1. **Dead-code guard on domain exports**: Add a lint rule or CI check that every exported symbol from `src/domain/**` has at least one import from `src/ui/**`, `src/hooks/**`, or `src/adapters/**` (i.e. excluding test-only imports). `appendNewSections` would have tripped this gate.
2. **Acceptance test template requires UI wiring**: Update the feature workflow so US-SSO-0x acceptance tests exercise the UI path at least once when the user story says "visible in the screen immediately." Pure-function tests are necessary but not sufficient for ACs that mention UI visibility.
3. **ADR integration-point checklist**: When an ADR introduces a new pure function, require the ADR (or its companion design doc) to name the specific call site(s) where the function will be invoked in production. Makes missing wiring visible at review time.
4. **Shared `useKnownSectionKeys` hook**: Consolidate section-key derivation from staples into a single hook so multiple UI screens (`HomeView`'s `existingSections`, `SectionOrderSettingsScreen`'s `knownSectionKeys`, `StoreView`'s `existingSections`) all share one implementation. Prevents future drift.

---

## 9. Summary

| Root cause | Layer | Fix | Priority |
|------------|-------|-----|----------|
| A. `appendNewSections` never called in production | UI (`SectionOrderSettingsScreen`) | Call it inside `orderedEntries` useMemo | P0 — ships the fix |
| B. `knownSectionKeys` non-reactive to staple additions | Hook/port | Focus-based refresh or subscription API | P2 — latent, ship as follow-up |
| C. Missing integration test for US-SSO-04 "visible in settings immediately" | Test suite | Add regression test that fails pre-fix, passes post-fix | P1 — ship with the fix |

**Recommendation**: Ship A + C together in a single feature branch via the nwave workflow. Track B as a follow-up ticket with the evidence in this RCA.
