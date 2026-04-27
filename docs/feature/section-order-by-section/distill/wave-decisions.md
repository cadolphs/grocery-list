# DISTILL Decisions — section-order-by-section

**Wave**: DISTILL
**Date**: 2026-04-27
**Acceptance Designer**: Quinn
**Refines**: `store-section-order` acceptance suite

---

## Key Decisions

- **[DWD-01] Walking Skeleton Strategy: A (InMemory).** Confirmed by user 2026-04-27. Rationale: domain functions are pure; UI integrates via `ServiceProvider` with InMemory adapters; the riskiest path (section-keyed grouping + custom sort + render) is fully exercisable without real I/O. Per-adapter integration tests for Firestore + AsyncStorage already exist (`src/adapters/firestore/firestore-section-order-storage.test.ts`, `src/adapters/async-storage/async-section-order-storage.test.ts`) and will be extended (separately, in DELIVER) with migration scenarios. Source: user confirmation 2026-04-27.

- **[DWD-02] Walking skeleton scope.** Single `@walking_skeleton @in-memory` scenario covering the riskiest end-to-end path: section-keyed grouping with custom order applied, store-view-style composition renders one card per section. Pulls together `groupBySection`, `sortByCustomOrder`, and `appendNewSections` — the three domain symbols whose contracts shift in this refactor.

- **[DWD-03] Test pyramid.** Acceptance scenarios at the domain driving-port boundary (`groupBySection`, `sortByCustomOrder`, `appendNewSections`, `useSectionOrder`). Hook-level migration tested via React-testing-library with InMemory adapter (matching the milestone-1 hook-driven scenarios in `store-section-order`). UI screen behaviour (`SectionOrderSettingsScreen` row count) covered as a focused scenario through `react-native-testing-library` rendering with `ServiceProvider`. KPI-style cardinality assertions live in the same scenarios.

- **[DWD-04] RED scaffolds.** New domain symbols (`groupBySection`, `SectionGroup`, `compareSectionGroups`) added as throw-on-call scaffolds in `src/domain/item-grouping.ts` and `src/domain/section-ordering.ts`. Existing `groupByAisle`, `AisleGroup` exports retained unchanged so the broader codebase still compiles. DELIVER will swap call sites and remove old exports. Migration logic in `useSectionOrder` left as-is (no scaffold needed; tests will RED on assertion when storage is seeded with composite-shaped legacy data and migration does not fire).

- **[DWD-05] Equivalence claims kept tight.** The new section-keyed behaviour matches the old composite behaviour when each section has exactly one aisle. We do NOT re-test that equivalence — it is a tautology of the refactor — to avoid bloat. Approximately 8–12 scenarios total across walking skeleton + 2 milestones is the target.

- **[DWD-06] Adapter coverage (Mandate 6).** Both Firestore and AsyncStorage section-order adapters are covered by per-adapter tests under `src/adapters/*/`. Migration scenarios will be added there in DELIVER (one `@real-io @adapter-integration` scenario each: legacy composite array seeded, app loads via hook, storage cleared, subsequent read returns null). Acceptance-level coverage uses the InMemory `createNullSectionOrderStorage` adapter exclusively — Strategy A.

---

## Mandate Compliance Plan

| Mandate | Plan |
|---|---|
| **CM-A (driving ports)** | All test imports listed in §"Driving Port Imports" below. Zero internal-component imports |
| **CM-B (business language)** | Gherkin uses Carlos's vocabulary — sections, aisles, store view, settings. No "API", "endpoint", "schema", "JSON", "function" |
| **CM-C (user journey + walking skeleton user-centricity)** | WS scenario titled in user-goal terms ("Carlos opens the store view and sees one card per section"). Then-steps describe Carlos's observations |
| **CM-D (pure function extraction)** | Domain functions (`groupBySection`, `sortByCustomOrder`, `appendNewSections`) are pure. Migration impurity is isolated to `useSectionOrder` hook + storage adapter (already isolated in `store-section-order`). No fixture parametrisation needed for acceptance tests |

---

## Driving Port Imports

Acceptance tests import:

- `groupBySection`, `SectionGroup` from `src/domain/item-grouping` (NEW exports, scaffolded)
- `sortByCustomOrder`, `appendNewSections` from `src/domain/section-ordering` (existing exports; semantic shift)
- `createNullSectionOrderStorage` from `src/adapters/null/null-section-order-storage` (existing)
- `useSectionOrder` from `src/hooks/useSectionOrder` (for migration scenarios — UI-level driving port)
- `SectionOrderSettingsScreen` from `src/ui/SectionOrderSettingsScreen` (for one settings-render scenario)
- `ServiceProvider` from `src/ui/ServiceProvider`

No imports from `src/domain/internals/*`, no imports of internal helpers like `groupKey` or `compareSectionGroups`.

---

## Definition of Done (DISTILL → DELIVER)

- [x] All acceptance scenarios written with passing step definitions (Jest runner per scenario file)
- [x] Test pyramid complete (3 acceptance feature files + scaffold for adapter-level scenarios in `src/adapters/*/`)
- [ ] Peer review approved (reviewer: acceptance-designer-reviewer; pending DELIVER kick-off)
- [x] Tests runnable in CI/CD pipeline (Jest config picks up `tests/acceptance/**/*.test.tsx`)
- [x] Story demonstrable to stakeholders from acceptance tests (Carlos can read each Gherkin scenario and confirm)

---

## Handoff to DELIVER

- **Scaffold removal**: DELIVER must replace the throw-scaffolded `groupBySection` / `SectionGroup` / `compareSectionGroups` with real implementations, then update call sites in `StoreView.tsx`, `SectionOrderSettingsScreen.tsx`, `AisleSection.tsx`, and remove the legacy `groupByAisle` / `AisleGroup` exports.
- **Migration code**: DELIVER adds the `entry.includes('::')` legacy-detection branch to `useSectionOrder`'s mount-time `useEffect` (per design §8 / ADR-004).
- **One-at-a-time**: walking skeleton scenario enabled first; remaining scenarios marked `it.skip` and unskipped one at a time per outside-in TDD discipline.
