# Journey Visual: Store Layout Customization

**Feature ID**: store-section-order
**Journey**: store-layout
**Date**: 2026-03-22

---

## Journey Flow

```
 START                                                                    END
   |                                                                       |
   v                                                                       v
[Open Settings] --> [See Sections] --> [Reorder] --> [Verify in Store] --> [Shop in Order]
   |                     |                |                |                    |
   |                     |                |                |                    |
 Motivated -->      Oriented -->     In Control -->   Confident -->        Satisfied
 "my store          "these are       "drag to         "that matches        "no
  order is           my sections"     match my          my walk"            backtracking"
  wrong"                              walk"
```

---

## Step-by-Step Detail

### Step 1: Recognize the Problem

**Trigger**: Carlos is in the store view and notices sections are listed in aisle-number order, not the order he walks. Toiletries (no aisle) is at the bottom, but it is the first section he passes when entering.

**Emotional state**: Frustrated --> Motivated
Carlos knows the order is wrong and wants to fix it.

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
|                                                   |
|  [gear icon] Store Layout Settings                |
+--------------------------------------------------+
```

**Key design notes**:
- Current default sort: numbered aisles ascending, then named sections alphabetically
- A "Store Layout Settings" entry point is visible from the store view
- The entry point is not prominent -- settings should be a set-and-forget activity

---

### Step 2: Open Store Layout Settings

**Emotional state**: Motivated --> Oriented

Carlos taps "Store Layout Settings." He sees all sections currently known from his staple library, listed in their current sort order.

```
+--------------------------------------------------+
|  < Back         Store Layout                      |
|                                                   |
|  Drag sections to match your walking order        |
|  through the store.                               |
|                                                   |
|  1.  [=] Aisle 3: Dairy                           |
|  2.  [=] Aisle 5: Canned Goods                    |
|  3.  [=] Aisle 7: Paper & Soap                    |
|  4.  [=] Aisle 8: Health & Beauty                  |
|  5.  [=] Aisle 12: Baking                          |
|  6.  [=] Deli                                      |
|  7.  [=] Produce                                   |
|  8.  [=] Bakery                                    |
|  9.  [=] Frozen                                    |
|                                                   |
|  Sections are collected from your staple items.   |
|  New sections appear at the end of this list.     |
|                                                   |
|  [Reset to Default Order]                         |
+--------------------------------------------------+
```

**Key design notes**:
- Each section shows its display name (section + aisle number if present)
- Drag handle [=] on each row for reordering
- Instruction text explains what this screen does
- "Reset to Default Order" provides an escape hatch
- Sections are seeded from existing staple item metadata -- no manual section creation needed initially
- Position numbers shown for clarity

---

### Step 3: Reorder Sections

**Emotional state**: Oriented --> In Control

Carlos drags "Deli" up to position 2 (after Health & Beauty, which is near the entrance). He drags "Produce" to the end. He arranges sections to match his physical walk.

```
+--------------------------------------------------+
|  < Back         Store Layout                      |
|                                                   |
|  Drag sections to match your walking order        |
|  through the store.                               |
|                                                   |
|  1.  [=] Aisle 8: Health & Beauty                  |
|  2.  [=] Deli                                      |
|  3.  [=] Aisle 3: Dairy                            |
|  4.  [=] Aisle 5: Canned Goods                     |
|  5.  [=] Aisle 7: Paper & Soap                     |
|  6.  [=] Aisle 12: Baking                          |
|  7.  [=] Bakery                                    |
|  8.  [=] Frozen                                    |
|  9.  [=] Produce                                   |
|                                                   |
|  Order saved automatically.                       |
|                                                   |
|  [Reset to Default Order]                         |
+--------------------------------------------------+
```

**Key design notes**:
- Drag-and-drop reordering (standard mobile pattern)
- Order saves automatically on each reorder -- no explicit "Save" button needed
- Visual feedback: item animates to new position
- Position numbers update immediately
- "Order saved automatically" reassures Carlos that his changes stick

---

### Step 4: Return to Store View and Verify

**Emotional state**: In Control --> Confident

Carlos goes back to the store view. Sections now appear in his custom order.

```
+--------------------------------------------------+
|  Grocery Smart List           [ Home | STORE ]    |
|                                                   |
|  Store View -- 22 items                           |
|                                                   |
|  Aisle 8: Health & Beauty     2 items             |
|  Deli                          2 items             |
|  Aisle 3: Dairy               4 items             |
|  Aisle 5: Canned Goods        3 items             |
|  Aisle 7: Paper & Soap        3 items             |
|  Aisle 12: Baking             1 item              |
|  Bakery                        1 item              |
|  Frozen                        2 items             |
|  Produce                       4 items             |
|                                                   |
|  9 sections  |  22 items  |  0 checked            |
+--------------------------------------------------+
```

**Key design notes**:
- Custom order replaces the default sort entirely
- Empty sections still hidden (only sections with items on current trip shown)
- Section navigation ("Next" button) follows custom order
- The section order feels like "my store" now

---

### Step 5: Shop in Custom Order

**Emotional state**: Confident --> Satisfied

Carlos shops section by section. The "Next" button follows his custom order. He finishes near Produce (last in his order) right by the checkout.

```
+--------------------------------------------------+
|  < Sections    Aisle 8: Health & Beauty    2/2     |
|                                                   |
|  [x] Shampoo            (staple)    IN CART       |
|  [x] Hand soap           (staple)    IN CART       |
|                                                   |
|  All items in this section!                       |
|                                                   |
|  +--------------------------------------------+  |
|  | Next: Deli (2 items)  >>                    |  |
|  +--------------------------------------------+  |
+--------------------------------------------------+
```

**Key design notes**:
- "Next" follows the custom section order, not aisle number
- Section-to-section flow matches Carlos's physical walking path
- All existing check-off and navigation behaviors work unchanged

---

### Error Path: New Section from New Item

Carlos adds "Sushi rolls" as a one-off in a new section "Sushi Bar" that is not in his section order list.

```
+--------------------------------------------------+
|  < Back         Store Layout                      |
|                                                   |
|  Drag sections to match your walking order        |
|  through the store.                               |
|                                                   |
|  1.  [=] Aisle 8: Health & Beauty                  |
|  2.  [=] Deli                                      |
|  ...                                               |
|  9.  [=] Produce                                   |
|  10. [=] Sushi Bar              (new)              |
|                                                   |
|  New sections appear at the end. Drag to          |
|  reposition.                                      |
+--------------------------------------------------+
```

**Key design notes**:
- New sections auto-append to the end of the custom order
- Marked "(new)" briefly to draw attention
- Carlos can reposition it immediately or leave it at the end
- No blocking -- adding a new section name in item metadata does not require pre-registration

---

### Error Path: Reset to Default

Carlos wants to undo all customization and return to the original aisle-number sort.

```
+--------------------------------------------------+
|  < Back         Store Layout                      |
|                                                   |
|  Reset to default order?                          |
|                                                   |
|  This will sort numbered aisles first             |
|  (ascending), then named sections                 |
|  alphabetically.                                  |
|                                                   |
|  +--------------------------------------------+  |
|  | Reset                                       |  |
|  +--------------------------------------------+  |
|                                                   |
|  [Cancel]                                         |
+--------------------------------------------------+
```

**Key design notes**:
- Confirmation dialog prevents accidental reset
- Clearly explains what "default" means
- Cancel returns to current custom order

---

## Emotional Arc Summary

```
Emotion:  Frustrated --> Motivated --> Oriented --> In Control --> Confident --> Satisfied
Step:     See wrong      Open          See          Drag to       Verify in     Shop in
          order          settings      sections     reorder       store view    custom order
Signal:   "this isn't    "let me       "those are   "now it       "that's my    "no
           my walk"       fix it"       my sections"  matches"      store"        backtracking"
```

The arc follows the **Problem Relief** pattern:
- Start: Frustrated (wrong order, backtracking in store)
- Middle: In Control (drag-and-drop, instant feedback)
- End: Satisfied (store view matches physical reality, every trip)
