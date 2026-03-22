# Journey Visual: Store Shop

**Feature ID**: grocery-smart-list
**Journey**: store-shop
**Date**: 2026-03-17

---

## Journey Flow

```
 START                                                                    END
   |                                                                       |
   v                                                                       v
[Switch View] --> [See Aisles] --> [Shop Section] --> [Next Section] --> [Complete Trip]
   |                  |                 |                  |                  |
   |                  |                 |                  |                  |
 Arrival -->     Oriented -->      Focused -->        In Flow -->       Satisfied
 "time to       "I see the        "grab these"       "aisle by         "nothing
  switch"        plan"                                  aisle"           missed"
```

---

## Step-by-Step Detail

### Step 1: Switch to Store View

**Trigger**: Carlos arrives at the store parking lot. Manual switch -- not automatic.

**Emotional state**: Arrival --> Oriented
The transition from home-organized thinking to store-organized thinking should feel instant and confident.

```
+--------------------------------------------------+
|  Grocery Smart List           [ Home | STORE ]    |
|                                                   |
|  Store View -- 22 items                           |
|                                                   |
|  Aisle 3: Dairy               4 items             |
|  Aisle 5: Canned Goods        3 items             |
|  Aisle 7: Paper & Soap        3 items             |
|  Aisle 8: Health & Beauty     2 items             |
|  Aisle 12: Baking             1 item              |
|  ---                                              |
|  Deli                          2 items             |
|  Produce                       4 items             |
|  Bakery                        1 item              |
|  Frozen                        2 items             |
|                                                   |
|  9 sections  |  22 items  |  0 checked            |
+--------------------------------------------------+
```

**Key design notes**:
- Manual toggle between Home and Store views
- Aisles listed in numerical order (physical walk order)
- Non-aisle sections (Deli, Produce, Bakery, Frozen) listed after aisles
- Empty aisles are NOT shown -- only aisles with items on the list
- Item count per section for planning

---

### Step 2: Open First Section

**Emotional state**: Oriented --> Focused

Carlos walks to Aisle 3 (Dairy), taps to open.

```
+--------------------------------------------------+
|  < Aisles      Aisle 3: Dairy              0/4    |
|                                                   |
|  [ ] Milk, whole          (staple)                |
|  [ ] Greek yogurt         (one-off)               |
|  [ ] Butter, unsalted     (staple)                |
|  [ ] Cheddar cheese       (staple)                |
|                                                   |
|                                                   |
|                                                   |
|                                                   |
|                                                   |
|  Next: Aisle 5 (Canned Goods, 3 items)            |
+--------------------------------------------------+
```

**Key design notes**:
- Items shown as simple checklist within the section
- Staple/one-off tag is subtle (not primary info in store)
- Progress counter "0/4" at top
- "Next" hint shows what section comes after this one
- Clean, scannable -- optimized for standing-in-aisle glancing

---

### Step 3: Check Off Items

**Emotional state**: Focused (sustained)

Carlos puts milk in the cart, taps to check it off.

```
+--------------------------------------------------+
|  < Aisles      Aisle 3: Dairy              2/4    |
|                                                   |
|  [x] Milk, whole          (staple)    IN CART     |
|  [x] Greek yogurt         (one-off)   IN CART     |
|  [ ] Butter, unsalted     (staple)                |
|  [ ] Cheddar cheese       (staple)                |
|                                                   |
|                                                   |
|                                                   |
|                                                   |
|                                                   |
|  Next: Aisle 5 (Canned Goods, 3 items)            |
+--------------------------------------------------+
```

**Key design notes**:
- Checked items show "IN CART" confirmation
- Checked items stay visible (not hidden) so Carlos can verify
- Large touch targets for check-off (no fumbling)
- Works fully offline -- check-off persists to local storage immediately

---

### Step 4: Complete Section, Move to Next

**Emotional state**: Focused --> In Flow

Carlos checks all items in Aisle 3, taps "Next."

```
+--------------------------------------------------+
|  < Aisles      Aisle 3: Dairy              4/4    |
|                                                   |
|  [x] Milk, whole          (staple)    IN CART     |
|  [x] Greek yogurt         (one-off)   IN CART     |
|  [x] Butter, unsalted     (staple)    IN CART     |
|  [x] Cheddar cheese       (staple)    IN CART     |
|                                                   |
|  All items in this section!                       |
|                                                   |
|  +--------------------------------------------+  |
|  | Next: Aisle 5 (Canned Goods)  >>           |  |
|  +--------------------------------------------+  |
+--------------------------------------------------+
```

**Key design notes**:
- "All items in this section!" reinforces completeness
- One-tap navigation to next section
- Skips any aisles with no items on the list

---

### Step 5: Section with Partial Check-Off (Leave Items)

**Emotional state**: In Flow (sustained)

Carlos is in Produce but cannot find ripe avocados. Skips that item.

```
+--------------------------------------------------+
|  < Aisles      Produce                     3/4    |
|                                                   |
|  [x] Bananas              (staple)    IN CART     |
|  [x] Spinach              (staple)    IN CART     |
|  [ ] Avocados              (one-off)              |
|  [x] Tomatoes             (staple)    IN CART     |
|                                                   |
|  1 item remaining                                 |
|                                                   |
|  +--------------------------------------------+  |
|  | Move on (1 not bought)  >>                  |  |
|  +--------------------------------------------+  |
+--------------------------------------------------+
```

**Key design notes**:
- Unchecked items are clearly visible
- "Move on" acknowledges skipping without forcing a decision
- Skipped items will carry over to next trip (JS6)

---

### Step 6: Trip Summary and Completion

**Emotional state**: In Flow --> Satisfied

Carlos has been through all sections.

```
+--------------------------------------------------+
|  Grocery Smart List                               |
|                                                   |
|  Trip Complete!                                   |
|                                                   |
|  21 of 22 items purchased                         |
|  1 item not bought:                               |
|    - Avocados (will carry to next trip)           |
|                                                   |
|  Staples: auto-queued for next trip               |
|  One-offs purchased: cleared                      |
|  One-offs skipped: carried to next trip            |
|                                                   |
|  +--------------------------------------------+  |
|  | Finish Trip                                 |  |
|  +--------------------------------------------+  |
|                                                   |
|  Shopping time: 38 min                            |
+--------------------------------------------------+
```

**Key design notes**:
- Clear summary of what was and was not bought
- Explicit statement about carryover behavior
- Staple lifecycle: purchased staples re-queue automatically for next cycle
- One-off lifecycle: purchased one-offs disappear; skipped one-offs carry over
- "Finish Trip" closes the current trip and sets up the next cycle

---

## Emotional Arc Summary

```
Emotion:  Arrival --> Oriented --> Focused --> In Flow --> Satisfied
Step:     Switch      See Aisles   Check Off   Navigate    Complete
Signal:   "let's      "I see       "grab       "aisle      "nothing
           go"         the plan"    these"      by aisle"    missed"
```

The arc follows the **Confidence Building** pattern:
- Start: Purposeful (arrived at store, ready to execute)
- Middle: Focused flow (systematic section-by-section)
- End: Satisfied (complete, nothing missed, system handled carryover)
