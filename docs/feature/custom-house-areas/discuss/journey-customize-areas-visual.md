# Journey: Carlos Customizes His House Areas

**Feature ID**: custom-house-areas
**Date**: 2026-03-20
**Persona**: Carlos Rivera, household grocery planner

---

## Changed Assumptions

The original grocery-smart-list DISCUSS wave explicitly decided:

> "House areas as fixed list -- 5 areas are stable; dynamic management is over-engineering for initial scope."

This feature reverses that decision. The 5 hardcoded areas (Bathroom, Garage Pantry, Kitchen Cabinets, Fridge, Freezer) become the **default starting set**, but users can now add, rename, reorder, and delete areas.

**Why now**: Carlos's 5 rooms work for him, but his sister Ana Lucia has a different house layout (no garage, has a laundry room and a basement pantry). Making areas configurable is the natural evolution for supporting diverse households.

---

## Emotional Arc: Ownership Building

```
Confidence
    ^
    |                                              ****
    |                                         ****
    |                                    ****
    |                              *****
    |                        *****
    |                  *****
    |            *****
    |       ****
    |  ****
    +---------------------------------------------------> Time
    Step 1       Step 2       Step 3       Step 4
    Discover     Modify       Verify       Sweep
    Settings     Areas        Changes      Confident
```

- **Step 1**: "I can change things?" -- Discovery, curiosity
- **Step 2**: "This matches MY house now" -- Ownership, personalization
- **Step 3**: "Everything still works" -- Reassurance, no data loss
- **Step 4**: "The sweep fits my life" -- Confidence, satisfaction

---

## Step 1: Discover Area Settings

**Trigger**: Carlos taps a settings/gear icon from the home view
**Emotion**: Curious -- "I wonder if I can change these rooms"

```
+------------------------------------------+
|  Grocery Smart List          [gear icon]  |
|------------------------------------------|
|  0 of 5 areas complete                   |
|                                          |
|  +------------------------------------+  |
|  | Bathroom (3)                        |  |
|  |   toilet paper, hand soap, shampoo  |  |
|  +------------------------------------+  |
|  +------------------------------------+  |
|  | Garage Pantry (4)                   |  |
|  |   ...                               |  |
|  +------------------------------------+  |
|  ...                                     |
+------------------------------------------+

        Carlos taps [gear icon]
                |
                v

+------------------------------------------+
|  < Back          Settings                 |
|------------------------------------------|
|                                          |
|  HOUSE AREAS                             |
|  Manage rooms for your home sweep        |
|                                          |
|  +------------------------------------+  |
|  |  [=] Bathroom                  [>]  |  |
|  +------------------------------------+  |
|  |  [=] Garage Pantry             [>]  |  |
|  +------------------------------------+  |
|  |  [=] Kitchen Cabinets          [>]  |  |
|  +------------------------------------+  |
|  |  [=] Fridge                    [>]  |  |
|  +------------------------------------+  |
|  |  [=] Freezer                   [>]  |  |
|  +------------------------------------+  |
|                                          |
|  [+ Add Area]                            |
|                                          |
+------------------------------------------+
```

**Artifacts**: Current area list with drag handles [=] for reordering
**Notes**: [=] indicates drag handles for reordering; [>] opens area detail/rename

---

## Step 2a: Add a New Area

**Trigger**: Carlos taps [+ Add Area]
**Emotion**: Empowered -- "I can make this match my actual house"

```
+------------------------------------------+
|  < Back          Add Area                 |
|------------------------------------------|
|                                          |
|  Area name:                              |
|  +------------------------------------+  |
|  | Laundry Room                        |  |
|  +------------------------------------+  |
|                                          |
|  Position: After Freezer (last)          |
|                                          |
|  [Save]                                  |
|  [Cancel]                                |
|                                          |
+------------------------------------------+

        Carlos types "Laundry Room"
        and taps [Save]
                |
                v

+------------------------------------------+
|  < Back          Settings                 |
|------------------------------------------|
|                                          |
|  HOUSE AREAS                             |
|                                          |
|  [=] Bathroom                       [>]  |
|  [=] Garage Pantry                  [>]  |
|  [=] Kitchen Cabinets               [>]  |
|  [=] Fridge                         [>]  |
|  [=] Freezer                        [>]  |
|  [=] Laundry Room              [NEW] [>] |
|                                          |
|  [+ Add Area]                            |
|                                          |
+------------------------------------------+
```

**Notes**: New area appears at end by default. Carlos can drag to reorder.

---

## Step 2b: Rename an Existing Area

**Trigger**: Carlos taps [>] next to "Garage Pantry"
**Emotion**: Satisfied -- "Finally, I can call it what I actually call it"

```
+------------------------------------------+
|  < Back        Edit Area                  |
|------------------------------------------|
|                                          |
|  Area name:                              |
|  +------------------------------------+  |
|  | Pantry                              |  |
|  +------------------------------------+  |
|  (was: Garage Pantry)                    |
|                                          |
|  4 staples will be updated               |
|  (canned tomatoes, rice, pasta, beans)   |
|                                          |
|  [Save]                                  |
|  [Cancel]                                |
|                                          |
+------------------------------------------+
```

**Notes**: Shows affected staple count. Rename propagates automatically to all staples and current trip items.

---

## Step 2c: Delete an Area

**Trigger**: Carlos taps [>] next to "Freezer," then taps delete
**Emotion**: Cautious -- "Wait, what happens to my frozen items?"

```
+------------------------------------------+
|  < Back        Edit Area                  |
|------------------------------------------|
|                                          |
|  Area name:                              |
|  +------------------------------------+  |
|  | Freezer                             |  |
|  +------------------------------------+  |
|                                          |
|  [Save]                                  |
|  [Delete Area]                           |
|                                          |
+------------------------------------------+

        Carlos taps [Delete Area]
                |
                v

+------------------------------------------+
|         Delete "Freezer"?                 |
|------------------------------------------|
|                                          |
|  2 staples are assigned to Freezer:      |
|  - Frozen peas                           |
|  - Ice cream                             |
|                                          |
|  Move these staples to:                  |
|                                          |
|  ( ) Bathroom                            |
|  ( ) Pantry                              |
|  (*) Fridge            <-- selected      |
|  ( ) Kitchen Cabinets                    |
|  ( ) Laundry Room                        |
|                                          |
|  [Delete and Move Staples]               |
|  [Cancel]                                |
|                                          |
+------------------------------------------+
```

**Notes**: Cannot delete an area that has staples without reassigning them first. If area has 0 staples, delete is immediate with a simpler confirmation.

---

## Step 2d: Reorder Areas

**Trigger**: Carlos long-presses [=] on "Laundry Room" and drags it up
**Emotion**: In control -- "Now my sweep follows my actual walking path"

```
+------------------------------------------+
|  < Back          Settings                 |
|------------------------------------------|
|                                          |
|  HOUSE AREAS                             |
|  Drag to set your sweep order            |
|                                          |
|  [=] Bathroom                       [>]  |
|  [=] Laundry Room                   [>]  | <-- moved up
|  [=] Pantry                         [>]  |
|  [=] Kitchen Cabinets               [>]  |
|  [=] Fridge                         [>]  |
|                                          |
|  [+ Add Area]                            |
|                                          |
+------------------------------------------+
```

**Notes**: Reorder is drag-and-drop. The order defines sweep progression (Step N of M) and home view display order.

---

## Step 3: Verify Changes in Home View

**Trigger**: Carlos navigates back to the home view
**Emotion**: Reassured -- "Everything still works, and it's MY layout now"

```
+------------------------------------------+
|  Grocery Smart List          [gear icon]  |
|------------------------------------------|
|  0 of 5 areas complete                   |
|                                          |
|  +------------------------------------+  |
|  | Bathroom (3)                        |  |
|  |   toilet paper, hand soap, shampoo  |  |
|  +------------------------------------+  |
|  +------------------------------------+  |
|  | Laundry Room (0)                    |  |
|  |   0 staples due                     |  |
|  +------------------------------------+  |
|  +------------------------------------+  |
|  | Pantry (4)                          |  |
|  |   canned tomatoes, rice, pasta, ... |  |
|  +------------------------------------+  |
|  +------------------------------------+  |
|  | Kitchen Cabinets (5)                |  |
|  +------------------------------------+  |
|  +------------------------------------+  |
|  | Fridge (6)                          |  |
|  +------------------------------------+  |
|                                          |
+------------------------------------------+
```

**Notes**:
- "Garage Pantry" now shows as "Pantry" -- rename propagated
- "Laundry Room" appears in position 2 -- new area with 0 staples
- "Freezer" is gone -- its staples moved to Fridge
- Sweep progress says "5 areas" (count updated)
- Area order matches the drag-and-drop order from settings

---

## Step 4: Sweep with Custom Areas

**Trigger**: Carlos starts his home sweep
**Emotion**: Confident -- "The app knows MY house now"

```
+------------------------------------------+
|  Grocery Smart List          [gear icon]  |
|------------------------------------------|
|  1 of 5 areas complete                   |
|                                          |
|  +------------------------------------+  |
|  | Bathroom (3)        [Complete]      |  |
|  +------------------------------------+  |
|  +------------------------------------+  |
|  | Laundry Room (1)                    |  |
|  |   > detergent         [Skip]       |  |
|  |   [Done]                            |  |
|  +------------------------------------+  |
|  ...                                     |
+------------------------------------------+
```

**Notes**: Carlos added "detergent" as a staple in the new Laundry Room. Next sweep, it will be pre-loaded.

---

## Error Paths

### E1: Duplicate Area Name
Carlos tries to add "Bathroom" when it already exists.
- Show: "Bathroom already exists. Choose a different name."
- Stay on the add form with the name field highlighted.

### E2: Empty Area Name
Carlos tries to save an area with a blank name.
- Show: "Area name is required."
- Save button stays disabled until name is non-empty.

### E3: Delete Last Area
Carlos tries to delete when only 1 area remains.
- Show: "You need at least one area for your sweep."
- Delete button disabled.

### E4: Very Long Area Name
Carlos types a name longer than 40 characters.
- Truncate input at 40 characters.
- Show character count: "38/40"

---

## Integration Points

| Checkpoint | From | To | Shared Artifact |
|---|---|---|---|
| Area list loads | AreaStorage | Settings screen | area-list |
| Rename propagates | Settings | StapleLibrary, Trip | area-name |
| Delete reassigns | Settings | StapleLibrary | staple.houseArea |
| Order persists | Settings | HomeView, SweepProgress | area-order |
| groupByArea reads dynamic list | AreaStorage | item-grouping | area-list |
| SweepProgress uses dynamic count | AreaStorage | trip | area-list |
