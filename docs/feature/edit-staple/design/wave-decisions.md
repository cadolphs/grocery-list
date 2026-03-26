# Wave Decisions: Edit Staple Location

**Feature ID**: edit-staple
**Date**: 2026-03-22

---

## WD-01: Single `update` Port Method vs Remove + Save

**Context**: StapleStorage needs to support editing a single staple. Two options exist: (a) add a dedicated `update(item)` method, or (b) compose `remove(id)` then `save(item)`.

**Decision**: Add `update(item: StapleItem)` to `StapleStorage`.

**Rationale**: Remove+save is a two-step mutation. Between remove and save, the staple briefly does not exist. While this is unlikely to cause issues in a single-threaded JS environment with synchronous cache, it creates a conceptual gap that is unnecessary. A single `update` is atomic at the cache level, clearer in intent, and consistent with how `updateArea` already works (single operation that modifies and persists).

**Trade-off**: One more method on the port interface (6 methods instead of 5). Acceptable given the clear, distinct responsibility.

---

## WD-02: MetadataBottomSheet Mode Extension vs Separate Edit Component

**Context**: The edit sheet needs area picker, section input with auto-suggest, and aisle input -- all of which MetadataBottomSheet already provides. Two options: (a) add `mode: 'add' | 'edit'` to MetadataBottomSheet, or (b) create a new `EditStapleSheet` component.

**Decision**: Extend MetadataBottomSheet with a `mode` prop.

**Rationale**: The visual elements are identical (area picker, section input, aisle input). The differences are: title text, button labels, field initialization, hidden type toggle, and different submit callback. These are straightforward conditional branches. A separate component would duplicate the area picker, section auto-suggest, and aisle input -- violating DRY and creating a maintenance burden where layout changes must be applied in two places.

**Trade-off**: MetadataBottomSheet becomes slightly more complex. If edit-specific UI grows significantly in Release 2 (remove button, confirmation prompt), the crafter should evaluate extraction at that point. For Release 1, extension is the simpler path.

---

## WD-03: Duplicate Detection Excludes Self by ID

**Context**: When Carlos moves "Trash bags" from Kitchen Cabinets to Garage Pantry, the system must check if "Trash bags" already exists in Garage Pantry. But it must not flag the staple being edited as its own duplicate.

**Decision**: The duplicate check uses staple `id` for self-exclusion: `name === target.name AND houseArea === newArea AND id !== editingStaple.id`.

**Rationale**: ID-based exclusion is unambiguous. Name+area exclusion could fail if the user changes the area back to the original (it would exclude nothing since the old area no longer matches). ID is stable across edits.

**Trade-off**: None significant. IDs are already present on all staple items.

---

## WD-04: Trip Item Matching Strategy (Release 2)

**Context**: When a staple edit needs to sync to the current trip (US-ES-04), the system must find the corresponding trip item. Options: (a) match by `stapleId` field on TripItem, (b) match by `name + oldArea`.

**Decision**: Match by `name + oldArea` (the pre-edit values known at edit time).

**Rationale**: The `stapleId` field on `TripItem` is currently `null` for all preloaded items (see `stapleRequestToTripItem` in trip.ts). Populating it would require changing the trip start flow, which is out of scope. Name + oldArea is reliable because: (1) duplicate name+area combinations are prevented by the staple library, so the match is unique, and (2) the old values are known at edit time before the update is applied.

**Trade-off**: If a future feature allows duplicate name+area (unlikely given current constraints), this matching would break. Adding `stapleId` population is a candidate for a future improvement but should not block this feature.

---

## WD-05: No ADR Needed

**Context**: This feature extends existing patterns (new domain operation, new port method, MetadataBottomSheet mode). No new architectural pattern, technology, or structural decision is introduced.

**Decision**: No ADR. Wave decisions in this document are sufficient.

**Rationale**: ADRs capture significant, hard-to-reverse architectural decisions. This feature is a straightforward extension of the existing ports-and-adapters architecture. Every decision here is local and reversible.
