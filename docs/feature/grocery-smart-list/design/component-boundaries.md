# Component Boundaries: Grocery Smart List

**Feature ID**: grocery-smart-list
**Date**: 2026-03-17

---

## Boundary Principles

1. **Domain logic has zero framework imports** -- no React, no AsyncStorage, no React Native
2. **Ports define contracts** -- TypeScript interfaces that domain services depend on
3. **Adapters implement ports** -- one production adapter (AsyncStorage), one null adapter (testing)
4. **UI depends on domain, never the reverse** -- React components call domain services, domain services never import from UI

---

## Layer Boundaries

```
+---------------------------------------------------+
|                   UI Layer                         |
|  React components, hooks, navigation              |
|  Imports from: Domain, Ports                      |
|  Imports from (via DI): Adapters                  |
+---------------------------------------------------+
                        |
                        v
+---------------------------------------------------+
|                Domain Layer                        |
|  Pure business logic, no external imports          |
|  Imports from: (nothing external)                  |
|  Exports: functions, types                         |
+---------------------------------------------------+
                        |
                        v
+---------------------------------------------------+
|                 Port Layer                          |
|  TypeScript interfaces only                        |
|  Imports from: Domain types                        |
|  Exports: interface definitions                    |
+---------------------------------------------------+
                        ^
                        |
+---------------------------------------------------+
|               Adapter Layer                        |
|  AsyncStorage implementations + null doubles       |
|  Imports from: Ports, AsyncStorage                 |
|  Exports: factory functions                        |
+---------------------------------------------------+
```

---

## Domain Components

### Staple Library Service

**Responsibility**: Manage the persistent collection of staple items.

**Boundary**: Operates on in-memory data structures. Receives and returns domain types. Delegates persistence to StapleStorage port.

**Operations**:
- Add staple item (with duplicate prevention by name + house area)
- Remove staple item from library
- List all staples
- List staples by house area
- Search staples by name prefix (for suggestions)

**Invariants**:
- No two staples with the same name in the same house area
- Every staple has a name, house area, store section
- Aisle number is optional

### Trip Service

**Responsibility**: Manage the lifecycle of a shopping trip from sweep start through completion.

**Boundary**: Orchestrates trip state transitions. Delegates persistence to TripStorage port. Reads from StapleStorage port to populate trips.

**Operations**:
- Start new trip (populate from staple library)
- Add item to trip (staple or one-off)
- Remove/skip item from trip (without affecting staple library)
- Re-add skipped item to trip
- Check off / uncheck item
- Complete trip (apply carryover rules)
- Get trip statistics (counts, progress, prep time)

**Invariants**:
- Staple library is never modified by trip operations (read-only during trip)
- Purchased one-offs are cleared on trip completion
- Unbought items carry over exactly once (no duplicates)
- Purchased staples re-queue for next trip (they are in the staple library by definition)
- Check-off state is always persisted immediately

### Item Grouping

**Responsibility**: Pure functions that transform a flat list of trip items into grouped structures.

**Boundary**: Stateless. No side effects. No port dependencies. Input: list of items. Output: grouped structure.

**Operations**:
- Group by house area (for home view): returns items organized under 5 fixed areas
- Group by aisle/section (for store view): returns items sorted by aisle number ascending, then named sections without aisles; empty groups excluded

**Invariants**:
- Same input always produces same output (pure function)
- All items appear in exactly one group
- No items lost or duplicated during grouping

---

## Port Interfaces

### StapleStorage Port

**Purpose**: Abstract persistence of the staple library.

**Contract**:
- Load all staples from storage
- Save a staple to storage
- Remove a staple from storage
- Search staples by name prefix

**Implementations**:
- AsyncStorage adapter (production)
- Null adapter with in-memory array (testing)

### TripStorage Port

**Purpose**: Abstract persistence of trip state including items and check-offs.

**Contract**:
- Load active trip state
- Save active trip state
- Clear trip state (on completion after carryover is computed)

**Implementations**:
- AsyncStorage adapter (production)
- Null adapter with in-memory state (testing)

---

## Adapter Components

### AsyncStorage Staple Adapter

**Responsibility**: Serialize/deserialize staple library to/from AsyncStorage.

**Storage key strategy**: Single key for entire staple library (JSON array). Dataset is small (< 100 items), atomic read/write is simpler than per-item keys.

### AsyncStorage Trip Adapter

**Responsibility**: Serialize/deserialize active trip state to/from AsyncStorage.

**Storage key strategy**: Single key for trip state (JSON object containing items array and metadata). Separate key for check-off state to enable frequent writes without rewriting entire trip.

### Null Adapters

**Responsibility**: In-memory implementations for testing. Follow the pattern established by `createNullCheckedItemsStorage` in the existing codebase.

---

## UI Components

### Home View

**Responsibility**: Render trip items grouped by house area. Display sweep progress. Allow item skip/re-add.

**Dependencies**: Trip Service (items, skip, re-add), Item Grouping (group by area)

### Store View

**Responsibility**: Render trip items grouped by aisle/section. Section navigation with progress. Check-off with optimistic UI.

**Dependencies**: Trip Service (items, check-off), Item Grouping (group by aisle)

### Quick Add

**Responsibility**: Item entry with type-ahead suggestions from staple library.

**Dependencies**: Staple Library Service (search), Trip Service (add item)

### Trip Summary

**Responsibility**: Display trip statistics after sweep completion. Show prep time, item breakdown by source and type.

**Dependencies**: Trip Service (statistics)

### View Toggle

**Responsibility**: Switch between home and store views. Maintain active view state.

**Dependencies**: None (pure UI state)

---

## Dependency Injection Strategy

Factory functions at the app root create adapters and pass them to services, which are then provided to UI components via React context or props.

```
App root:
  1. Create storage adapters (production or null)
  2. Create domain services with injected adapters
  3. Provide services to UI tree via context
```

This matches the existing pattern where `GroceryList` accepts an optional `storage` prop with a default production implementation.

---

## Cross-Cutting Concerns

### Error Handling

- Storage read failures: gracefully degrade to empty state (new trip, empty library)
- Storage write failures: retry once, then surface error to UI
- Domain validation errors: returned as result types, never thrown

### Data Migration

- When domain types evolve, storage adapters handle version detection and migration
- AsyncStorage values include a schema version field
- Migration logic lives in adapters, not domain
