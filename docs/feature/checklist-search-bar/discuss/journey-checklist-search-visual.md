# Journey: Checklist Search Bar

## Persona

Clemens -- sole user of Grocery Smart List. Has 30-80 staples in the checklist. Knows what he wants to add to the trip but needs to find it quickly in a long alphabetical list.

## Job Statement

When my staple list is long, I want to find a specific staple quickly so I can toggle it onto the trip without scrolling through the entire list.

## Emotional Arc

- **Start**: Mildly frustrated -- "I know the item is here somewhere but scrolling takes too long"
- **Middle**: Focused -- typing narrows the list, target item appears
- **End**: Satisfied -- item found and toggled in seconds

## Journey Flow

```
[Open Checklist]  -->  [See search bar]  -->  [Type query]  -->  [List filters]  -->  [Toggle item]  -->  [Clear/continue]
  Feels: task-      Feels: oriented,       Feels: focused    Feels: relieved,    Feels: satisfied   Feels: ready for
  oriented           "I know where              "narrowing       "there it is"                        next item
                     to type"                    down..."
```

## Step-by-Step Walkthrough

### Step 1: Open Checklist Mode

Clemens taps the "Checklist" tab on the home screen. The full alphabetical list of staples appears with the search bar visible at the top.

```
+-----------------------------------------------+
| [Settings]                                     |
| [  Sweep  ] [ Checklist ]  <-- active          |
| [Quick Add input ...]                          |
|                                                |
| [ Search staples...             ]  <-- NEW     |
|                                                |
| Avocados                          Produce      |
|   (green, on trip)                             |
| Bananas                           Produce      |
|   (green, on trip)                             |
| Butter                            Dairy        |
|   (gray, strikethrough)                        |
| Cheddar Cheese                    Dairy        |
|   (gray, strikethrough)                        |
| ...60 more items...                            |
+-----------------------------------------------+
```

**Emotional state**: Task-oriented. Clemens knows the item he wants.

### Step 2: Type Search Query

Clemens taps the search bar and types "ch". The list immediately filters to show only staples whose names contain "ch".

```
+-----------------------------------------------+
| [ ch                          [X] ]            |
|                                                |
| Cheddar Cheese                    Dairy        |
|   (gray, strikethrough)                        |
| Chicken Breast                    Freezer      |
|   (green, on trip)                             |
| Chocolate Chips                   Pantry       |
|   (gray, strikethrough)                        |
+-----------------------------------------------+
```

**Emotional state**: Focused, narrowing down. Immediate feedback as letters are typed.

### Step 3: Toggle the Target Item

Clemens sees "Cheddar Cheese" and taps it. It turns green (added to trip). The item stays visible in the filtered list so Clemens can confirm the action.

```
+-----------------------------------------------+
| [ ch                          [X] ]            |
|                                                |
| Cheddar Cheese                    Dairy        |
|   (green, on trip)  <-- just toggled           |
| Chicken Breast                    Freezer      |
|   (green, on trip)                             |
| Chocolate Chips                   Pantry       |
|   (gray, strikethrough)                        |
+-----------------------------------------------+
```

**Emotional state**: Satisfied -- found and toggled quickly.

### Step 4: Clear Search or Continue

Clemens can either:

- **Tap the X button** to clear the search and return to the full list
- **Modify the query** to find another item
- **Navigate away** (tap Sweep tab or scroll down)

**Emotional state**: Ready for next action. No friction to continue.

## Error Paths

| Error | User Sees | Recovery |
|-------|-----------|----------|
| No matches found | Empty list with message "No staples match '{query}'" | User corrects typo or clears search |
| Accidental clear | Full list reappears | User re-types query (minimal cost) |

## Shared Artifacts

| Artifact | Source | Consumers |
|----------|--------|-----------|
| `staples` | `stapleLibrary.listAll()` | Search filtering, checklist rendering |
| `tripItemNames` | Derived from `useTrip().items` | Checked/unchecked state in filtered results |
| Search query text | Local component state | Filter function, clear button visibility |

## Integration Notes

- Search bar lives inside or just above the `StapleChecklist` component
- Filtering is purely UI-side -- no domain or adapter changes needed
- The existing `onAddStaple` / `onRemoveStaple` callbacks work unchanged on filtered results
- Long-press to edit continues to work on filtered results
