# Journey: Carlos Adds a New Item with Metadata

**Feature ID**: add-item-flow
**Persona**: Carlos Rivera (household grocery planner)
**Goal**: Add a new item to the trip with proper metadata (type, house area, store section, aisle) without breaking flow

---

## Emotional Arc

```
Start: Focused         Middle: Briefly Paused       End: Satisfied
(in sweep flow)    --> (metadata decision moment) --> (item added, back in flow)
                       "This should be quick"        "Done, didn't break my stride"
```

**Pattern**: Confidence Maintenance -- Carlos is already in a confident flow state (sweep or whiteboard entry). Metadata entry must maintain that confidence, not interrupt it. The arc is flat-positive, not a valley.

---

## Journey Flow

```
[Trigger: Carlos types     [Step 1: Name Entry]    [Step 2: No Match]     [Step 3: Metadata]    [Step 4: Confirm]
 a new item name]     -->  Type item name      -->  No suggestion     -->  Quick metadata    -->  Item added
                           in QuickAdd              tapped, "Add new"      bottom sheet          back to list

  Feels: Focused           Feels: Familiar          Feels: Brief pause     Feels: Fast choices   Feels: Satisfied
  Context: Mid-sweep       Sees: Text input +       Sees: "Add new         Sees: Type toggle     Sees: Item appears
  or whiteboard entry      suggestion dropdown      item" prompt           + area + section      in correct area
```

---

## Step Details

### Step 1: Name Entry (existing behavior)

Carlos types the item name in QuickAdd. Type-ahead suggestions appear from the staple library.

```
+-------------------------------------------------------+
| [ Oat milk                              ] [  Add  ]   |
|                                                        |
|  No matching staples found                             |
|  +-------------------------------------------------+  |
|  |  + Add "Oat milk" as new item...                |  |
|  +-------------------------------------------------+  |
+-------------------------------------------------------+
```

**Key decision**: When no suggestions match, show an "Add as new item" row in the suggestion area. This keeps the flow in the same visual space -- no navigation away.

**Emotional state**: Entry: Focused (mid-sweep) | Exit: Curious ("this is new, let me classify it")

---

### Step 2: Metadata Bottom Sheet

Carlos taps "Add as new item..." and a bottom sheet slides up with metadata fields. Pre-filled defaults reduce decisions.

```
+-------------------------------------------------------+
| Add "Oat milk"                                   [ X ] |
|                                                        |
|  Type:   ( * Staple )  (   One-off )                   |
|                                                        |
|  Area:   [  Fridge          v ]                        |
|          (pre-selected if Carlos is in an area)        |
|                                                        |
|  Section: [ Dairy                      ]               |
|           Previously used: Dairy, Produce, Bakery      |
|                                                        |
|  Aisle:   [ 3          ] (optional)                    |
|                                                        |
|                                     [  Add Item  ]     |
+-------------------------------------------------------+
```

**Smart defaults**:
- **Type**: Default to "Staple" (during sweep, most items are recurring)
- **House area**: Pre-selected to the area Carlos is currently viewing (if in sweep mode). Whiteboard mode: no pre-selection, must choose.
- **Section**: Free-text with auto-suggest from previously used sections
- **Aisle**: Optional, numeric, blank by default

**Emotional state**: Entry: Brief pause ("let me classify this") | Exit: Confident ("got the right metadata")

---

### Step 3: Section Auto-Suggest

When Carlos starts typing a section name, previously used sections appear as suggestions.

```
+-------------------------------------------------------+
|  Section: [ Dai                        ]               |
|           +---------------------------------+          |
|           |  Dairy              (12 items)  |          |
|           |  Deli                (3 items)  |          |
|           +---------------------------------+          |
+-------------------------------------------------------+
```

**Emotional state**: Entry: Thinking | Exit: Recognized ("the app remembers my sections")

---

### Step 4: Confirmation & Return

Carlos taps "Add Item." The bottom sheet dismisses, and the item appears in the correct area section. A brief toast confirms the action.

```
+-------------------------------------------------------+
|  [  "Oat milk" added to Fridge    ]  <- toast (2s)    |
|                                                        |
|  [ Add an item...                       ] [  Add  ]   |
|                                                        |
|  --- Fridge ---                                        |
|  [ ] Whole milk        Dairy / Aisle 3                 |
|  [ ] Oat milk          Dairy / Aisle 3     <- NEW      |
|  [ ] Greek yogurt      Dairy / Aisle 3                 |
+-------------------------------------------------------+
```

**Emotional state**: Entry: Anticipation ("did it work?") | Exit: Satisfied ("there it is, right where it belongs")

---

## Error Path: Skip Metadata ("Add Anyway")

Carlos is in a rush and does not want to fill out metadata. The bottom sheet has a secondary action.

```
+-------------------------------------------------------+
| Add "Paper towels"                               [ X ] |
|                                                        |
|  Type:   ( * Staple )  (   One-off )                   |
|  Area:   [  Kitchen Cabinets    v ]                    |
|  Section: [                            ]               |
|  Aisle:   [            ] (optional)                    |
|                                                        |
|           [ Skip, add with defaults ]                  |
|                                     [  Add Item  ]     |
+-------------------------------------------------------+
```

- "Skip, add with defaults" adds with: type=one-off, area=current or Kitchen Cabinets, section="Uncategorized", aisle=null
- Item can be edited later (future feature, out of scope for this delivery)

---

## Error Path: Duplicate Detection

Carlos tries to add "Whole milk" but it already exists as a staple in the Fridge area.

```
+-------------------------------------------------------+
| Add "Whole milk"                                 [ X ] |
|                                                        |
|  "Whole milk" already exists in Fridge                 |
|  as a staple (Dairy / Aisle 3)                         |
|                                                        |
|  [ Add to trip instead ]     [ Cancel ]                |
+-------------------------------------------------------+
```

---

## Context Awareness: Sweep vs Whiteboard

| Aspect | Sweep Mode | Whiteboard Mode |
|--------|-----------|-----------------|
| House area default | Pre-selected to active area | No default, must choose |
| Type default | Staple | One-off |
| Trigger | Carlos is walking room to room | Carlos is entering from whiteboard |
| Speed priority | Maximum (mid-sweep) | Moderate (sitting down, planning) |

---

## Integration Points

| From | To | Data |
|------|-----|------|
| QuickAdd text input | Bottom sheet | Item name (pre-filled) |
| HomeView activeArea | Bottom sheet | Current house area (for pre-selection) |
| StapleLibrary | Bottom sheet section suggest | Previously used section names |
| Bottom sheet | addItem / addStaple | Full AddTripItemRequest or AddStapleRequest |
| addItem result | Toast notification | Success/error message |
