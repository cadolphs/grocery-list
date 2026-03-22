# Walking Skeleton: Add Item Metadata Flow

**Feature ID**: add-item-flow
**Date**: 2026-03-19

---

## Thinnest Slice

The walking skeleton traces the simplest complete user journey:

**Carlos types a new item name -> no staple match -> taps "Add as new item" -> bottom sheet opens -> fills type/area/section/aisle -> taps "Add Item" -> item appears on trip (and in library if staple)**

No smart defaults, no auto-suggest, no skip shortcut, no duplicate detection.

---

## Walking Skeleton Scenarios

### WS-AIF-1: "Add as new item" row appears when no staple matches

**Litmus test**: Can a non-technical stakeholder confirm this is what users need? YES -- "When I type something new, the app should let me add it."

**What it proves**: The QuickAdd component correctly identifies when a typed name has no match in the staple library and offers the "Add as new item" path.

### WS-AIF-2: Bottom sheet opens with metadata form

**Litmus test**: YES -- "I should see a form where I can fill in the item details."

**What it proves**: Tapping the prompt opens the MetadataBottomSheet with all required fields visible (type, area, section, aisle).

### WS-AIF-3: Submitting as staple saves to library AND adds to trip

**Litmus test**: YES -- "When I say it is a staple, it should be saved for next time AND on my current list."

**What it proves**: The full submit path for staple type: MetadataBottomSheet -> HomeView callbacks -> addStaple + addItem -> item visible in both library and trip.

### WS-AIF-4: Submitting as one-off adds to trip only

**Litmus test**: YES -- "When I say it is a one-time thing, it should only be on this list."

**What it proves**: The full submit path for one-off type: MetadataBottomSheet -> HomeView callbacks -> addItem only -> item visible on trip, NOT in library.

---

## Vertical Slice Coverage

| Layer | Touched By | How |
|-------|-----------|-----|
| UI: QuickAdd | WS-AIF-1, WS-AIF-2 | "Add as new item" row, onOpenMetadataSheet callback |
| UI: MetadataBottomSheet | WS-AIF-2, WS-AIF-3, WS-AIF-4 | Form rendering, submit handling |
| UI: HomeView | WS-AIF-2, WS-AIF-3, WS-AIF-4 | Orchestrates sheet visibility and callbacks |
| Domain: staple-library | WS-AIF-1, WS-AIF-3 | search (no match), addStaple |
| Domain: trip | WS-AIF-3, WS-AIF-4 | addItem |
| Adapters: null storage | WS-AIF-1 through WS-AIF-4 | In-memory test doubles |

---

## Demo Script

After the walking skeleton passes, stakeholders can see:

1. "Type a new item name and the app offers to add it" (WS-AIF-1)
2. "Tap the prompt and a form appears with type, area, section, aisle" (WS-AIF-2)
3. "Fill in the form as a staple and it is saved to your library for next time" (WS-AIF-3)
4. "Fill in the form as one-off and it is only on this trip" (WS-AIF-4)
