# ADR-001: Architecture Style and Development Paradigm

## Status

Proposed

## Context

The Grocery Smart List is a React Native/Expo mobile app for a solo developer (Carlos Rivera) who needs:
- Offline-first operation (store has unreliable Wi-Fi)
- Dual-view of the same data (home area vs store aisle)
- Staple item lifecycle management across shopping trips
- High testability (TDD approach via nWave methodology)
- Fast time-to-market (personal project, wants to use it soon)

The existing walking skeleton already demonstrates:
- Functional React components with hooks (no classes)
- Factory functions for dependency injection (`createCheckedItemsStorage`, `createNullCheckedItemsStorage`)
- TypeScript with strict mode
- Interface-based abstractions for storage

The team is a single developer. There are no external API integrations. Data is local-only.

### Quality Attribute Priorities

1. Offline-first (non-negotiable)
2. Time-to-market (personal project, urgency)
3. Maintainability (solo developer, future changes)
4. Testability (TDD approach)

## Decision

**Architecture style**: Ports-and-adapters within a single-process application, using functional TypeScript (no classes).

**Development paradigm**: Functional -- factory functions for ports, pure functions for domain logic, React hooks for state management.

### Key structural rules:
- Domain layer has zero imports from React Native, AsyncStorage, or any framework
- All external I/O accessed through port interfaces
- Adapters implement ports using factory functions that return interface-conforming objects
- UI components receive domain services via React context or props
- Architecture rules enforced via dependency-cruiser in CI

## Alternatives Considered

### Alternative 1: Class-based OOP with ports-and-adapters

Ports as abstract classes or interfaces, adapters as class implementations with constructor injection.

**Evaluation**:
- (+) Familiar pattern in ports-and-adapters literature
- (+) TypeScript has good class support
- (-) Conflicts with existing codebase style (no classes anywhere)
- (-) React ecosystem is function-first (hooks, function components)
- (-) More boilerplate for a small project (class declarations, constructors)
- (-) Factory functions achieve the same DI without class overhead

**Rejected because**: The existing codebase is entirely functional. Introducing classes would create an inconsistent codebase and add unnecessary ceremony for a solo-developer project.

### Alternative 2: Vertical slices (feature folders, no layering)

Each feature (staples, trips, views) in its own folder with domain + UI + storage co-located.

**Evaluation**:
- (+) Simple file organization
- (+) Low ceremony
- (-) Shared domain concepts (Item, Trip, StapleItem) need to live somewhere
- (-) Cross-cutting concerns (dual-view shares item data) create coupling between slices
- (-) No structural enforcement of dependency direction
- (-) Harder to test domain logic in isolation

**Rejected because**: The dual-view feature means trip items are shared across home and store views. This is fundamentally a shared domain model, not independent feature slices. Ports-and-adapters gives clearer boundaries for the shared domain.

### Alternative 3: Simple layered architecture (UI -> Service -> Storage)

Traditional three-layer with direct storage calls from service layer.

**Evaluation**:
- (+) Simplest structure
- (+) Fast to build
- (-) Services coupled directly to AsyncStorage -- harder to test
- (-) Cannot swap storage without modifying services
- (-) The existing codebase already uses the more decoupled factory pattern

**Rejected because**: The existing codebase already achieved the decoupling of ports-and-adapters via factory functions. Going backwards to direct coupling would reduce testability, which is a stated priority.

## Consequences

### Positive

- Domain logic is fully testable without any mocking framework (use null adapters)
- Storage technology can be swapped (e.g., AsyncStorage to MMKV or SQLite) without touching domain logic
- Consistent with existing codebase patterns (zero style conflict)
- dependency-cruiser enforces boundaries automatically, preventing erosion
- Pure domain functions enable confident refactoring

### Negative

- Slight indirection cost: port interfaces add one level of abstraction between service and storage
- Developer must maintain discipline around dependency direction (mitigated by dependency-cruiser)
- Factory function DI is less discoverable than class-based DI for developers unfamiliar with the pattern (mitigated: solo developer, already using this pattern)

### Quality Attribute Impact

| Attribute | Impact |
|-----------|--------|
| Testability | Positive -- null adapters enable fast, isolated tests |
| Maintainability | Positive -- clear boundaries, enforced dependencies |
| Performance | Neutral -- indirection is negligible for this scale |
| Time-to-market | Slightly positive -- extends existing patterns, no learning curve |
