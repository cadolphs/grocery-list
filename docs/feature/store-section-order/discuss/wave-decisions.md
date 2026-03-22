# Wave Decisions: Store Section Ordering

**Feature ID**: store-section-order
**Date**: 2026-03-22

---

## Key Design Decisions

### D1: Sections remain emergent, not managed entities

**Decision**: Sections are NOT promoted to a full managed entity (like house areas with CRUD). They remain free-text strings emerging from item metadata. The custom order is a separate concern -- just an ordered list of section keys.

**Rationale**: Carlos's sections come from his staple items. Creating a section management layer with add/rename/delete would duplicate effort (he already names sections when adding items). The only missing piece is ordering, not lifecycle management.

**Alternative considered**: Full section CRUD (like AreaManagement with add/rename/delete/reorder). Rejected because sections naturally emerge from items, and managing them separately adds complexity without value for the single-store use case.

### D2: Flat ordered list, not section groups

**Decision**: The section order is a flat list of section keys. There is no grouping of sections (e.g., "named sections" vs "numbered aisles" as groups).

**Rationale**: Carlos's mental model is linear: "I walk Health & Beauty, then Deli, then Aisle 3, then Aisle 5..." Introducing groups adds UI complexity without matching his mental model. A flat drag-and-drop list is simpler and sufficient.

**Alternative considered**: Section groups (named sections as one group, numbered aisles as another, each group independently ordered). Rejected as over-engineering for a single-store, linear-walk use case.

### D3: Aisle numbers preserved but order overridden

**Decision**: Aisle numbers remain on items (e.g., "Aisle 3: Dairy" still displays). The custom order overrides the sort, but the display names are unchanged.

**Rationale**: Aisle numbers are useful metadata even when sorting is custom. Carlos still wants to see "Aisle 3" to know where he is physically. Removing aisle numbers would lose information.

### D4: New sections auto-append (no pre-registration)

**Decision**: When Carlos adds an item with a section not in the custom order, it auto-appends to the end. No blocking, no pre-registration required.

**Rationale**: Blocking item creation until the section is registered in the order list would add friction to quick-add (contradicts JS2 whiteboard consolidation speed). Auto-append is the least disruptive default.

### D5: Section order is a section key list

**Decision**: The section order key is the composite of section name + aisle number (same as groupKey in item-grouping.ts: `${section}::${aisleNumber}`). This uniquely identifies each group.

**Rationale**: Using the same key as the existing grouping function ensures the order list maps directly to store view groups. No translation layer needed.

### D6: Auto-save, no explicit save button

**Decision**: Each drag-and-drop reorder auto-saves to local storage immediately. No "Save" button.

**Rationale**: Matches mobile platform conventions (iOS Settings auto-save pattern). Reduces cognitive load. "Order saved automatically" text provides feedback.

---

## Handoff Notes for DESIGN Wave

### For solution-architect
- New port needed: `SectionOrderStorage` following existing `AreaStorage` pattern
- New or modified pure function: sorting by custom order (extend or wrap `groupByAisle`)
- Section key derivation must be consistent across: grouping, ordering, and settings display
- The `compareAisleGroups` function in `item-grouping.ts` is the current sort -- custom order replaces it when present
- Drag-and-drop reordering is a UI concern; the domain layer just stores and returns an ordered list

### For acceptance-designer (DISTILL)
- Gherkin scenarios are in `journey-store-layout.feature`
- Integration checkpoints are in `shared-artifacts-registry.md`
- Key edge case: new section auto-append must fire on item save, not deferred

### For platform-architect (DEVOPS)
- Outcome KPIs require section navigation event instrumentation
- New local storage key for section order (offline-first, same persistence layer as areas)
