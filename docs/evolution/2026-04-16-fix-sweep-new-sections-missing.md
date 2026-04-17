# Evolution: fix-sweep-new-sections-missing

Date: 2026-04-16
Type: Bug fix (nwave: /nw-bugfix -> /nw-deliver)
Branch merged to: main

## Feature Summary

A two-layer defect in the Sweep -> Section Order flow:

- **P0 (wiring gap)**: During Sweep, a user adds staples whose `storeLocation.section` introduces section keys not already present in the saved custom order. On opening Settings > Section Order, the newly-added sections were silently omitted from the re-order list. The purpose-built pure function `appendNewSections(currentOrder, knownSectionKeys)` had been authored in `src/domain/section-ordering.ts` but was never called from any production code path (only from domain unit tests). The UI short-circuited to `order.map(parseSectionKey)` when a custom order existed, ignoring `knownSectionKeys` entirely.
- **P2 (reactivity gap)**: Even with P0 fixed, `knownSectionKeys` in `SectionOrderSettingsScreen` was memoised against the stable `stapleLibrary` reference, so additions made while the screen was mounted would not surface until a re-mount. `useSectionOrder` had no subscription to staple-library mutations.

**Fix outline**

1. **P0 (step 01-01)**: Wire `appendNewSections(order, knownSectionKeys)` into the `orderedEntries` `useMemo` in `src/ui/SectionOrderSettingsScreen.tsx`. Read-time merge only — no storage mutation. Reuses the already-tested pure function.
2. **P2 (step 01-02)**: Add a functional `subscribe(listener) -> unsubscribe` capability to `createStapleLibrary` in `src/domain/staple-library.ts`, mirroring the existing `createTrip.subscribe` pattern. The settings screen (via its hook) subscribes and re-renders on staple mutations. No port contract changed; purely additive domain API.

## Business Context

During the Sweep flow, users frequently add staples tied to store sections that did not yet exist in the app. The defect caused the Section Order settings screen to silently drop these new sections from the re-orderable list whenever a custom order was already saved. The only user-visible workaround was "reset to default and re-order from scratch" — destructive and laborious. Users who had invested effort ordering their sections would lose that investment every time they added a staple in a new section.

Post-fix, new sections appear immediately in the re-order list both on screen open (via the read-time merge) and while the screen is mounted (via the new subscribe/notify mechanism).

## Key Decisions

Extracted from `deliver/wave-decisions.md`:

**Step 01-02 — Reactivity strategy: option 2 (functional `subscribe` on `createStapleLibrary`) chosen over option 1 (inject a reactive staples hook).**

- Roadmap 01-02 prescribed two functional options: (1) inject a live staples array from an existing reactive hook, (2) add a functional `subscribe(listener) -> unsubscribe` on the staple-library factory and subscribe from the screen.
- Reconnoitre confirmed **option 1 was infeasible**: no reactive staples hook exists anywhere in `src/hooks/`. `HomeView` and `StoreView` both read staples via `stapleLibrary.listAll()` inside `useMemo([stapleLibrary])` and only appear reactive because they share `useTrip()` re-renders, not because staples themselves are reactive.
- Chose option 2 because:
  1. `createTrip` in `src/domain/trip.ts:96-103,298-301` already uses the same functional subscribe/notify closure pattern (blessed precedent).
  2. Purely additive change — no `StapleStorage` port change, no adapter change, no Firestore/cross-device concerns.
  3. Functional discipline preserved — closure over a listener Set, immutable public API, no classes.
- **Domain touched, but no port contract changes**: `src/domain/staple-library.ts` modified; `src/ports/staple-storage.ts` untouched. Justified in `wave-decisions.md` and flagged before proceeding (per roadmap instruction).

## Steps Completed

From `deliver/execution-log.json`:

| Step | Name | Status |
|------|------|--------|
| 01-01 | Wire `appendNewSections` into `SectionOrderSettingsScreen.orderedEntries` (P0) | PASS — PREPARE, RED_ACCEPTANCE, GREEN, COMMIT (RED_UNIT skipped: acceptance covers the wiring; `appendNewSections` already unit-tested in domain layer) |
| 01-02 | Make known section keys reactive to staple-library mutations (P2) | PASS — PREPARE, RED_ACCEPTANCE, GREEN, COMMIT (RED_UNIT skipped: subscribe/notify mirrors already-tested `createTrip` pattern) |

Both steps followed the acceptance-first TDD loop. Two refactor commits (`fccd173` L1 rename, `6afd4e0` L3 extract `moveSection` helper) were produced during GREEN consolidation.

## Lessons Learned

1. **Dangling pure-function anti-pattern**: `appendNewSections` was authored in a dedicated commit (Step 02-01 of an earlier feature) with passing domain unit tests — the green tests were interpreted as evidence that US-SSO-04 was complete. The UI wiring step that would have made the function reachable from production was never authored. The test pyramid allowed a pure function to exist with no production call site, covered only by unit tests that passed literal arrays directly to it.
2. **Prevention candidates**:
   - **Dead-domain-export check**: CI rule that every exported symbol from `src/domain/**` has at least one import from `src/ui/**`, `src/hooks/**`, or `src/adapters/**` (i.e. excluding test-only imports). Would have flagged `appendNewSections` the moment its defining PR merged.
   - **UI-wiring test required alongside domain acceptance tests**: when a user-story AC says "visible in the screen immediately", require at least one test that renders the screen and asserts the visible output. Pure-function tests are necessary but not sufficient.
3. **Memoisation against stable references is a common reactivity trap**: `HomeView` and `StoreView` have the same latent stale-memo bug on `stapleLibrary.listAll()` — they happen to re-render on `useTrip` updates, but a "add staple while section-order-screen is open" scenario exposed the underlying issue. Now that `createStapleLibrary.subscribe` exists, these sites can migrate incrementally.
4. **Stryker scope does not catch unreachable production code**: mutation testing of `section-ordering.ts` was 100% — and still the function was dead code in production. Mutation testing measures test sensitivity to code changes, not whether code is reachable from production. Keep this gap in mind when tuning the kill-rate threshold.

## Mutation Gate

- **Verdict: PASS**
- Total mutants: 122, Killed: 109, Survived: 13
- **Kill rate: 89.3%** (well above the 80% gate in `CLAUDE.md` mutation strategy)
- **Bugfix-attributable survivors: 1** — L158 (`BlockStatement` mutator emptying the `unsubscribe` function body in `createStapleLibrary`). A test that subscribes, unsubscribes, then mutates the library and asserts the listener was NOT called would kill it.
- **Follow-up candidate**: add a subscribe/unsubscribe lifecycle test that pins the listener-removal contract. Non-blocking; kill rate already comfortably over threshold.
- Other 12 survivors are pre-existing patterns in `staple-library.ts` unrelated to this bugfix (ID prefix generator, validation guards, update-vs-insert dispatch).

## Commits

Included in scope since `9081045`:

- `7622be5` fix(section-order): show newly-added sections in re-order settings screen (Step 01-01, P0)
- `efca87a` fix(section-order): re-render settings screen when staple library changes (Step 01-02, P2)
- `fccd173` refactor(section-order): L1 rename listener/row loop variables
- `6afd4e0` refactor(section-order): L3 extract `moveSection` helper
- `0b7154e` test(section-order): mutation report for staple-library bugfix

## Follow-ups (non-blocking)

- Add subscribe/unsubscribe lifecycle test in `src/domain/staple-library.test.ts` to kill mutation survivor at L158.
- Audit `HomeView` and `StoreView` for the same stale-memo-on-`stapleLibrary` pattern and migrate to the new `subscribe` API when convenient.
- Consider a CI rule or lint rule enforcing "every `src/domain/**` export is imported from a non-test production module."
- Consider consolidating section-key derivation from staples into a shared `useKnownSectionKeys()` hook so `HomeView.existingSections`, `SectionOrderSettingsScreen.knownSectionKeys`, and `StoreView.existingSections` share one implementation.
