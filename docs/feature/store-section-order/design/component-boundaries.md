# Component Boundaries: Store Section Ordering

**Feature ID**: store-section-order
**Date**: 2026-03-22

---

## New Components

### 1. Port: SectionOrderStorage

**Location**: `src/ports/section-order-storage.ts`
**Responsibility**: Driven port for persisting the custom section order.
**Interface contract**:
- `loadOrder(): string[] | null` -- returns stored order or null (no custom order)
- `saveOrder(order: string[]): void` -- persists new order
- `clearOrder(): void` -- removes custom order (reset to default)

**Justification**: No existing port handles ordered key lists with null semantics. AreaStorage stores `string[]` (never null) and has no clear/reset concept. A separate port keeps section ordering independent of area management (design decision D1: sections are not managed entities).

---

### 2. Adapter: AsyncSectionOrderStorage

**Location**: `src/adapters/async-storage/async-section-order-storage.ts`
**Responsibility**: AsyncStorage-backed cached adapter for SectionOrderStorage.
**Pattern**: Follows ADR-003 (cached adapter with `initialize()`).
**Storage key**: `@grocery/section_order`
**Behavior**:
- `initialize()`: Hydrates cache from AsyncStorage. If key absent, cache = null.
- `loadOrder()`: Returns cache (string[] or null)
- `saveOrder()`: Updates cache, persists in background
- `clearOrder()`: Sets cache to null, removes key from AsyncStorage

---

### 3. Adapter: NullSectionOrderStorage

**Location**: `src/adapters/null/null-section-order-storage.ts`
**Responsibility**: In-memory test adapter for SectionOrderStorage.
**Accepts**: Optional initial order for test setup.

---

### 4. Domain Module: section-ordering.ts

**Location**: `src/domain/section-ordering.ts`
**Responsibility**: Pure functions for custom section ordering logic.
**Functions** (behavioral contracts -- crafter decides signatures and internals):

| Function | Behavior |
|----------|----------|
| Sort by custom order | Accepts AisleGroup[] and optional section order. Returns AisleGroup[] sorted by order index. Groups not in order sort to end using default comparison. Returns input unchanged when order is null. |
| Discover sections | Accepts staple items and trip items. Returns unique section keys (same composite key format as groupKey). |
| Append new sections | Accepts current order and set of known keys. Returns order with any new keys appended at end. Returns unchanged order if no new keys. |
| Derive section key from AisleGroup | Computes the composite key from section name and aisle number fields. |

**Boundary rule**: This module imports only from `./types` (for AisleGroup, TripItem, StapleItem types). It does NOT import from ports or adapters. It does NOT call `groupByAisle` -- it operates on its output.

---

### 5. Hook: useSectionOrder

**Location**: `src/hooks/useSectionOrder.ts`
**Responsibility**: Bridges SectionOrderStorage port to React state. Mirrors the pattern of `useAreas`.
**Behavior**:
- Reads section order from storage on mount
- Exposes current order (string[] | null)
- Exposes `saveOrder(order: string[])` -- persists and updates state
- Exposes `clearOrder()` -- resets to default
- Exposes `discoverAndAppend(staples, tripItems)` -- discovers sections, appends new ones, persists if changed

---

### 6. UI: SectionOrderSettingsScreen

**Location**: `src/ui/SectionOrderSettingsScreen.tsx`
**Responsibility**: Settings screen for drag-and-drop section reordering.
**Behavior**:
- Displays all known sections in current order (custom or default)
- Each row shows display name (e.g., "Aisle 3: Dairy", "Deli") with drag handle
- Drag-and-drop reorders the list
- Auto-saves on each reorder (no Save button)
- "Reset to Default Order" button with confirmation dialog
- New (auto-appended) sections are visually distinguished

**Dependencies**: `useSectionOrder` hook, section-ordering pure functions

---

## Modified Components

### 7. StoreView (modified)

**Location**: `src/ui/StoreView.tsx`
**Current**: Calls `groupByAisle(neededItems)` and renders result directly.
**Change**: After `groupByAisle`, applies custom sort via `sortByCustomOrder(aisleGroups, sectionOrder)`. Obtains `sectionOrder` from `useSectionOrder` hook or from ServiceProvider context.

---

### 8. ServiceProvider (modified)

**Location**: `src/ui/ServiceProvider.tsx`
**Change**: Add `SectionOrderStorage` to the service context so that hooks and components can access it. The ServiceContextValue type gains a `sectionOrderStorage` field.

---

### 9. useAppInitialization (modified)

**Location**: `src/hooks/useAppInitialization.ts`
**Change**: Creates and initializes `AsyncSectionOrderStorage` alongside the other adapters. Passes it through to the service context.

---

## Unchanged Components

| Component | Why Unchanged |
|-----------|---------------|
| `item-grouping.ts` | `groupByAisle` and `compareAisleGroups` remain as-is. Custom ordering is a layer on top, not a modification. |
| `area-storage.ts` port | Section order is independent of house areas (design decision). |
| `area-management.ts` | No interaction with section ordering. |
| `types.ts` | No new domain types needed. Section order is `string[] \| null`. AisleGroup already has all needed fields. |
| `staple-library.ts` | Section discovery reads staple data but does not modify it. |
| `trip.ts` / `TripService` | Section ordering does not affect trip logic. |

---

## Dependency Direction

```
UI Layer (StoreView, SectionOrderSettingsScreen)
    |
    v
Hook Layer (useSectionOrder)
    |
    v
Domain Layer (section-ordering.ts, item-grouping.ts)
    ^
    | (port interface)
    |
Adapter Layer (AsyncSectionOrderStorage, NullSectionOrderStorage)
    |
    v
Infrastructure (AsyncStorage)
```

All dependencies point inward. The domain layer has no knowledge of adapters or UI. The hook bridges domain and UI. Adapters implement port interfaces defined in the domain boundary.

---

## Architectural Enforcement

**Recommended tooling**: `dependency-cruiser` (MIT license)

Rules to enforce:
- `src/domain/**` must NOT import from `src/adapters/**`, `src/ui/**`, or `src/hooks/**`
- `src/ports/**` must NOT import from `src/adapters/**`
- `src/domain/section-ordering.ts` must NOT import from `src/domain/item-grouping.ts` (composition boundary -- they communicate via shared types only)
