# Component Boundaries: Custom House Areas

**Feature ID**: custom-house-areas
**Date**: 2026-03-20

---

## New Domain Components

### Area Management Service

**Responsibility**: Orchestrate area CRUD operations with validation and cross-store propagation.

**Boundary**: Coordinates writes across AreaStorage, StapleStorage, and TripStorage ports. Contains business rules for rename propagation, delete reassignment, and reorder. Does NOT own validation logic (delegates to Area Validation).

**Operations**:
- Add area (validate name, append to list, persist)
- Rename area (validate new name, update area list, propagate to staples and trip items)
- Delete area (validate not-last, detect reassignment conflicts, move staples and trip items, remove area)
- Reorder areas (accept new ordered list, persist)
- List areas (read from AreaStorage)

**Invariants**:
- Minimum 1 area at all times
- No duplicate area names (case-insensitive)
- Rename propagates to all staples and trip items referencing the old name
- Delete never orphans staples or trip items

**Dependencies**: AreaStorage port, StapleStorage port (for propagation), TripStorage port (for propagation), Area Validation (pure function)

### Area Name Validation

**Responsibility**: Pure validation of area name input.

**Boundary**: Stateless pure function. No port dependencies. Input: proposed name + existing names. Output: validation result.

**Operations**:
- Validate area name: non-empty after trim, case-insensitive unique, max 40 characters

**Invariants**:
- Same input always produces same output (pure function)
- Validation result contains specific error type for UI to display appropriate message

**Dependencies**: None (pure function)

---

## Modified Domain Components

### Item Grouping (Modified)

**Change**: `groupByArea` signature changes to accept area list as parameter.

**New signature concept**: Takes items and an ordered area list, returns groups in area list order. Areas with no items produce empty groups. Items referencing unknown areas are collected defensively.

**Boundary change**: No longer contains `ALL_HOUSE_AREAS` constant. The caller provides the area list.

### Trip Service (Modified)

**Change**: `getSweepProgress` and `completeArea` work with dynamic area count.

**Option A -- Inject area list at creation**: `createTrip(storage, areas)` where `areas` is the area list. The service internally tracks completed areas against this list.

**Option B -- Accept area count per call**: `getSweepProgress(totalAreas: number)` receives the count each time.

**Recommended**: Option A (inject at creation). The trip service already uses closure state for `completedAreas`. Injecting the full area list at creation keeps the API clean and avoids passing area count on every call. If areas change mid-trip (rare edge case), the trip service can expose a method to update the area list.

**Boundary change**: No longer contains `ALL_HOUSE_AREAS` constant.

### Staple Library Service (Unchanged Domain Logic)

The `StapleLibrary` type signatures use `HouseArea` which becomes `string`. No behavioral change. The `addStaple`, `listByArea` functions work identically -- they already treat `houseArea` as an opaque string for filtering.

---

## New Port Interface

### AreaStorage Port

**Purpose**: Abstract persistence of the ordered area list.

**Contract**:
- `loadAll(): string[]` -- Return the ordered list of area names
- `saveAll(areas: string[]): void` -- Persist the complete ordered list (atomic replacement)

**Implementations**:
- AsyncStorage adapter with default seeding (production)
- Null adapter with in-memory array (testing)

---

## Modified Port Interfaces

### StapleStorage Port (Extended)

**New operation**: `updateArea(oldName: string, newName: string): void` -- Batch-update `houseArea` field for all staples matching `oldName` to `newName`.

**Rationale**: The Area Management Service needs to propagate renames and reassignments to staples. Adding this to the port keeps the operation atomic within the adapter (load all, transform, save all) and avoids exposing adapter internals to domain logic.

### TripStorage Port (Extended)

**New operation**: `updateItemArea(oldName: string, newName: string): void` -- Batch-update `houseArea` field for all trip items matching `oldName` to `newName`.

**Rationale**: Same as StapleStorage -- enables rename/reassignment propagation to active trip items.

---

## New Adapter Components

### AsyncStorage Area Adapter

**Responsibility**: Persist area list to AsyncStorage. Seed defaults on first launch.

**Storage key**: `@grocery/house_areas`

**Default seeding**: On `initialize()`, if key does not exist in AsyncStorage, write the 5 defaults: `['Bathroom', 'Garage Pantry', 'Kitchen Cabinets', 'Fridge', 'Freezer']`.

**Pattern**: Follows the established `AsyncStapleStorage` pattern -- `initialize()` for async hydration, synchronous operations thereafter via in-memory cache.

### Null Area Adapter

**Responsibility**: In-memory implementation for testing. Follows the `createNullStapleStorage` pattern.

**Constructor**: Accepts optional initial area list (defaults to the 5 defaults).

---

## Modified Adapter Components

### AsyncStorage Staple Adapter (Extended)

**New operation**: Implement `updateArea` -- load cached items, map over them replacing `houseArea`, update cache, persist in background.

### AsyncStorage Trip Adapter (Extended)

**New operation**: Implement `updateItemArea` -- load cached trip, map over items replacing `houseArea`, update cache, persist in background.

### Null Staple Adapter (Extended)

**New operation**: Implement `updateArea` with in-memory transformation.

### Null Trip Adapter (Extended)

**New operation**: Implement `updateItemArea` with in-memory transformation.

---

## New UI Components

### Area Settings View

**Responsibility**: Display and manage the area list. Provides navigation for add, edit (rename), delete, and reorder.

**Dependencies**: Area Management Service (via context), useAreas hook

**Sub-views** (crafter determines internal decomposition):
- Area list display with drag handles and edit affordances
- Add area form with inline validation
- Rename area form with inline validation
- Delete confirmation (simple for empty areas, reassignment picker for areas with staples)

### useAreas Hook

**Responsibility**: Bridge AreaStorage to React state. Provides reactive area list for consumers.

**Dependencies**: AreaStorage port (via context), Area Management Service (for mutations)

**Exposes**: Ordered area list, add/rename/delete/reorder mutation functions

---

## Modified UI Components

### HomeView (Modified)

**Change**: Reads area list from context (useAreas hook). Passes areas to `groupByArea`. Displays settings gear icon for navigation to Area Settings View.

### MetadataBottomSheet (Modified)

**Change**: Receives area list as prop instead of using hardcoded `HOUSE_AREAS` constant. Area picker buttons are dynamic.

### ServiceProvider (Modified)

**Change**: Exposes AreaStorage and/or area list in addition to existing stapleLibrary and tripService.

---

## Dependency Injection Flow

```
App root:
  1. Create AreaStorage adapter (async-storage or null)
  2. Create StapleStorage adapter (unchanged)
  3. Create TripStorage adapter (unchanged)
  4. Initialize all adapters (parallel async)
  5. Create Area Management Service with all three ports
  6. Create Staple Library Service with StapleStorage (unchanged)
  7. Create Trip Service with TripStorage + area list from AreaStorage
  8. Provide all services to UI tree via ServiceProvider context
```

---

## Cross-Cutting: HouseArea Type Change

The `HouseArea` type in `types.ts` changes from a union type to `string`. This is the foundational change that enables dynamic areas.

**Impact**:
- Every type that uses `HouseArea` (`StapleItem`, `TripItem`, `AddStapleRequest`, `AddTripItemRequest`, `AreaGroup`, `SweepProgress`) now uses `string` for the area field
- TypeScript will no longer catch invalid area names at compile time -- validation moves to runtime (Area Validation pure function)
- Test files that construct items with area strings are unaffected (string literals are valid `string` values)

**Alternative considered**: Branded string type (`type HouseArea = string & { readonly __brand: 'HouseArea' }`) to preserve some type safety. Rejected because the branding adds ceremony without meaningful safety -- the validation function is the real guard, and branded types create friction at every construction site.

This decision is captured in ADR-005.
