# Journey: Persist One-Off Items

## Persona

Elena Ruiz, a busy parent who shops weekly. She buys specialty items (birthday candles, rice paper wrappers, tahini) every few weeks. Each time she re-enters the name, store section, and aisle from scratch.

## Emotional Arc

- **Start**: Mildly frustrated -- "I know I've added this before, why do I have to type it all again?"
- **Middle**: Relieved -- "Oh, it remembered! I just tap and it's done."
- **End**: Confident -- "This app actually learns what I buy."

---

## Flow

```
[User types item name]
        |
        v
[QuickAdd shows suggestions]
   |                    |
   | (staple match)     | (one-off match)
   v                    v
[Staple suggestion]   [One-off suggestion]
   "Milk -              "Tahini -
    Dairy / Aisle 3"     International / Aisle 7
                         (one-off)"
        |                    |
        +--------+-----------+
                 |
                 v  (user taps suggestion)
        [Item added to trip]
        itemType matches source type
        Store location auto-filled
                 |
                 v
        [User continues shopping]
        Feels: confident, efficient
```

---

## Step-by-Step

### Step 1: First-Time Add (one-off persisted)

Elena types "Tahini" in QuickAdd. No suggestions appear (first time). She taps Add, the MetadataBottomSheet opens. She selects "One-off", enters "International" section, aisle 7. She taps "Add Item."

**What happens behind the scenes**: The one-off is added to the current trip AND saved to the staple library with `type: 'one-off'`, `storeLocation: { section: 'International', aisleNumber: 7 }`.

```
+-- MetadataBottomSheet --------------------------------+
|                                                       |
|  Add 'Tahini'                                         |
|                                                       |
|  [ Staple ] [*One-off*]                               |
|                                                       |
|  Store section: [International        ]               |
|  Aisle number:  [7                    ]               |
|                                                       |
|  [        Add Item         ]                          |
|  [  Skip, add with defaults ]                         |
+-------------------------------------------------------+
```

**Emotional state**: Focused -> Satisfied (normal add flow, nothing new)

### Step 2: Re-Add on Next Trip (the payoff)

Two weeks later, Elena starts a new trip. She types "Tah" in QuickAdd. The suggestion list shows:

```
+-- QuickAdd -------------------------------------------+
|  [Tah                          ] [Add]                |
|                                                       |
|  Tahini - International / Aisle 7 (one-off)           |
|  Add 'Tah' as new item...                             |
+-------------------------------------------------------+
```

She taps the suggestion. Tahini is added to the trip with `itemType: 'one-off'`, store location pre-filled. No MetadataBottomSheet needed.

**Emotional state**: Surprised -> Delighted ("It remembered!")

### Step 3: Item Appears in Trip (one-offs section)

The re-added one-off appears in the One-offs section on the home screen, grouped with other one-offs. It does NOT appear in the sweep areas or the staple checklist.

```
+-- Home (Sweep mode) ----------------------------------+
|                                                       |
|  [Sweep] [Checklist]                                  |
|  [Search...                        ] [Add]            |
|                                                       |
|  -- Kitchen Cabinets (3 items) --                     |
|  [x] Olive Oil                                        |
|  [x] Pasta                                            |
|  [ ] Rice                                             |
|                                                       |
|  -- One-offs (1) --                                   |
|  [ ] Tahini  (International / Aisle 7)                |
+-------------------------------------------------------+
```

**Emotional state**: Confident -- everything is where expected

### Step 4: Name Collision (edge case)

Elena has "Butter" as a staple in "Fridge" area. She also wants to add "Butter" as a one-off (e.g., specialty European butter from the International section). She types "Butter" and sees both:

```
+-- QuickAdd -------------------------------------------+
|  [Butter                       ] [Add]                |
|                                                       |
|  Butter - Dairy / Aisle 2                             |
|  Butter - International / Aisle 7 (one-off)           |
|  Add 'Butter' as new item...                          |
+-------------------------------------------------------+
```

The staple suggestion has no label (default). The one-off suggestion shows "(one-off)" to differentiate.

### Step 5: Managing Persisted One-Offs (future)

Elena decides she no longer needs Tahini suggestions. She can remove it from the staple library (existing `remove()` functionality). This is a future enhancement -- the library already supports delete.
