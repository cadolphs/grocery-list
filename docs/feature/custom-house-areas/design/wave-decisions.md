# DESIGN Wave Decisions: Custom House Areas

**Feature ID**: custom-house-areas
**Wave**: DESIGN
**Date**: 2026-03-20

---

## Decisions Made

| # | Decision | Rationale | Alternatives Considered |
|---|----------|-----------|------------------------|
| 1 | Separate AreaStorage port (not extending StapleStorage) | Different lifecycle, data shape, and access pattern. SRP: area config vs item records. | Extend StapleStorage with area methods -- rejected: violates SRP, couples unrelated concerns |
| 2 | Area identity = name string (no opaque ID) | Zero migration cost for existing data. Name is already unique. Simpler model for 5-15 items. | Opaque UUID identity -- rejected: requires migrating all staples/trips to foreign key, higher risk for same result |
| 3 | Load-all / save-all port pattern for areas | Area list is tiny (< 1 KB). Atomic replacement avoids partial-update bugs. Matches existing AsyncStorage patterns. | Per-area CRUD operations -- rejected: over-engineering for a list of 5-15 strings |
| 4 | Domain-orchestrated rename propagation | Business rule is visible and testable in domain layer. Each port write is individually atomic. | Adapter-level transaction -- rejected: cross-port atomicity not available in AsyncStorage, adds complexity |
| 5 | HouseArea type changes from union to plain string | Union type cannot represent dynamic values. Runtime validation via pure function replaces compile-time checking. | Branded string type -- rejected: adds ceremony without meaningful safety; validation function is the real guard |
| 6 | groupByArea accepts area list as parameter | Eliminates hardcoded constant. Caller provides context. Pure function remains testable with explicit inputs. | Global area registry -- rejected: introduces hidden global state |
| 7 | Trip service receives area list at creation time | Clean API: area count embedded in closure, not passed on every call. Consistent with existing TripService factory pattern. | Pass area count on every getSweepProgress call -- rejected: leaks area concerns into every call site |
| 8 | Default seeding in AreaStorage adapter initialize() | Adapter owns storage lifecycle. First-launch detection via missing key. Matches existing AsyncStorage adapter pattern. | Seed in domain service -- rejected: seeding is a persistence concern, not business logic |
| 9 | Zero new runtime dependencies | React Native built-in components for drag-and-drop (or minimal gesture handling). Stays within Expo Go compatibility. | react-native-draggable-flatlist -- acceptable alternative if built-in proves insufficient; crafter decides |
| 10 | Validation as pure function (not service) | No dependencies needed. Same function reused for add and rename. Directly testable. | Validation in Area Management Service -- rejected: mixes validation concern with orchestration |

---

## Handoff to DISTILL Wave (Acceptance Designer)

### Architecture Artifacts

1. `architecture-design.md` -- C4 diagrams, architectural changes, migration strategy, quality attributes
2. `component-boundaries.md` -- All new/modified components, port interfaces, DI flow
3. `data-models.md` -- AreaStorage schema, type changes, port extensions, validation rules
4. `wave-decisions.md` -- This document
5. `ADR-005` -- HouseArea type migration from union to string

### Key Points for Acceptance Test Design

1. **Walking skeleton scope**: US-CHA-01 + US-CHA-02 + US-CHA-03 prove the fundamental shift from hardcoded to dynamic areas
2. **Cross-cutting verification**: US-CHA-03 acceptance tests must verify that groupByArea, sweep progress, and area picker ALL use dynamic areas
3. **Data integrity tests**: US-CHA-04 (rename) and US-CHA-05 (delete) require verifying propagation to staples AND trip items
4. **Validation boundary**: US-CHA-07 validation is a pure function -- unit testable, but acceptance tests should verify UI feedback (error messages, disabled save button)
5. **Persistence**: Every mutation (add, rename, delete, reorder) must survive app restart

### Key Points for Platform Architect (DEVOPS)

1. **No new external integrations** -- no contract testing needed
2. **Mutation testing scope**: New domain files `area-management.ts` and `area-validation.ts` should be added to Stryker scope (`src/domain/`)
3. **Architecture enforcement**: dependency-cruiser rules should cover new `src/ports/area-storage.ts` and `src/domain/area-*.ts` files

### Development Paradigm

Functional TypeScript (no classes). Confirmed -- matches existing codebase and CLAUDE.md.
