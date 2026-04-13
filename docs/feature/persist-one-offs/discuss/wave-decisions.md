# Wave Decisions: persist-one-offs

## Decision 1: Persistence Strategy

### Options Evaluated

**Option A: Extend StapleItem to support one-off type**

- `StapleItem.type` currently hardcoded as `'staple'`. Extend to `'staple' | 'one-off'`.
- Reuses existing `StapleLibrary` (search, persistence, Firestore sync, CRUD).
- `StapleStorage` port already supports `loadAll`, `save`, `remove`, `search`, `update`.
- One-offs get free ride on existing infrastructure with minimal code changes.

**Option B: Separate "recent items" store**

- New port, new adapter, new Firestore collection, new sync logic.
- Duplicates search infrastructure.
- No clear domain justification for the separation.

### Decision: Option A -- Extend StapleItem type

**Rationale**: The `StapleItem` type and `StapleLibrary` already provide exactly the capabilities needed: persistent storage with search, CRUD, and Firestore sync. The only semantic difference is that one-offs should not appear in the staple checklist and should not be preloaded into new trips. Both of those are filtering decisions, not storage decisions.

### Constraints from this decision

- `StapleItem.type` changes from literal `'staple'` to `'staple' | 'one-off'`
- `StapleLibrary.search()` returns both types (consumer decides how to display)
- `StapleChecklist` filters to `type === 'staple'` only
- Trip preloading filters to `type === 'staple'` only
- `isDuplicate` logic in `addStaple` must account for type -- a staple "Milk" and one-off "Milk" are not duplicates of each other
- One-off items in the library do NOT have a meaningful `houseArea` (use a sentinel value like `'N/A'` or empty string)

## Decision 2: One-off houseArea handling

One-offs do not participate in the house sweep. The current `StapleItem` type requires `houseArea: HouseArea` (which is `string`). For persisted one-offs, this field has no user-facing meaning.

### Decision: Use empty string `''` as sentinel

The `MetadataBottomSheet` already hardcodes `'Kitchen Cabinets'` for one-offs when submitting trip items. For the library entry, use `''` to signal "not applicable." The duplicate check (`isDuplicate`) uses both `name` and `houseArea`, so a staple "Birthday Candles" in "Kitchen Cabinets" and a one-off "Birthday Candles" with `houseArea: ''` will not collide.

## Decision 3: Suggestion display differentiation

When both staples and one-offs appear in QuickAdd suggestions, the user needs to distinguish them.

### Decision: Visual label in suggestion text

Append `(one-off)` or `(staple)` to suggestion display text when both types are present in results. This is a UI-level formatting concern -- the domain `search()` returns both, and the UI layer formats them.

## Risk Log

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| No DIVERGE artifacts present | -- | Low | Feature is well-scoped from context; lightweight discovery sufficient |
| Type change breaks existing staple filtering | Medium | High | Stories include filter-safety scenarios; existing tests validate |
| Name collision between staple and one-off | Low | Medium | Duplicate check scoped by type; search shows both with labels |
