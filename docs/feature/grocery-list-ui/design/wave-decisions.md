# DESIGN Wave Decisions: Grocery List UI

**Feature ID**: grocery-list-ui
**Wave**: DESIGN
**Date**: 2026-03-18
**Decision**: GO -- architecture designed, ready for DISTILL wave handoff

---

## Wave Summary

This DESIGN wave extends the grocery-smart-list architecture with implementation-ready specifications for the UI layer, custom hooks, and AsyncStorage adapters. The domain layer is complete and unchanged. Zero new runtime dependencies. The design bridges the sync/async mismatch between domain ports and AsyncStorage via cached adapters.

---

## Key Decisions

| Decision | Rationale | Reference |
|----------|-----------|-----------|
| React Context for service injection | Multiple components need same services; prop-drilling is verbose; context is idiomatic React | Architecture Design |
| Custom hooks as reactive bridge | Domain services are imperative; hooks wrap mutations with React state updates for re-renders | Component Boundaries |
| Cached AsyncStorage adapters | Preserves synchronous port contracts; zero domain changes; natural optimistic UI pattern | ADR-003 |
| No navigation library | Single-screen app with view toggle; navigation library adds unnecessary complexity | Architecture Design |
| No state management library | React hooks + context sufficient for single-user, small state tree | Technology Stack (grocery-smart-list) |
| `@grocery/` key prefix | Namespaces storage keys away from other app consumers (Firebase, Expo internals) | Data Models |
| Map serialization as entry arrays | Standard JS pattern; round-trips correctly; human-readable in debug | Data Models |
| Loading screen during init | Async adapter initialization needs ~500ms; loading state prevents flash of empty content | Architecture Design |

---

## New ADR Required

### ADR-003: Async/Sync Port Bridge Strategy

The existing storage ports are synchronous. AsyncStorage is asynchronous. This creates a mismatch that must be resolved.

**Decision**: Cached adapters with async initialization. Adapters load AsyncStorage data into in-memory cache during startup. After initialization, all port operations are synchronous against the cache. Writes update cache first (sync), then persist to AsyncStorage (background).

**Alternatives rejected**:
- Change ports to async: Requires modifying domain services and all existing tests. High cost for no domain benefit.
- Wrap every call in synchronous blocking: Not possible in JavaScript.

This ADR should be created at `/Users/cadolphs/git-personal/grocery-list/docs/adrs/ADR-003-async-sync-port-bridge.md`.

---

## Existing System Reuse

| Existing Asset | Reuse Decision |
|---------------|---------------|
| src/domain/* | **Keep unchanged** -- complete and tested |
| src/ports/* | **Keep unchanged** -- synchronous contracts preserved |
| src/adapters/null/* | **Keep unchanged** -- used for testing new UI components |
| GroceryList.tsx (walking skeleton) | **Replace** -- superseded by HomeView/StoreView/AppShell |
| CheckedItemsStorage.ts (walking skeleton) | **Replace** -- superseded by AsyncStorage adapters |
| jest.setup.js (AsyncStorage mock) | **Keep** -- already mocks AsyncStorage for adapter tests |
| App.tsx | **Modify** -- rewire to use ServiceProvider and AppShell |

---

## Artifacts Produced

| Artifact | File | Status |
|----------|------|--------|
| Architecture Design | `docs/feature/grocery-list-ui/design/architecture-design.md` | Complete |
| Component Boundaries | `docs/feature/grocery-list-ui/design/component-boundaries.md` | Complete |
| Data Models | `docs/feature/grocery-list-ui/design/data-models.md` | Complete |
| Wave Decisions | `docs/feature/grocery-list-ui/design/wave-decisions.md` | Complete |

### ADR to be created (pending peer review)

| ADR | File | Status |
|-----|------|--------|
| ADR-003: Async/Sync Port Bridge | `docs/adrs/ADR-003-async-sync-port-bridge.md` | To be created |

---

## Handoff to DISTILL Wave (Acceptance Designer)

### Architecture Context for Acceptance Tests

1. **UI components are testable with null adapters** -- wrap in ServiceProvider with createNullStapleStorage/createNullTripStorage
2. **Hooks can be tested via renderHook** with ServiceProvider wrapper
3. **Optimistic UI means tests should not await AsyncStorage** -- React state updates are synchronous
4. **View toggle is local state** -- no storage read, no async behavior
5. **Loading state is visible during initialization** -- acceptance tests for "app ready" should wait for loading to complete
6. **groupByArea and groupByAisle are already tested** in domain -- UI tests focus on rendering grouped data correctly

### For Platform Architect (DEVOPS)

1. **No external integrations** -- no contract tests needed
2. **dependency-cruiser rules need extension** for new directories:
   - `src/hooks/` may import from `src/domain/` and `src/ports/` (via context)
   - `src/hooks/` must NOT import from `src/adapters/`
   - `src/ui/` may import from `src/hooks/` and `src/domain/` (for types and pure functions)
   - `src/ui/` must NOT import from `src/adapters/` or `src/ports/`
3. **Development paradigm**: Functional TypeScript (confirmed in CLAUDE.md)

---

## Quality Gates Checklist

- [x] Requirements traced to components (Requirements Traceability table in architecture-design.md)
- [x] Component boundaries with clear responsibilities (component-boundaries.md)
- [x] Technology choices documented (no new runtime deps; AsyncStorage adapter strategy in ADR-003)
- [x] Quality attributes addressed (performance, reliability, maintainability, testability)
- [x] Dependency-inversion compliance (ports unchanged, adapters implement ports, UI depends on hooks/context)
- [x] C4 diagrams complete (L1+L2 from grocery-smart-list, L3 updated for UI wiring)
- [x] Integration patterns specified (context injection, hook bridge, cached adapters)
- [x] OSS preference validated (zero new dependencies)
- [x] AC behavioral, not implementation-coupled (acceptance scenarios reference user actions, not internals)
- [x] No external integrations (nothing to annotate)
- [x] Architectural enforcement tooling recommended (dependency-cruiser, rules extended for new dirs)
- [ ] Peer review completed (pending)

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| AsyncStorage write failures lose check-off data | Low | Low | Data is low-consequence. Cache is authoritative for current session. User can re-check items. |
| Adapter cache diverges from AsyncStorage | Very Low | Low | Single writer, no concurrency. Write-through pattern keeps cache authoritative. |
| Hook reactivity causes unnecessary re-renders | Medium | Low | Crafter can optimize with useMemo/useCallback. Performance budget has margin. |
| Loading screen visible for too long | Low | Low | < 50 KB data loads in < 500ms. If slow, crafter can add skeleton screens. |
