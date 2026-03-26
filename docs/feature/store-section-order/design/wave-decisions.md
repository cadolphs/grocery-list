# Wave Decisions: DESIGN Wave -- Store Section Ordering

**Feature ID**: store-section-order
**Date**: 2026-03-22

---

## DD-01: Composition over modification for custom sort

**Decision**: New `section-ordering.ts` module applies custom sort on top of `groupByAisle` output. `groupByAisle` is NOT modified.

**Rationale**: `groupByAisle` is stable, tested, and used by other features. Modifying it to accept an optional order parameter would mix two concerns (grouping and custom sorting). Composition keeps each function single-purpose and independently testable.

**Alternative rejected**: Add optional `sectionOrder` parameter to `groupByAisle`. Rejected because it couples grouping logic to ordering logic and makes `groupByAisle` harder to test in isolation.

---

## DD-02: New SectionOrderStorage port (not reuse AreaStorage)

**Decision**: Create a dedicated `SectionOrderStorage` port with `loadOrder/saveOrder/clearOrder` rather than overloading `AreaStorage`.

**Rationale**: Section order has different semantics than area storage. It returns `null` (no custom order) vs `string[]` (custom order exists). It has a `clearOrder` operation for reset. Areas are managed entities with add/rename/delete. Sections are emergent (DISCUSS D1). Separate ports keep these concerns independent.

**Alternative rejected**: Store section order as a field inside AreaStorage. Rejected because section ordering is conceptually independent of house areas and would create coupling.

---

## DD-03: null means "no custom order" (not empty array)

**Decision**: `SectionOrderStorage.loadOrder()` returns `null` when no custom order has been set, not an empty array.

**Rationale**: `null` is semantically "user has never customized" and triggers default sort fallback. `[]` would mean "user explicitly set an order with zero sections" which is a degenerate case. Distinguishing these prevents incorrect fallback behavior.

---

## DD-04: Section key derived from AisleGroup fields, not imported from item-grouping

**Decision**: `section-ordering.ts` derives section keys from `AisleGroup.section` and `AisleGroup.aisleNumber` directly, rather than importing `groupKey` from `item-grouping.ts`.

**Rationale**: `groupKey` in `item-grouping.ts` operates on `TripItem`, not `AisleGroup`. The key format (`${section}::${aisleNumber}`) is trivial to derive from AisleGroup fields. Avoiding the import keeps the two modules independent (composition boundary). The crafter may choose to export `groupKey` or create a shared utility if they prefer -- this is an implementation decision.

---

## DD-05: Auto-append happens at render time, not item-save time

**Decision**: New section detection and auto-append occurs when StoreView or SectionOrderSettingsScreen renders (comparing current groups/items against stored order), not when an item is saved to the staple library or trip.

**Rationale**: Item save paths (staple library, trip service) have no knowledge of section ordering -- they deal with individual items, not groups. Injecting section order awareness into item save would violate separation of concerns. The hook or view can detect new sections by comparing discovered section keys against the stored order and appending as needed.

**Trade-off**: A brief window exists where a new section is not yet in the stored order (between item save and next render). This is acceptable because the sort function handles unknown sections gracefully (sorts them to end).

---

## DD-06: SectionOrderStorage added to ServiceProvider context

**Decision**: Pass `SectionOrderStorage` through `ServiceProvider` context, following the same pattern as `areaManagement`. The `useSectionOrder` hook accesses it via `useServices()`.

**Rationale**: Consistent with existing dependency injection pattern. Enables test overrides via null adapter. Avoids prop drilling.

---

## DD-07: No new runtime dependencies

**Decision**: Drag-and-drop reordering in the settings screen uses no new npm packages. The crafter selects the approach (gesture handler already in Expo, or a simple move-up/move-down button pattern as fallback).

**Rationale**: Zero new runtime dependencies is a project constraint. Expo SDK 54 includes `react-native-gesture-handler` and `react-native-reanimated` which may be sufficient. If not, a simpler move-up/move-down UI achieves the same behavioral outcome without drag-and-drop. The crafter decides the implementation approach.

---

## Handoff Notes

### For acceptance-designer (DISTILL)
- Section order is `string[] | null` -- null means default sort, array means custom order
- The sort function passes groups through unchanged when order is null (backward compatible)
- Auto-append is observable: new sections appear at the end of the settings list
- Reset clears the stored order (returns to null state)

### For platform-architect (DEVOPS)
- New AsyncStorage key: `@grocery/section_order`
- No external integrations (no contract tests needed)
- Architectural enforcement recommendation: `dependency-cruiser` (MIT) for import boundary validation

### For software-crafter (DELIVER)
- All new domain logic in `section-ordering.ts` must be pure functions (no IO)
- Follow ADR-003 pattern for the new cached adapter
- Follow `useAreas` pattern for the new hook
- `groupByAisle` must not be modified
