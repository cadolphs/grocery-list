# Component Boundaries: Grocery List UI

**Feature ID**: grocery-list-ui
**Date**: 2026-03-18

---

## React Components

### ServiceProvider

**Responsibility**: Hold domain service instances in React Context. Provide them to the entire component subtree.

**Context shape**:
- stapleLibrary: StapleLibrary (from createStapleLibrary)
- tripService: TripService (from createTrip)

**Props**:
- children: React node
- stapleLibrary: StapleLibrary (injected -- enables testing with null adapters)
- tripService: TripService (injected -- enables testing with null adapters)

**State**: None (pure provider, holds references only)

**Domain dependencies**: None directly -- receives services as props from App root

---

### AppShell

**Responsibility**: Top-level layout. Renders ViewToggle and the active view (HomeView or StoreView).

**Props**: None (reads view mode from useViewMode hook)

**State**: None (delegates to useViewMode)

**Domain dependencies**: None directly -- delegates to child components

---

### ViewToggle

**Responsibility**: Render toggle control (home/store). Dispatch view mode changes.

**Props**: None (uses useViewMode hook)

**State**: None (view mode lives in useViewMode)

**Domain dependencies**: None

---

### HomeView

**Responsibility**: Render trip items grouped by house area. Show sweep progress. Contain QuickAdd and TripSummaryView when appropriate.

**Props**: None (uses useTrip hook)

**State**:
- Derived: areaGroups (from groupByArea over trip items)
- Derived: sweepProgress (from tripService.getSweepProgress)

**Domain dependencies**:
- useTrip: getItems, skipItem, unskipItem, completeArea, getSweepProgress
- groupByArea: pure function import

---

### StoreView

**Responsibility**: Render trip items grouped by aisle/section. Check-off with optimistic UI. Section navigation with progress.

**Props**: None (uses useTrip hook)

**State**:
- Derived: aisleGroups (from groupByAisle over trip items)
- Local: activeSection (which aisle/section is expanded/focused)

**Domain dependencies**:
- useTrip: getItems, checkOff, uncheckItem
- groupByAisle: pure function import

---

### QuickAdd

**Responsibility**: Text input for adding items. Type-ahead suggestions from staple library. Add to current trip.

**Props**: None (uses useStapleLibrary and useTrip hooks)

**State**:
- Local: inputText (current text field value)
- Local: suggestions (search results from staple library)

**Domain dependencies**:
- useStapleLibrary: search
- useTrip: addItem

---

### TripSummaryView

**Responsibility**: Display trip statistics after sweep. Show prep time, item counts by type and source.

**Props**: None (uses useTrip hook)

**State**:
- Derived: summary (from tripService.getSummary)

**Domain dependencies**:
- useTrip: getSummary

---

### AreaSection

**Responsibility**: Render a single house area with its items. Show item count. Handle area completion.

**Props**:
- areaGroup: AreaGroup (from groupByArea)
- isComplete: boolean
- onCompleteArea: callback
- onSkipItem: callback (name)
- onUnskipItem: callback (name)

**State**: None (presentation only, callbacks from parent)

**Domain dependencies**: None (receives data via props from HomeView)

---

### AisleSection

**Responsibility**: Render a single store aisle/section with its items. Show check-off progress. Navigate to next section.

**Props**:
- aisleGroup: AisleGroup (from groupByAisle)
- isActive: boolean
- onCheckOff: callback (name)
- onUncheck: callback (name)
- onNavigateNext: callback

**State**: None (presentation only, callbacks from parent)

**Domain dependencies**: None (receives data via props from StoreView)

---

### TripItemRow

**Responsibility**: Render a single trip item with check/skip controls.

**Props**:
- item: TripItem
- mode: 'home' | 'store' (determines which controls to show)
- onCheck: callback (name) -- store mode
- onUncheck: callback (name) -- store mode
- onSkip: callback (name) -- home mode
- onUnskip: callback (name) -- home mode

**State**: None (pure presentation)

**Domain dependencies**: None (receives data via props)

---

### LoadingScreen

**Responsibility**: Display loading indicator during app initialization (AsyncStorage reads).

**Props**: None

**State**: None

**Domain dependencies**: None

---

## Custom Hooks

### useTrip

**Responsibility**: Bridge between TripService (imperative) and React (declarative). Expose trip state as React state. Trigger re-renders on mutations.

**Consumes from context**: TripService

**Exposes**:
- items: TripItem[] (current trip items, React state)
- sweepProgress: SweepProgress
- summary: TripSummary
- checkOff: (name: string) => void
- uncheckItem: (name: string) => void
- skipItem: (name: string) => void
- unskipItem: (name: string) => void
- addItem: (request: AddTripItemRequest) => AddTripItemResult
- completeArea: (area: HouseArea) => void
- startTrip: (staples: StapleItem[]) => void

**Reactivity pattern**:
1. Component calls hook action (e.g., checkOff)
2. Hook calls tripService.checkOff(name) -- mutates service state, persists to storage
3. Hook calls tripService.getItems() -- reads updated state
4. Hook sets React state with new items -- triggers re-render

**Why not expose TripService directly**: TripService is imperative and does not trigger React re-renders. The hook wraps every mutation with a state refresh.

---

### useStapleLibrary

**Responsibility**: Expose staple library operations with React state integration.

**Consumes from context**: StapleLibrary

**Exposes**:
- search: (query: string) => StapleItem[] (returns results, no state needed -- called on input change)
- allStaples: StapleItem[] (React state, for trip start population)
- addStaple: (request: AddStapleRequest) => AddStapleResult
- removeStaple: (id: string) => void

**Note**: The search function can be called directly without React state -- the QuickAdd component manages its own local suggestions state from the search return value. This avoids unnecessary re-renders of the entire tree on every keystroke.

---

### useViewMode

**Responsibility**: Manage the active view (home or store).

**Consumes from context**: Nothing (pure local state)

**Exposes**:
- viewMode: 'home' | 'store'
- setViewMode: (mode: 'home' | 'store') => void
- toggleViewMode: () => void

**Note**: This could be a simple useState in AppShell. Extracting to a hook is optional -- crafter decides based on testability preference.

---

### useAppInitialization

**Responsibility**: Orchestrate async startup sequence. Load data from AsyncStorage into adapter caches. Signal when app is ready.

**Exposes**:
- isReady: boolean
- services: { stapleLibrary: StapleLibrary, tripService: TripService } | null
- error: string | null

**Startup sequence**:
1. Create AsyncStorage adapters
2. Initialize adapter caches (async -- loads from AsyncStorage)
3. Create domain services with initialized adapters
4. Load active trip from storage (tripService.loadFromStorage)
5. Set isReady = true, expose services

**Error handling**: If AsyncStorage reads fail, degrade gracefully to empty state (empty staple library, no active trip). Log error but do not crash.

---

## AsyncStorage Adapters

### createAsyncStapleStorage

**Responsibility**: Implement StapleStorage port using AsyncStorage with in-memory cache.

**Port it implements**: StapleStorage (from src/ports/staple-storage.ts)

**Storage key**: `@grocery/staple_library`

**Cache strategy**:
- On initialization: read from AsyncStorage, parse JSON, populate in-memory array
- loadAll(): return in-memory array (sync)
- save(item): add to in-memory array (sync return), write full array to AsyncStorage (background)
- remove(id): remove from in-memory array (sync return), write full array to AsyncStorage (background)
- search(query): filter in-memory array (sync)

**Initialization**: Factory function returns an object with an additional `initialize(): Promise<void>` method not on the port interface. App root calls initialize() during startup, then passes the adapter (which now satisfies StapleStorage synchronously) to createStapleLibrary.

**Serialization**: JSON.stringify/JSON.parse of StapleItem[]. All fields are JSON-safe (strings, numbers, null).

---

### createAsyncTripStorage

**Responsibility**: Implement TripStorage port using AsyncStorage with in-memory cache.

**Port it implements**: TripStorage (from src/ports/trip-storage.ts)

**Storage keys**:
- `@grocery/active_trip`: Trip JSON object
- `@grocery/checkoffs`: Checkoff map as JSON array of [key, value] pairs

**Cache strategy**:
- On initialization: read both keys from AsyncStorage, parse JSON, populate in-memory state
- loadTrip(): return in-memory trip (sync)
- saveTrip(trip): update in-memory trip (sync return), write to AsyncStorage (background)
- loadCheckoffs(): return in-memory map (sync)
- saveCheckoffs(checkoffs): update in-memory map (sync return), write to AsyncStorage (background)

**Initialization**: Same pattern as staple adapter -- `initialize(): Promise<void>` called during app startup.

**Map serialization**: ReadonlyMap<string, string> serialized as array of entries: `JSON.stringify([...map.entries()])`, deserialized with `new Map(JSON.parse(value))`.

---

## Adapter Type Extension

Both AsyncStorage adapters return objects that satisfy their respective port interfaces AND have an additional `initialize()` method. The port interface type does not need to change -- the adapter factory return type is a superset:

```
StapleStorage & { initialize: () => Promise<void> }
```

The app root knows about the extended type (it calls initialize). Domain services only see the port interface. This preserves the dependency rule: domain depends on ports, not adapters.

---

## Testing Strategy for UI Components

### Component Tests (via @testing-library/react-native)

Each UI component is tested by:
1. Creating null adapters with known initial data
2. Creating domain services with null adapters
3. Wrapping component in ServiceProvider with those services
4. Asserting rendered output and interaction behavior

This matches the existing pattern where GroceryList tests inject a null storage.

### Hook Tests

Hooks are tested via renderHook (from @testing-library/react-native) with null adapters injected through the ServiceProvider wrapper.

### Adapter Tests

AsyncStorage adapters are tested with the jest mock of AsyncStorage (already configured in jest.setup.js). Tests verify:
- Initialization reads from AsyncStorage
- Sync reads return cached data
- Mutations update cache and trigger AsyncStorage writes
- Graceful degradation on AsyncStorage errors

---

## Cross-Cutting: Error Boundaries

A React error boundary at the AppShell level catches rendering errors and displays a fallback UI. This prevents a single component crash from taking down the entire app. The crafter decides the exact implementation (React class component for error boundary is acceptable even in a functional codebase -- it is the only React API that requires a class).
