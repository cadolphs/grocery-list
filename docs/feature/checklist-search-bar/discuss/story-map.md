# Story Map: Checklist Search Bar

## User: Clemens (sole user, 30-80 staples)

## Goal: Find and toggle a specific staple quickly in the checklist

## Backbone

| See Search Bar | Type Query | View Filtered Results | Toggle Item | Clear/Continue |
|----------------|-----------|----------------------|-------------|----------------|
| Search input visible at top of checklist | Type text, list filters in real-time | Filtered staples shown with checked/unchecked state | Tap to toggle staple on/off trip | Clear button restores full list |
| | Case-insensitive matching | "No matches" message for empty results | Long-press to edit works on filtered items | |

---

### Walking Skeleton

The minimum end-to-end slice that connects all activities:

1. **See Search Bar** -- TextInput rendered above the staple list in checklist mode
2. **Type Query** -- Typing filters the staple list by name (case-insensitive)
3. **View Filtered Results** -- Filtered list shows with correct checked/unchecked styling
4. **Toggle Item** -- Tapping a filtered item toggles it on/off the trip
5. **Clear/Continue** -- Clear button (X) resets search and restores full list

This is a single story (US-01) because it is small enough to deliver in 1-2 days.

### Release 1: Empty State Polish

- **No matches message** -- When filter yields zero results, show "No staples match '{query}'"
- Targets outcome: reduce confusion when a search has no results

## Scope Assessment: PASS -- 2 stories, 1 bounded context (UI), estimated 2 days

This feature is well-scoped. It touches only the `StapleChecklist` UI component and local state. No domain, adapter, or hook changes required.

## Priority Rationale

| Priority | Story | Rationale |
|----------|-------|-----------|
| P1 | US-01: Filter staples by search query | Walking skeleton -- delivers the complete search/filter/toggle/clear flow. Without this, the feature has no value. |
| P2 | US-02: Empty state message for no matches | Polish -- prevents confusion but has a natural fallback (empty list is self-explanatory to most users). Low effort, ships after core behavior works. |
