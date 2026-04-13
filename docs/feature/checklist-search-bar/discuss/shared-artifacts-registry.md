# Shared Artifacts Registry: Checklist Search Bar

## Artifacts

### staples

- **Source of truth**: `stapleLibrary.listAll()` via `useServices()` hook in HomeView
- **Consumers**: StapleChecklist component (full list), search filter function (input to filter)
- **Owner**: HomeView (passes as prop)
- **Integration risk**: LOW -- single source, read-only for this feature
- **Validation**: Filtered list is a subset of `allStaples`; no item can appear in filtered results that does not exist in the source array

### tripItemNames

- **Source of truth**: `useTrip().items` filtered by `needed`, mapped to name Set
- **Consumers**: StapleChecklist component (checked/unchecked styling), filtered view (same styling)
- **Owner**: HomeView (computes `tripItemNameSet` via `useMemo`)
- **Integration risk**: LOW -- existing data flow, unchanged by this feature
- **Validation**: Checked/unchecked state in filtered view must match full view for same item

### searchQuery

- **Source of truth**: Local component state (TextInput value)
- **Consumers**: Filter function, clear button visibility, empty state message
- **Owner**: StapleChecklist component (or HomeView, depending on implementation)
- **Integration risk**: LOW -- local state only, no persistence, no cross-component sharing
- **Validation**: Clearing the query restores the full list; empty query shows all staples

## Integration Validation

| Check | Steps Involved | Validation |
|-------|---------------|------------|
| Checked state consistency | 1, 2, 3, 4 | An item's checked/unchecked state must be identical whether viewed in filtered or full list |
| Toggle works in filtered view | 3 | `onAddStaple` / `onRemoveStaple` callbacks fire correctly for filtered items |
| Long-press works in filtered view | 2, 3 | `onLongPress` callback fires correctly for filtered items |
| Clear restores full list | 4 | After clear, list is identical to what it was before any search |
