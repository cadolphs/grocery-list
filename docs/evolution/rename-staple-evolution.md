# Evolution: rename-staple

Date: 2026-04-26
Type: Feature (UI + domain, single-slice)
Branch merged to: main

## Feature Summary

Lets Clemens fix a typo in a staple's name after the fact. The Edit sheet (`MetadataBottomSheet` in `mode === 'edit'`) now renders a Name TextInput pre-filled with the staple's current name; tapping `Save Changes` propagates the new name through `onSaveEdit`'s changes payload, which the existing `syncStapleUpdate` channel uses to update any active trip-item referencing the staple by `stapleId`. Empty / whitespace-only / cross-staple-duplicate names are rejected with inline errors; same-name-different-area is allowed; no-op saves succeed; add mode and the title-snapshot are unaffected. UI changes in `src/ui/MetadataBottomSheet.tsx`; domain changes in `src/domain/staple-library.ts` (UpdateStapleChanges.name?, empty-name guard, post-merge name + post-merge duplicate check).

## Business Context

JS3 (Staple Item Management) was already validated by the prior `edit-staple` feature, which lets the user change `houseArea` / `section` / `aisle` on an existing staple. The `name` field stayed `readonly` — typos required delete-and-re-add, which broke trip-item linkage and inflated cognitive cost. This slice closes that gap with the smallest possible change: one new editable field with the same submit / validation surface as the surrounding edit-staple flow, plus a domain-layer rename merge so the new name actually persists end-to-end.

## What Was Implemented

Nine acceptance scenarios driven outside-in through `MetadataBottomSheet`, one step per AC, each landing on a green test suite before unskipping the next:

1. WS-RS-1 (visibility + tap-fills + save): Name TextInput pre-filled in edit mode; `Save Changes` calls `onSaveEdit` with `name` in the changes payload and dismisses.
2. M1-RS-1 (empty rejection): empty name keeps the sheet open with inline error `Name is required`; `onSaveEdit` not called. Symmetric domain guard.
3. M1-RS-2 (whitespace rejection): `.trim() === ''` from 01-02 covers it; unskip-only.
4. M1-RS-3 (duplicate rejection): renaming to a name owned by ANOTHER staple in the same area shows inline error `"<name>" already exists in <area>`; `onSaveEdit` not called.
5. M1-RS-4 (same-name different-area allowed): tripwire confirming `(name, area)` keying; unskip-only.
6. M1-RS-5 (trip-item sync via changes payload): `name` is included in the `onSaveEdit` payload at the component boundary; domain `updateStaple` actually merges `changes.name` into the persisted staple AND runs the duplicate check against the post-merge `updatedName` (symmetric with the UI guard from 01-04).
7. M1-RS-6 (no-op save): self-exclusion (`existing.id !== editStapleId`) lets a no-op save succeed; unskip-only.
8. M1-RS-7 (add-mode invariant): `mode === 'edit'` gate from 01-01 already hides the Name TextInput in add mode; unskip-only.
9. M1-RS-8 (title-snapshot invariant): title rendered from `itemName` prop, not `editedName` state; unskip-only.

Driving boundary: the React component itself, exercised via `@testing-library/react-native`. WS Strategy A — props are the boundary.

## Steps and Commits

| Step  | Scenario | Commit    | Source change |
|-------|----------|-----------|---------------|
| 01-01 | WS-RS-1  | `dff489f` | `feat(rename-staple): name field pre-fill + rename through onSaveEdit` — Name TextInput in edit mode, `editedName` state, payload plumbing; `UpdateStapleChanges.name?` type extension |
| 01-02 | M1-RS-1  | `52475fa` | `feat(rename-staple): reject empty name on rename` — UI inline error infrastructure (`nameError` state, error reset on text change), symmetric domain guard, 2 new unit tests |
| 01-03 | M1-RS-2  | `e67780c` | `test(rename-staple): activate M1-RS-2 whitespace-only rejection` — regression-protection only; no source change |
| 01-04 | M1-RS-3  | `a6ad06e` | `feat(rename-staple): reject duplicate name in same area on rename` — UI duplicate-check call with self-exclusion |
| 01-05 | M1-RS-4  | `33685c4` | `test(rename-staple): activate M1-RS-4 same-name-different-area allowed` — tripwire only; no source change |
| 01-06 | M1-RS-5  | `6888212` | `feat(rename-staple): merge name into updateStaple + post-merge duplicate check` — domain merge (`updatedName`), symmetric duplicate check, 2 new unit tests; also tracked `walking-skeleton.test.tsx` |
| 01-07 | M1-RS-6  | `ac57083` | `test(rename-staple): activate M1-RS-6 no-op save succeeds` — tripwire only; no source change |
| 01-08 | M1-RS-7  | `bf19711` | `test(rename-staple): activate M1-RS-7 add-mode invariant` — invariant tripwire; no source change |
| 01-09 | M1-RS-8  | `32ce2a4` | `test(rename-staple): activate M1-RS-8 title-snapshot invariant` — invariant tripwire; no source change |

RED-acceptance was driven before every GREEN. RED-unit was executed on 01-02 and 01-06 (real domain unit tests for empty-name and rename-merge / post-merge duplicate); skipped on the seven UI-only / regression-protection / invariant-tripwire steps with `NOT_APPLICABLE` rationale recorded per step in `execution-log.json`.

## L1-L4 Refactor Pass

Single sweep across `src/ui/MetadataBottomSheet.tsx` and `src/domain/staple-library.ts` after all nine scenarios green. Tests stayed green after every move (RPP).

| Level | Outcome | Detail |
|-------|---------|--------|
| L1 — composition / dead code | SKIPPED (N/A) | No dead code, no WHAT-comments, no unused imports introduced by the feature. |
| L2 — naming | SKIPPED (N/A) | `editedName`, `nameError`, `trimmedName` are all unambiguous and consistent with surrounding code. |
| L3 — single-responsibility | EXECUTED | Lifted the trim → empty → duplicate validation chain inside `handleSaveEdit` into two pure module-level helpers: `validateRename` returning a discriminated union `{ kind: 'invalid-empty' } \| { kind: 'invalid-duplicate', trimmedName, area } \| { kind: 'ok', trimmedName }`, plus a small `renameErrorMessage` mapping non-ok branches to user-facing strings. Mirrors the `decideSectionDropdownState` pattern from the prior staple-section-combobox feature. `handleSaveEdit` now reads as: validate → branch → submit. Commit `1a5546a`. |
| L4 — module structure / duplication | SKIPPED (N/A) | UI `'Name is required'` and domain `'name is required'` are intentional symmetric guards for different audiences (inline UI error vs programmatic Result error); wording difference is appropriate not drift. Add-mode has no name field so no rename/add overlap. |

Refactor record committed as `6bd4f0c docs(rename-staple): record L1-L4 refactor pass outcomes`.

## Post-Merge Integration Gate

| Aspect | Result |
|--------|--------|
| Feature acceptance suite | 9 passed, 0 skipped (`tests/acceptance/rename-staple/`) |
| Full repo test suite | 646 passed, 23 skipped (pre-existing), 0 failed |
| `npx tsc --noEmit` | clean |
| Edit-staple regression suite | 12 passed (no regression in adjacent UI flow) |
| Domain unit tests added | 4 (empty-name, whitespace-name, rename-merge, post-merge-duplicate) |
| Environment matrix | N/A — no DEVOPS wave; jest tests are environment-deterministic |

Gate verdict: PASS.

## Adversarial Review

Run via `@nw-software-crafter-reviewer`. Verdict: **APPROVED with zero defects**. All seven Testing Theater patterns (tautological tests, mock theater, coverage theater, implementation coupling, selective assertion, fixture theater, order-dependence) scanned **CLEAN**. AC-to-test mapping verified 9/9 with no orphans (plus 4 domain unit tests). Wiring smoke check PASS — `validateRename` and `renameErrorMessage` reachable from production render path via `handleSaveEdit`; `name` field flows through `onSaveEdit` callback to `useStapleLibrary().updateStaple` in production. L3 refactor (`1a5546a`) preserved all 13 tests; behaviour byte-identical (same untrimmed `editedName` passed to `onSaveEdit`; domain re-trims defensively). Domain symmetry verified: empty-name guard fires before duplicate check on both layers; `updatedName` computed once and used in both the duplicate check and the persisted record. Self-exclusion (`existing.id !== editStapleId`) verified at the call site. Title rendered from `itemName` prop, not `editedName` state. No revisions required.

## Mutation Testing

Run via `npx stryker run --mutate "src/domain/staple-library.ts"` post-implementation. Per CLAUDE.md scope, only the domain layer was mutated; UI is excluded.

| Metric | Value |
|--------|-------|
| Mutation score | **90.58%** |
| Killed | 125 |
| Survived | 13 |
| Timeout / NoCov / Errors | 0 / 0 / 0 |
| Break threshold | 80% |
| Verdict | **PASS** (≥80%) |

Surviving mutants are pre-existing trim-related branches (`updatedHouseArea.trim()`, `updatedStoreLocation.section.trim()`, `query.trim()`) and a listener-cleanup return statement — none are rename-specific holes. The rename-merge + post-merge duplicate-check branches added in 01-06 are killed by the new unit tests. Report: `reports/mutation/mutation.html`.

## Demo Evidence

Nine acceptance scenarios passing verbatim:

```
PASS tests/acceptance/rename-staple/walking-skeleton.test.tsx
  WS-RS-1: Renaming a staple persists the new name and dismisses the sheet
    ✓ pre-fills the Name field with the current name, accepts a rename, and saves through onSaveEdit

PASS tests/acceptance/rename-staple/milestone-1-rename.test.tsx
  M1-RS-1: Empty name is rejected with inline error
  M1-RS-2: Whitespace-only name is rejected with inline error
  M1-RS-3: Duplicate name in same area is rejected with inline error
  M1-RS-4: Same name in a different area is allowed
  M1-RS-5: Renaming includes the new name in the changes payload (so trip items sync)
  M1-RS-6: No-op save succeeds and dismisses
  M1-RS-7: Add mode does not render a Name TextInput
  M1-RS-8: Sheet title is a snapshot of the original name (does not live-update)

Test Suites: 2 passed, 2 total
Tests:       9 passed, 9 total
```

WS-RS-1 is the elevator-pitch demo at the driving-port boundary: renders the sheet with `initialValues.name = 'Milkk'`, types `'Milk'` into the Name TextInput, taps `Save Changes`, asserts `onSaveEdit` was called with `name: 'Milk'` in the changes payload, and asserts the sheet dismissed.

## Outcome KPIs (to measure post-ship)

| KPI | Target | Baseline | Measurement |
|-----|--------|----------|-------------|
| Typo correction success | ≥ X typos fixed in the first month without resorting to delete + re-add | Unknown — not previously measured | Self-report (single-user app) |
| Trip-item sync correctness | 0 ghost trip-items after rename (i.e. the rename's effect propagates to all linked trip-items via stapleId) | Unmeasured | Visual inspection of the active trip after a rename |

Single-user app; KPIs are self-reported by Clemens. No analytics infra.

## Lessons Learned

1. **Domain-type extension can ride with the walking-skeleton step.** DISTILL flagged a domain-ordering concern (`UpdateStapleChanges.name?` must land before any test asserts `name` in the changes payload). Bundling the type-only extension into 01-01 — without the behavioural merge — kept the walking skeleton minimal while making the typecheck pass end-to-end. Behavioural merge landed in 01-06 alongside the unit tests that pin it. Splitting "type" from "behaviour" is a useful seam when the type alone is enough to unblock downstream steps.

2. **Symmetric guards are not duplication.** The empty-name and duplicate-name checks live in BOTH the UI (for immediate inline feedback) and the domain (for defense-in-depth and mutation coverage). The L4 review correctly flagged this as intentional, not duplication: the audiences differ (rendered string vs programmatic `Result.error`), and removing either layer leaves a real defect surface. Worth recording as a pattern: UI-immediate + domain-authoritative guards for any user-input field that crosses a hexagonal boundary.

3. **Tripwire scenarios pay for themselves.** Three of the nine scenarios (M1-RS-4, M1-RS-6, M1-RS-7, M1-RS-8) ended up as unskip-only — no production change was needed because earlier steps already set up the right invariants. They cost almost nothing to keep, and each is a regression sentinel: M1-RS-4 catches accidental name-only duplicate keying, M1-RS-6 catches accidental loss of self-exclusion, M1-RS-7 catches accidental Name-TextInput leakage into add mode, M1-RS-8 catches accidental wiring of the title to live state. Cheap insurance.

4. **Mutation testing opens the right rename holes.** The 90.58% mutation score told us the rename-specific branches are well covered, while the surviving 13 mutants are mostly pre-existing trim-related and listener-cleanup spots that the rename feature didn't touch. The rename-merge (`updatedName ?? staple.name`) and the post-merge duplicate check (`isDuplicateExcludingSelf(... updatedName ...)`) were both killed by the new unit tests — the per-feature mutation policy paid off here even though only ~30 lines of domain code were added.

## Forward-looking Notes

- **OUT-of-scope follow-ups deferred from this slice**: rename UI in add mode (the user can already retype the name pre-sheet via QuickAdd, so add-mode rename is not a real need); legacy stapleId-less trip-items (the Firestore adapter reconciles them at load — out of scope for this acceptance suite); generic `sortByLocale<T>` helper consolidation (still no concrete second call-site; defer).
- **`validateRename` discriminated-union pattern is now reusable.** Mirrors `decideSectionDropdownState`. If a third validation chain lands (e.g. for QuickAdd duplicate detection at the add-mode boundary), promote the pattern into a shared `decideXyz` helper file rather than re-copying the discriminated-union shape inline.
- **Symmetry between UI inline-error wording and domain `Result.error` wording is intentional.** UI uses `Name is required` (capitalised, addresses the user); domain uses `name is required` (lowercase, structured field name). If either ever drifts towards the other, treat it as a regression.

## Related Files

Production:

- `src/ui/MetadataBottomSheet.tsx` — Name TextInput in edit mode, `editedName` + `nameError` state, `validateRename` + `renameErrorMessage` helpers, inline error render, duplicate-check call with self-exclusion
- `src/domain/staple-library.ts` — `UpdateStapleChanges.name?` type, empty-name guard, `updatedName` computation, post-merge duplicate check, name merge into persisted staple

Tests (preserved as living regression suite):

- `tests/acceptance/rename-staple/walking-skeleton.test.tsx`
- `tests/acceptance/rename-staple/milestone-1-rename.test.tsx`
- `tests/unit/domain/staple-library.test.ts` — extended with 4 new updateStaple tests (rename-related; preserved permanently)

Commits (chronological):

- `dff489f` — `feat(rename-staple): name field pre-fill + rename through onSaveEdit`
- `52475fa` — `feat(rename-staple): reject empty name on rename`
- `e67780c` — `test(rename-staple): activate M1-RS-2 whitespace-only rejection`
- `a6ad06e` — `feat(rename-staple): reject duplicate name in same area on rename`
- `33685c4` — `test(rename-staple): activate M1-RS-4 same-name-different-area allowed`
- `6888212` — `feat(rename-staple): merge name into updateStaple + post-merge duplicate check`
- `ac57083` — `test(rename-staple): activate M1-RS-6 no-op save succeeds`
- `bf19711` — `test(rename-staple): activate M1-RS-7 add-mode invariant`
- `32ce2a4` — `test(rename-staple): activate M1-RS-8 title-snapshot invariant`
- `1a5546a` — `refactor(rename-staple): extract validateRename helper from handleSaveEdit`
- `6bd4f0c` — `docs(rename-staple): record L1-L4 refactor pass outcomes`
