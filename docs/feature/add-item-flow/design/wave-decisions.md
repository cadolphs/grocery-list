# Wave Decisions: Add Item Metadata Flow

**Feature ID**: add-item-flow
**Date**: 2026-03-19

---

## Decision Summary

| # | Decision | Rationale | ADR |
|---|----------|-----------|-----|
| D1 | Use React Native Modal for bottom sheet | Zero new dependencies, sufficient for static form, meets constraint | ADR-004 |
| D2 | No new domain logic | All needed operations (addStaple, addItem, search, listAll) already exist | N/A |
| D3 | Section suggestions derived in UI, not domain | Presentation concern (auto-complete), domain already exposes raw data via listAll() | N/A |
| D4 | HomeView orchestrates, sheet receives props | HomeView already owns activeArea + sweepProgress + context access; props make sheet testable | N/A |
| D5 | No new hooks | useTrip and useServices already provide all needed operations; sheet state is local | N/A |
| D6 | "Add as new item" row always visible when input non-empty | Ensures discoverability; user can add new item even when partial matches exist | N/A |

---

## D1: Bottom Sheet via React Native Modal

**Context**: The feature needs a bottom sheet for metadata entry. Three options were considered.

**Decision**: Use `<Modal animationType="slide">` from React Native core.

**Why**:
- Constraint: no new runtime dependencies
- The form is a static 5-field layout, not a scrollable/draggable surface
- Modal with slide animation provides standard bottom sheet UX on both platforms
- Zero native rebuild required

**Trade-off accepted**: No gesture-based drag-to-dismiss or snap points. Users dismiss via explicit button or backdrop tap. This is acceptable for a form that requires deliberate interaction.

---

## D2: No New Domain Logic

**Context**: The existing domain layer already has:
- `addStaple(request)` with duplicate detection (returns error on name+area collision)
- `addItem(request)` accepting full metadata via AddTripItemRequest
- `listAll()` returning all staples (for section extraction)
- `search(query)` for type-ahead

**Decision**: Do not add any domain functions or types. The UI layer composes existing operations.

**Why**: Adding domain functions for UI-specific needs (like "getDistinctSections" or "computeDefaults") would couple domain evolution to UI interaction patterns. The domain provides raw data; the UI derives presentation-specific views.

---

## D3: Section Suggestions as UI-Layer Derivation

**Context**: Section auto-suggest needs a list of previously used section names.

**Decision**: Derive in HomeView: `stapleLibrary.listAll().map(s => s.storeLocation.section)` then deduplicate and filter by prefix.

**Alternative considered**: Add `getDistinctSections()` to StapleLibrary domain service.

**Why rejected**: This is a presentation concern. The domain should not model auto-complete behavior. If another UI surface needed sections differently (e.g., sorted by frequency), the domain function would need to change. Deriving in UI keeps the domain stable.

**Performance**: listAll() returns from in-memory storage (< 100 items). Mapping + deduplicating is negligible.

---

## D4: HomeView as Orchestrator

**Context**: MetadataBottomSheet needs access to stapleLibrary, tripService, activeArea, and sweepProgress.

**Decision**: HomeView provides all dependencies as props. MetadataBottomSheet has zero context access.

**Why**:
- HomeView already owns activeArea (useState) and sweepProgress (useTrip)
- HomeView already has stapleLibrary (useServices) and addItem (useTrip)
- Props-based injection matches the codebase pattern (QuickAdd works the same way)
- Makes MetadataBottomSheet testable without context providers

---

## D5: No New Hooks

**Context**: Could extract bottom sheet state management into a `useMetadataSheet` hook.

**Decision**: Keep state management inline in HomeView and MetadataBottomSheet.

**Why**: The state is simple (2 values in HomeView: visible + itemName). Extracting to a hook adds indirection without reuse benefit -- only HomeView uses this state. If a second consumer emerges, extract then.

---

## D6: "Add as New Item" Always Visible

**Context**: When should the "Add 'X' as new item..." row appear?

**Decision**: Always show when `inputText.trim()` is non-empty, positioned below any staple suggestions.

**Why**: The user may want to add "Whole milk 2%" as a new item even when "Whole milk" appears as a suggestion. Hiding the option when suggestions exist would force the user to type a completely non-matching name. Showing it always preserves discoverability with zero cost (one extra row in the suggestion list).

---

## Decisions NOT Made (deferred to software-crafter)

| Topic | Why Deferred |
|-------|-------------|
| Form layout / styling | Implementation detail, crafter decides during GREEN |
| Area picker component type (Picker, segmented control, button grid) | UI implementation, crafter decides based on platform conventions |
| Type toggle component (switch, segmented control, radio) | UI implementation |
| Animation timing / easing | Visual polish, crafter decides |
| Toast/confirmation feedback after add | UI feedback pattern, crafter decides |
| Internal function decomposition in MetadataBottomSheet | Crafter owns HOW, architecture owns WHAT |
