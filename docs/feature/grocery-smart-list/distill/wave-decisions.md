# DISTILL Wave Decisions: Grocery Smart List

**Feature ID**: grocery-smart-list
**Wave**: DISTILL
**Date**: 2026-03-17
**Decision**: GO -- acceptance tests designed, reviewed, ready for DELIVER wave handoff

---

## Wave Summary

The DISTILL wave produced 45 acceptance test scenarios across 2 test files (walking skeleton + milestone 1), with Gherkin feature files for documentation and Jest test files for execution. All tests exercise driving ports only, use business language exclusively, and follow the one-at-a-time implementation strategy.

---

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Jest + describe/it blocks with GWT comments instead of pytest-bdd | Project uses Jest/TypeScript with React Native Testing Library. Adapting BDD methodology to existing toolchain. |
| Domain-level tests first, UI tests deferred | Domain functions are pure and testable without React rendering. UI-level walking skeleton tests can be added once domain is stable. |
| Null adapters for all storage ports | Follows existing pattern (createNullCheckedItemsStorage). Acceptance tests do not need real AsyncStorage. |
| 6 walking skeleton scenarios (one per backbone activity) | Matches story map structure. Each skeleton proves one step of the user journey. |
| 44% error + edge path ratio | Exceeds 40% target. Covers duplicate prevention, validation errors, error recovery (uncheck, re-add), and boundary conditions. |
| Performance NFRs excluded from acceptance tests | Toggle < 200ms, check-off < 100ms are not reliably testable in Jest. Require separate performance benchmark tests. |
| One test enabled at a time (it.skip pattern) | Maintains TDD feedback loop. First test (WS-1.1) uses `it()`, all others use `it.skip()`. |

---

## Artifacts Produced

| Artifact | File | Status |
|----------|------|--------|
| Walking Skeleton Gherkin | `tests/acceptance/grocery-smart-list/walking-skeleton.feature` | Complete |
| Walking Skeleton Jest Tests | `tests/acceptance/grocery-smart-list/walking-skeleton.test.tsx` | Complete (1 enabled, 21 skipped) |
| Milestone 1 Gherkin | `tests/acceptance/grocery-smart-list/milestone-1-enhanced-management.feature` | Complete |
| Milestone 1 Jest Tests | `tests/acceptance/grocery-smart-list/milestone-1-enhanced-management.test.tsx` | Complete (all 23 skipped) |
| Test Scenarios Inventory | `docs/feature/grocery-smart-list/distill/test-scenarios.md` | Complete |
| Walking Skeleton Definition | `docs/feature/grocery-smart-list/distill/walking-skeleton.md` | Complete |
| Acceptance Review | `docs/feature/grocery-smart-list/distill/acceptance-review.md` | Complete |
| Wave Decisions | `docs/feature/grocery-smart-list/distill/wave-decisions.md` | Complete |

---

## Handoff to DELIVER Wave (Software Crafter)

### What to Build

1. **Start with the first enabled test**: `WS-1.1: Add a staple item with full metadata`
2. Uncomment the test code, run it, see it fail (RED)
3. Implement the domain code to make it pass (GREEN)
4. Refactor as needed
5. Enable the next test (change `it.skip` to `it`) and repeat

### Implementation Sequence

The tests are ordered to build incrementally:
1. Staple Library Service (WS-1 scenarios) -- foundation
2. Trip Service + Item Grouping (WS-2 scenarios) -- uses staple library
3. Quick-Add flow (WS-3 scenarios) -- uses trip + library
4. Store view grouping (WS-4 scenarios) -- pure function
5. Check-off with persistence (WS-5 scenarios) -- uses trip + storage
6. Trip completion with carryover (WS-6 scenarios) -- orchestrates all

### Domain Modules to Create

Per architecture design:
- `src/domain/types.ts` -- HouseArea, StoreLocation, StapleItem, TripItem, Trip
- `src/domain/staple-library.ts` -- createStapleLibrary factory function
- `src/domain/trip.ts` -- createTrip factory function, completeTrip pure function
- `src/domain/item-grouping.ts` -- groupByArea, groupByAisle pure functions
- `src/ports/staple-storage.ts` -- StapleStorage interface
- `src/ports/trip-storage.ts` -- TripStorage interface
- `src/adapters/null/null-staple-storage.ts` -- createNullStapleStorage
- `src/adapters/null/null-trip-storage.ts` -- createNullTripStorage

### Mandate Compliance Evidence

- **CM-A**: All test imports reference driving ports (domain services, pure functions). Zero internal component imports.
- **CM-B**: Zero technical terms in Gherkin or GWT comments. Business vocabulary only.
- **CM-C**: 6 walking skeletons + 39 focused scenarios = 45 total.

### Key Context

- Functional TypeScript style (no classes, factory functions, pure functions)
- Null adapters follow existing `createNullCheckedItemsStorage` pattern
- Domain logic has zero external imports (no React, no AsyncStorage)
- Tests are designed to fail initially -- they define "done" for each behavior
