# DESIGN Wave Decisions: Grocery Smart List

**Feature ID**: grocery-smart-list
**Wave**: DESIGN
**Date**: 2026-03-17
**Decision**: GO -- architecture designed, ready for DISTILL wave handoff pending peer review

---

## Wave Summary

The DESIGN wave produced a complete architecture for a single-process React Native app with ports-and-adapters pattern using functional TypeScript. The architecture extends the existing walking skeleton patterns (factory functions, null implementations for testing) across all new components. Zero new runtime dependencies. One new dev dependency (dependency-cruiser for architecture enforcement).

---

## Key Design Decisions

| Decision | Rationale | ADR |
|----------|-----------|-----|
| Ports-and-adapters, functional style | Extends existing codebase patterns. Provides testability via null adapters. Solo developer needs simplicity. | ADR-001 |
| AsyncStorage for all persistence | Already installed. Dataset < 50 KB. No benefit from SQLite/MMKV at this scale. Swappable via port. | ADR-002 |
| No new runtime dependencies | Existing stack (React Native, Expo, AsyncStorage) is sufficient. No state management library needed for this complexity. | Technology Stack |
| dependency-cruiser for enforcement | Prevents domain-to-infrastructure coupling from eroding. MIT license, widely adopted. | ADR-001 |
| Pure functions for item grouping | View toggle < 200ms achieved by in-memory grouping of items already loaded in React state. No storage read on toggle. | Architecture Design |
| Optimistic UI for check-offs | Check-off feedback < 100ms by updating React state first, writing to AsyncStorage in background. | Architecture Design |
| Separate storage keys for library vs trip | Frequent check-off writes only touch trip state, not staple library. Reduces write size. | ADR-002 |

---

## Development Paradigm Decision

**Recommendation**: Functional TypeScript (no classes)

**Evidence**:
- Existing codebase is 100% functional (function components, factory functions, no `class` keyword)
- React ecosystem is function-first (hooks, function components)
- CLAUDE.md mentions "functional, class-less style" preference
- Ports-and-adapters works identically with factory functions as with classes

**Action needed**: Developer should confirm this preference or request OOP variant. The architecture supports either -- only the adapter implementation style changes, not the boundaries or patterns.

---

## Existing System Reuse

| Existing Asset | Reuse Decision |
|---------------|---------------|
| `CheckedItemsStorage` interface pattern | **Extend** -- same factory function pattern for StapleStorage and TripStorage ports |
| `createNullCheckedItemsStorage` pattern | **Extend** -- same null implementation pattern for all new test doubles |
| `@react-native-async-storage/async-storage` | **Reuse** -- no new storage technology needed |
| `@testing-library/react-native` | **Reuse** -- behavioral testing for new UI components |
| `GroceryList.tsx` (walking skeleton) | **Replace** -- served its purpose, will be superseded by HomeView/StoreView |
| `AuthService.ts` (Firebase) | **Keep** -- not used by grocery list feature, but available for future scope |

---

## Architecture Quality Attributes Addressed

| Quality Attribute | Strategy | Measured By |
|------------------|----------|------------|
| Offline-first | All data in AsyncStorage, zero network calls | K3: zero check-off failures |
| Performance | In-memory grouping, optimistic UI, parallel loads | K5: view toggle < 200ms |
| Testability | Null adapters, pure domain functions, no mocking needed | Test coverage, test speed |
| Maintainability | Ports-and-adapters separation, dependency-cruiser enforcement | Dependency rule violations = 0 |
| Data Integrity | Domain invariants in pure functions, deterministic carryover | K6: zero items lost |

---

## Artifacts Produced

| Artifact | File | Status |
|----------|------|--------|
| Architecture Design | `docs/feature/grocery-smart-list/design/architecture-design.md` | Complete |
| Technology Stack | `docs/feature/grocery-smart-list/design/technology-stack.md` | Complete |
| Component Boundaries | `docs/feature/grocery-smart-list/design/component-boundaries.md` | Complete |
| Data Models | `docs/feature/grocery-smart-list/design/data-models.md` | Complete |
| Wave Decisions | `docs/feature/grocery-smart-list/design/wave-decisions.md` | Complete |
| ADR-001: Architecture Style | `docs/adrs/ADR-001-architecture-style-and-paradigm.md` | Proposed |
| ADR-002: Local Storage | `docs/adrs/ADR-002-local-storage-strategy.md` | Proposed |

---

## Handoff to DISTILL Wave (Acceptance Designer)

### Architecture Context for Acceptance Tests

1. **All domain logic is pure and testable** -- acceptance tests can exercise domain functions directly without UI or storage
2. **Null adapters exist for all ports** -- acceptance tests can inject controlled state
3. **Optimistic UI means check-off tests should verify both UI state AND storage write**
4. **Item grouping is a pure function** -- dual-view behavior can be tested as input/output without rendering
5. **Trip completion carryover is deterministic** -- testable as a pure function with known inputs

### For Platform Architect (DEVOPS)

1. **No external integrations** in current scope -- no contract tests needed
2. **dependency-cruiser** should be added to CI pipeline as a fast first-stage check
3. **Firebase Auth** exists in codebase but is unused by this feature; if activated later, contract tests recommended for Firebase Auth API via Pact-JS
4. **Development paradigm**: Functional TypeScript (pending developer confirmation)
5. **Key instrumentation needs** (from Outcome KPIs): prep time timestamps, check-off persistence verification, quick-add timing, view toggle timing

---

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| AsyncStorage performance degrades with growing data | Low | Medium | Dataset capped at < 50 KB. Storage port allows swap to MMKV/SQLite without domain changes. |
| Schema migration needed when data models evolve | Medium | Low | Schema version field included from day 1. Migration logic in adapters. |
| dependency-cruiser rules drift from intended architecture | Low | Medium | Rules defined in config file, checked in CI. Violations fail the build. |
| Walking skeleton code conflicts with new structure | Low | Low | Incremental replacement. Old components remain until new ones are complete. |
