# Journey Visual: Home Sweep

**Feature ID**: grocery-smart-list
**Journey**: home-sweep
**Date**: 2026-03-17

---

## Journey Flow

```
 START                                                                    END
   |                                                                       |
   v                                                                       v
[Open App] --> [Select Area] --> [Scan/Add Items] --> [Next Area] --> [Consolidate] --> [Review List]
   |              |                    |                   |              |                |
   |              |                    |                   |              |                |
 Dread -->    Oriented -->        Productive -->      In Flow -->    Confident -->    Relieved
 "ugh, prep"  "I know where      "this is fast"     "room by room   "whiteboard     "done in
               to start"                              works"          captured too"   under 5 min"
```

---

## Step-by-Step Detail

### Step 1: Open App and Start Sweep

**Trigger**: Bi-weekly shopping trip approaching. User picks up phone to start prep.

**Emotional state**: Dread --> Oriented
The user expects tedium (20 minutes in old system). The app should immediately signal "this will be quick."

```
+--------------------------------------------------+
|  Grocery Smart List                               |
|                                                   |
|  Ready to sweep?                                  |
|                                                   |
|  [ ] Bathroom           3 staples due             |
|  [ ] Garage Pantry      7 staples due             |
|  [ ] Kitchen Cabinets   5 staples due             |
|  [ ] Fridge             4 staples due             |
|  [ ] Freezer            2 staples due             |
|                                                   |
|  21 staples pre-loaded    +------------------+    |
|  0 one-offs added         | Start Sweep  >>  |   |
|                           +------------------+    |
+--------------------------------------------------+
```

**Key design notes**:
- Staples are pre-loaded -- the list is NOT empty
- House areas shown as a checklist matching the physical walk-through
- Count of pre-loaded staples signals "most of the work is done"

---

### Step 2: Select First Area (Bathroom)

**Emotional state**: Oriented --> Productive

```
+--------------------------------------------------+
|  < Back        Bathroom                    2/5    |
|                                                   |
|  STAPLES (pre-loaded)                             |
|  [x] Toilet paper          Aisle 7               |
|  [x] Hand soap             Aisle 7               |
|  [ ] Shampoo               Aisle 8               |
|                                                   |
|  ONE-OFFS                                         |
|  (none yet)                                       |
|                                                   |
|  +--------------------------------------------+  |
|  | + Add item...                               |  |
|  +--------------------------------------------+  |
|                                                   |
|  [ Done with Bathroom >> ]                        |
+--------------------------------------------------+
```

**Key design notes**:
- Staples appear pre-checked (assumed needed). User unchecks if NOT needed this trip.
- One-offs section for items not in the staples library
- Quick-add at the bottom for new items
- "2/5" shows progress through areas
- Aisle metadata is shown but read-only here (set once during item creation)

---

### Step 3: Add Items During Sweep

**Emotional state**: Productive (sustained)

User physically standing in bathroom, notices they are low on cotton swabs.

```
+--------------------------------------------------+
|  < Back        Bathroom                    2/5    |
|                                                   |
|  + Add item...                                    |
|  +--------------------------------------------+  |
|  | cotton sw                                   |  |
|  +--------------------------------------------+  |
|  Suggestions:                                     |
|  [ Cotton swabs ]  Aisle 8  (add as staple)       |
|  [ Cotton balls ]  Aisle 8  (add as staple)       |
|  +--------------------------------------------+  |
|  [ Add "cotton sw" as one-off ]                   |
|  +--------------------------------------------+  |
+--------------------------------------------------+
```

**Key design notes**:
- Type-ahead suggestions from staple library
- Known items show their stored aisle
- Option to add as staple (recurring) or one-off (this trip only)
- For known staples, one tap adds with full metadata

---

### Step 4: Navigate Between Areas

**Emotional state**: In Flow

User finishes bathroom, taps "Done with Bathroom," walks to garage.

```
+--------------------------------------------------+
|  Grocery Smart List                               |
|                                                   |
|  Sweep Progress                                   |
|                                                   |
|  [x] Bathroom            3 items    DONE          |
|  [ ] Garage Pantry       7 staples due            |
|  [ ] Kitchen Cabinets    5 staples due            |
|  [ ] Fridge              4 staples due            |
|  [ ] Freezer             2 staples due            |
|                                                   |
|  3 items captured so far                          |
|                           +------------------+    |
|                           | Garage Pantry >> |    |
|                           +------------------+    |
+--------------------------------------------------+
```

**Key design notes**:
- Completed areas show checkmark and item count
- Next area is suggested based on sequence
- Running total of captured items builds confidence

---

### Step 5: Consolidate from Whiteboard

**Emotional state**: Confident

After completing the physical sweep, user checks the whiteboard for wife's additions.

```
+--------------------------------------------------+
|  Grocery Smart List                               |
|                                                   |
|  Sweep Complete!  19 items from sweep             |
|                                                   |
|  Add from whiteboard?                             |
|  +--------------------------------------------+  |
|  | + Quick add...                              |  |
|  +--------------------------------------------+  |
|                                                   |
|  Recently added from whiteboard:                  |
|  + Greek yogurt        Dairy / Aisle 3            |
|  + Birthday candles    Baking / Aisle 12          |
|  + Deli turkey         Deli (no aisle)            |
|                                                   |
|  +--------------------------------------------+  |
|  | Done with whiteboard  >>                    |  |
|  +--------------------------------------------+  |
+--------------------------------------------------+
```

**Key design notes**:
- Explicit whiteboard consolidation step
- Quick-add with auto-suggest for known items
- New items prompt for area and section assignment
- Shows what was just added for verification

---

### Step 6: Review Complete List

**Emotional state**: Confident --> Relieved

```
+--------------------------------------------------+
|  Grocery Smart List                               |
|                                                   |
|  Trip Ready!                                      |
|                                                   |
|  22 items total                                   |
|  19 from sweep  |  3 from whiteboard              |
|  17 staples     |  5 one-offs                     |
|                                                   |
|  BY AREA:                                         |
|  Bathroom (3) | Garage (7) | Kitchen (5)          |
|  Fridge (4)   | Freezer (3)                       |
|                                                   |
|  +--------------------------------------------+  |
|  | Switch to Store View  >>                    |  |
|  +--------------------------------------------+  |
|                                                   |
|  Prep time: 4 min 12 sec                          |
+--------------------------------------------------+
```

**Key design notes**:
- Summary shows item counts by source and type
- Prep time displayed -- reinforces the value proposition (under 5 min)
- Clear transition point to store view (manual switch)

---

## Emotional Arc Summary

```
Emotion:  Dread --> Oriented --> Productive --> In Flow --> Confident --> Relieved
Step:     Open      1st Area     Add Items     Navigate    Whiteboard    Review
Signal:   "ugh"     "where to    "this is      "room by    "got it      "4 min!
           prep"     start"       fast"         room"       all"          done"
```

The arc follows the **Problem Relief** pattern:
- Start: Dread (frustrated by expected tedium)
- Middle: Productive flow (friction dissolves)
- End: Relief (done faster than expected)
