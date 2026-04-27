# 2026-04-27 — fix-section-order-reactive

## Summary

Bug: `StoreView` rendered grocery items alphabetically by section, ignoring the user's persisted custom store-walking order. Reordering in `SectionOrderSettingsScreen` had no visible effect on the list view.

Fix: made `SectionOrderStorage` reactive (subscribe/notify fan-out across firestore + async-storage adapters), wired `useSectionOrder` to subscribe via `useEffect`, hardened `StoreView` to append newly-discovered sections after the user's order, and added a CI gate enforcing sibling tests for every module under `src/domain/` and `src/ports/`.

## User impact

Before: persisted custom order silently ignored at runtime; users saw alphabetical sections regardless of their settings choice.
After: reorder in settings → list re-renders in the configured order on the next React tick. New aisles append after the user's order rather than alphabetically interleaving.

## Root causes

### A — Snapshot-on-mount hook + missing port subscribe (runtime defect)

`useSectionOrder` was `useState(() => storage.loadOrder())` with no subscription. Each consumer (`StoreView`, `SectionOrderSettingsScreen`) held independent React state. Settings writes never notified other consumers. `StoreView` mounted at app boot before any reorder → its `loadOrder()` returned `null`/stale → `sortByCustomOrder(groups, null)` no-op → `groupByAisle`'s `localeCompare` tie-break → alphabetical fallback.

The `SectionOrderStorage` port lacked a `subscribe` capability that other reactive storages already exposed. The Firestore implementation had an internal `onChange` callback but no fan-out registry — adding multiple consumers was structurally impossible.

### B — Test-coverage gap (why CI didn't catch it)

Zero tests on `src/domain/section-ordering.ts`. No hook test for `useSectionOrder`. No integration test exercising "reorder in settings → re-render in StoreView." Stryker is scoped to `src/domain/**` + `src/ports/**` per CLAUDE.md but cannot kill mutants in untested files. No CI gate required sibling tests for new domain/port modules.

## Resolution

| Step | Commit | What |
|---|---|---|
| 01-01 | `37dde1c` (+ `6630257` log normalize) | Domain regression tests for `sortByCustomOrder` + `appendNewSections` (closes RC-B) |
| 01-02 | `0b99b24` | Reactive port: `subscribe(listener) => unsub` + fan-out registry in firestore (echo-suppressed) + async-storage + null adapters; `useSectionOrder` subscribes via `useEffect`; hook test with real in-memory fake (closes RC-A — **the user-visible fix**) |
| 01-03 | `e6e81eb` | `appendNewSections` applied at `StoreView.tsx:125` so new sections append deterministically after the user's order |
| 01-04 | `11db9c3` | CI sibling-test gate (`scripts/check-domain-test-siblings.mjs` + `.github/workflows/ci.yml` step) |

## Key decisions

- **Extend port, don't bypass.** The firestore adapter already had an internal `onChange` callback (single-consumer). Rather than route reactivity around it, we added a `Set<() => void>` registry so external `onChange` and subscribers coexist. Mirrors the established pattern in `staple-storage` / `area-storage`.
- **Echo suppression preserved.** Firestore adapter's existing serialized-equal dedupe (lines 54-60 pre-fix) was kept; subscribers don't fire when remote snapshot equals cache.
- **Real in-memory fake, not Jest mocks.** Hook test (`src/hooks/useSectionOrder.test.ts`) uses a 30-line factory returning the port shape with a working Set-based fan-out. Two-consumer propagation test proves the subscribe path is real (consumer B has independent `useState` and only updates via the listener).
- **Allowlist over scaffolded empty tests.** CI gate ships with an explicit `ALLOWLIST` of 4 modules whose tests live under `tests/unit/domain/` rather than colocated (`area-management.ts`, `area-validation.ts`, `item-grouping.ts`, `staple-library.ts`). Scaffolding empty tests was forbidden by step boundary; the allowlist is documented tech debt.
- **Step 01-03 honesty.** The `appendNewSections` call-site change is a defensive intent-revealing refactor; the existing comparator already places unordered groups after ordered ones via stable sort, so the test was a regression-lock rather than a true RED-then-GREEN. RED_ACCEPTANCE logged as `FAIL` to reflect that the test passed before the production change.

## Mutation testing

Stryker per-feature, scoped to `src/domain/section-ordering.ts`:
- 41 mutants, 35 killed, 1 timeout, 5 survived → **87.80% kill rate** (≥80% threshold).
- Survivors:
  - 4 on `compareByCustomOrder` line 20 — `if (indexB !== -1) return 1;` (mixed ordered-vs-unordered branches).
  - 1 on `sortByCustomOrder` line 38 — empty-array short-circuit `sectionOrder.length === 0`.
- Acceptable; flagged as follow-up.

## Adversarial review

`nw-software-crafter-reviewer` (haiku) flagged 1 BLOCKER and 1 CONCERN.

- **BLOCKER (overridden):** "Hook test is theater; would pass even if `useEffect` was deleted." Verified false — consumer B has independent `useState` with no shared state; the only path from consumer A's reorder to consumer B's `result.current.order` is through the `subscribe` listener. Removing `useEffect` makes test 1 fail (consumer B stays null) and test 2 fail (single-consumer storage emit). Test 3 (unmount cleanup) directly asserts `listenerCount` returns to zero, which only passes if subscribe + cleanup both work. Tests are genuine.
- **CONCERN (valid follow-up):** Allowlist comment in `scripts/check-domain-test-siblings.mjs` lacks a tracker URL/issue link for burn-down. Minor.

## Follow-up backlog

1. Burn down the test-coverage allowlist — colocate tests for `area-management.ts`, `area-validation.ts`, `item-grouping.ts`, `staple-library.ts`, OR extend the gate script to recognize the `tests/unit/<area>/<name>.test.ts` convention.
2. Add domain tests targeting `compareByCustomOrder` line 20 mixed branches and `sortByCustomOrder` empty-array short-circuit to kill the 5 surviving mutants.
3. Add a tracker URL to the `ALLOWLIST` comment in `scripts/check-domain-test-siblings.mjs` once the burn-down issue exists.

## Files touched

Production:
- `src/ports/section-order-storage.ts` (port + `subscribe`)
- `src/adapters/firestore/firestore-section-order-storage.ts` (fan-out registry, echo-suppressed)
- `src/adapters/async-storage/async-section-order-storage.ts` (fan-out)
- `src/adapters/null/null-section-order-storage.ts` (no-op subscribe)
- `src/hooks/useSectionOrder.ts` (`useEffect` subscribe + reload)
- `src/ui/StoreView.tsx` (apply `appendNewSections` at call site)

Tests:
- `src/domain/section-ordering.test.ts` (NEW)
- `src/hooks/useSectionOrder.test.ts` (NEW)
- `src/ui/StoreView.test.tsx` (extended)
- `src/adapters/firestore/firestore-section-order-storage.test.ts` (extended)

CI / tooling:
- `scripts/check-domain-test-siblings.mjs` (NEW)
- `.github/workflows/ci.yml` (gate step added)
- `eslint.config.mjs` (ignore `scripts/**`)

## Verification

- 670 tests pass, 23 skipped, 0 failures.
- `verify_deliver_integrity` exit 0; all 4 steps full DES traces.
- TypeScript clean; eslint clean; mutation 87.80%.

## Commits

```
11db9c3 ci(fix-section-order-reactive): enforce sibling tests for src/domain and src/ports
e6e81eb fix(fix-section-order-reactive): append new sections after custom order in StoreView
0b99b24 fix(fix-section-order-reactive): make SectionOrderStorage reactive
6630257 chore(fix-section-order-reactive): normalize GREEN outcome to PASS
37dde1c test(fix-section-order-reactive): add regression tests for section-ordering pure functions
```
