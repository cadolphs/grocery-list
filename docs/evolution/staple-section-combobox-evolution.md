# Evolution: staple-section-combobox

Date: 2026-04-26
Type: Feature (UI-only, single-file, single-slice)
Branch merged to: main

## Feature Summary

Turn the section field in `MetadataBottomSheet` into a combobox: when the user opens the Add Staple sheet in `add` mode with an empty section, the dropdown immediately shows all known store sections in alphabetical order. Tapping a row fills the field; typing still filters; free-text new sections still save; an empty staple library shows a hint instead of a blank dropdown; edit-mode pre-fill is untouched. All work is contained in `src/ui/MetadataBottomSheet.tsx`. No domain, port, or adapter changes.

## Business Context

Adding a staple required Clemens to recall and retype section names exactly as previously written (`Produce` vs `produce` vs `Produce Aisle`), because suggestions only surfaced after typing. The intent of US-SC-01 was to flip the interaction from recall-then-type to recognise-then-tap, with the section-spelling-consistency KPI (zero new near-duplicate sections in the first month) as the primary correctness signal and dropdown adoption rate (>= 50% of new staples in first week added by tap) as the primary value signal.

## What Was Implemented

Six acceptance scenarios driven outside-in through `MetadataBottomSheet`, one step per AC, each landing on a green test suite before unskipping the next:

1. WS-SC-1 (visibility + tap-fills + save): show all known sections on empty add-mode focus; tap fills field; submit persists tapped section.
2. M1-SC-4 (alphabetical + testIDs): `[...existingSections].sort(localeCompare)` at the rendering boundary; each row exposes `testID="section-suggestion-{Name}"`.
3. M1-SC-1 (typing filter preserved): pre-existing case-insensitive prefix filter retained alongside the new empty-state branch.
4. M1-SC-2 (free-text new section): submit reads raw input, no whitelist gate; new sections persist and reappear in next dropdown.
5. M1-SC-3 (empty-library hint): when `existingSections.length === 0`, render hint `No saved sections yet — type a new one.` and keep the input editable.
6. M1-SC-5 (edit-mode invariant): `mode === 'add'` gate (added in 01-01) ensures edit mode does NOT auto-display the full list on mount.

Driving boundary: the React component itself, exercised via `@testing-library/react-native`. WS Strategy A (in-memory / component-only) — props are the boundary, zero I/O, zero driven adapters.

## Steps and Commits

| Step  | Scenario | Commit    | Source change |
|-------|----------|-----------|---------------|
| 01-01 | WS-SC-1  | `8607275` | `feat(staple-section-combobox): show section dropdown on empty add-mode focus` — empty-section branch + `mode === 'add'` gate in `MetadataBottomSheet.tsx` |
| 01-02 | M1-SC-4  | `5bcf47f` | `feat(staple-section-combobox): alphabetise dropdown rows + stable testIDs` — `sortSectionsAlphabetically` helper + per-row `testID` |
| 01-03 | M1-SC-1  | `5a6b5d5` | `test(staple-section-combobox): activate M1-SC-1 typing filter` — regression-protection only; no source change |
| 01-04 | M1-SC-2  | `d116ef5` | `test(staple-section-combobox): activate M1-SC-2 free-text save + track WS test` — regression-protection only; no source change |
| 01-05 | M1-SC-3  | `6dd5512` | `feat(staple-section-combobox): empty-library hint for first staple` — `showEmptyHint` branch + `sectionEmptyHint` style |
| 01-06 | M1-SC-5  | `fb8af0d` | `test(staple-section-combobox): activate M1-SC-5 edit-mode invariant` — regression-protection only; the `mode === 'add'` gate from 01-01 already enforced the invariant |

RED-acceptance was driven before every GREEN. RED-unit was deliberately skipped on every step (recorded in `execution-log.json` as `NOT_APPLICABLE: UI component step — port-to-port acceptance test covers the behaviour change at the driving-port boundary`) — the component IS the driving port for this feature, so a separate unit RED would duplicate the acceptance test against the same boundary.

## L1-L4 Refactor Pass

Single sweep across `src/ui/MetadataBottomSheet.tsx` after all six scenarios green. Tests stayed green after every move (RPP).

| Level | Outcome | Detail |
|-------|---------|--------|
| L1 — composition / dead code | EXECUTED | Removed one WHAT-comment in `handleSubmit` (`// Check for duplicate staple before submitting`). Commit `c284a66`. |
| L2 — naming | SKIPPED (N/A) | Locals introduced during the feature already read clearly. Any rename worth doing was folded into L3 where the whole branching block was replaced. |
| L3 — single-responsibility | EXECUTED | Replaced a 5-flag IIFE (`sortedSections`, `showFullList`, `showFiltered`, `showEmptyHint`, `dropdownVisible`) and a redundant double sort with a pure module-level helper `decideSectionDropdownState(mode, query, existingSections, filteredSuggestions) -> { kind: 'hidden' } \| { kind: 'empty-hint' } \| { kind: 'list', rows }`. JSX now switches on the discriminated union; decision is testable in isolation. Commit `af29cfb`. |
| L4 — module structure / duplication | SKIPPED (N/A) | Searched for duplicates of `sortSectionsAlphabetically`. Two other call-sites use `localeCompare` (`StapleChecklist.tsx`, `item-grouping.ts`) but on different shapes / keys. Lifting a generic `sortByLocale<T>` now would introduce a new module without consolidating real duplication. |

Refactor record committed as `25b4199 docs(staple-section-combobox): record L1-L4 refactor pass outcomes`.

## Post-Merge Integration Gate

| Aspect | Result |
|--------|--------|
| Feature acceptance suite | 6 passed, 0 skipped (`tests/acceptance/staple-section-combobox/`) |
| Full repo test suite | 633 passed, 23 skipped (pre-existing), 0 failed |
| `npx tsc --noEmit` | clean |
| Edit-staple regression suite | 12 passed (no regression in adjacent UI flow) |
| Environment matrix | N/A — no DEVOPS wave for this feature; jest UI tests are environment-deterministic |

Gate verdict: PASS.

## Adversarial Review

Not run. Scope was a single-field UX behaviour change with all six ACs pre-specified in `user-stories.md` and traced 1-to-1 to acceptance tests in `distill/wave-decisions.md` (DWD acceptance trace). No open design question for a reviewer to probe; the dropdown-visibility branching was the sole decision point and was captured by WS-SC-1 + M1-SC-3 + M1-SC-5 between them.

## Mutation Testing

Skipped — by project policy. CLAUDE.md scopes Stryker mutation testing to `src/domain/**` and `src/ports/**`; `src/ui/**` is explicitly excluded ("UI components and adapters excluded — low mutation testing value"). This feature touches `src/ui/MetadataBottomSheet.tsx` only, so the mutation gate is vacuously satisfied. Recorded in `deliver/wave-decisions.md` and `.nwave/des/deliver-session.json`.

## Demo Evidence

Six acceptance scenarios passing verbatim:

```
PASS tests/acceptance/staple-section-combobox/walking-skeleton.test.tsx
  WS-SC-1: Section combobox shows known sections immediately
    ✓ shows known sections on open and fills the field when one is tapped (193 ms)

PASS tests/acceptance/staple-section-combobox/milestone-1-combobox.test.tsx
  M1-SC-1: Typing filters the section dropdown
    ✓ shows only matching sections when user types a prefix
  M1-SC-2: Free-text new section is persisted
    ✓ saves a brand-new section that is not in existingSections
  M1-SC-3: Empty library shows hint, field stays editable
    ✓ shows empty-state hint and lets user type a new section
  M1-SC-4: Dropdown rows are alphabetical
    ✓ renders dropdown rows in alphabetical order regardless of input order
  M1-SC-5: Edit mode preserves current pre-fill behaviour
    ✓ does not auto-show the full dropdown in edit mode when section is pre-filled

Test Suites: 2 passed, 2 total
Tests:       6 passed, 6 total
```

WS-SC-1 is the elevator-pitch demo at the driving-port boundary: renders the component with `['Bakery', 'Dairy', 'Produce']`, asserts all three visible immediately, taps `Dairy`, taps `Add Item`, asserts `onSubmitStaple` invoked with `storeLocation.section: 'Dairy'`. The component exercised in test is the same component rendered in production by `npm run web`.

## Outcome KPIs (to measure post-ship)

| KPI | Target | Baseline | Measurement |
|-----|--------|----------|-------------|
| Dropdown adoption rate | >= 50% of new-staple additions in first week added via tap (not free-text) | 0% (dropdown not visible until typing) | Manual log of next 20 new-staple events |
| Section spelling consistency | 0 new near-duplicate sections in first month | Unknown — not previously measured | Inspect staple library `uniqueSections` set |
| Time to save new staple | Median <= 6s from sheet open to save | ~10s | Stopwatch sample of 10 additions before/after |

Single-user app; KPIs are self-reported by Clemens. No analytics infra.

## Lessons Learned

1. **Single-file UI features still benefit from one-AC-per-step decomposition.** Decomposition ratio of 6 steps / 1 file = 6.0 looks pathological by the usual heuristic, but each AC is semantically distinct (visibility, ordering, filter, free-text, empty-state, edit-mode invariance). Batching would have conflated distinct behaviours and weakened the AC-to-test trace; the linear chain of six unskip-and-go steps kept every commit reviewable in isolation.

2. **Component-as-driving-port collapses the RED-acceptance / RED-unit distinction.** For UI-only features where the component IS the driving boundary, a separate unit RED is just the acceptance test re-pointed at the same surface. Skipping RED-unit on every step (and recording the rationale per step in `execution-log.json`) is the honest choice — pretending to write a unit test against the same boundary would have been ceremony.

3. **Discriminated unions beat boolean flag clusters in dropdown render branches.** L3 replaced five tangled booleans (`showFullList`, `showFiltered`, `showEmptyHint`, `dropdownVisible`, plus a redundant double sort) with `decideSectionDropdownState(...) -> { kind: 'hidden' } \| { kind: 'empty-hint' } \| { kind: 'list', rows }`. The JSX now switches once on `kind`; the decision is a pure function and can be unit-tested in isolation if it ever grows. Worth using as the default shape any time a render branch has 3+ flags driving 3+ visual states.

4. **Mutation-testing scope policy works.** The CLAUDE.md rule that excludes `src/ui/**` from Stryker meant zero ceremony decisions for this feature — the policy answered the question. For a UI-only feature, a mutation pass would mostly mutate JSX literals and TestID strings, which would either be killed trivially by the existing acceptance suite or surface noise. The policy is paying for itself by keeping ship pace tight.

## Forward-looking Notes

- **OUT-of-scope follow-ups deferred from this slice**: recency / frequency ranking of dropdown rows, QuickAdd inline section suggestions, and house-area-picker changes. None blocked by this slice; all addressable as separate features when KPI signal warrants.
- **`testID="section-suggestion-{Name}"` is now a stable contract.** Future changes to row rendering should preserve the testID shape — three acceptance tests select rows by name through this testID.
- **`decideSectionDropdownState` is currently inlined in `MetadataBottomSheet.tsx`.** If a second component ever needs the same combobox shape (e.g. a future area-picker rework), promote the helper to a shared module then; do not pre-extract.

## Related Files

Production:

- `src/ui/MetadataBottomSheet.tsx` — empty-section branch, alphabetical sort, testIDs, empty-state hint, `mode === 'add'` gate, `decideSectionDropdownState` helper

Tests (preserved as living regression suite):

- `tests/acceptance/staple-section-combobox/walking-skeleton.test.tsx`
- `tests/acceptance/staple-section-combobox/milestone-1-combobox.test.tsx`

Commits (chronological):

- `8607275` — `feat(staple-section-combobox): show section dropdown on empty add-mode focus`
- `5bcf47f` — `feat(staple-section-combobox): alphabetise dropdown rows + stable testIDs`
- `5a6b5d5` — `test(staple-section-combobox): activate M1-SC-1 typing filter`
- `d116ef5` — `test(staple-section-combobox): activate M1-SC-2 free-text save + track WS test`
- `6dd5512` — `feat(staple-section-combobox): empty-library hint for first staple`
- `fb8af0d` — `test(staple-section-combobox): activate M1-SC-5 edit-mode invariant`
- `c284a66` — `refactor(staple-section-combobox): remove WHAT-comment in handleSubmit`
- `af29cfb` — `refactor(staple-section-combobox): extract pure decideSectionDropdownState helper`
- `25b4199` — `docs(staple-section-combobox): record L1-L4 refactor pass outcomes`
