# Journey Visual: Reorder Home Areas

**Feature ID**: reorder-home-areas
**Persona**: Carlos Rivera
**Goal**: Change the order of house areas so the sweep matches Carlos's current walking path.
**Trigger**: Carlos notices, mid-sweep or before starting, that the app's area order no longer matches his walk (e.g., he moved his laundry downstairs).

---

## Journey Overview

```
 [ Home View ]          [ Settings ]            [ Reorder in Place ]        [ Home View ]
     |                      |                          |                         |
     |   tap gear icon      |                          |                         |
     |--------------------->|                          |                         |
     |                      |  see ordered list        |                         |
     |                      |  each row has up/down    |                         |
     |                      |  buttons                 |                         |
     |                      |                          |                         |
     |                      |  tap down on "Laundry"   |                         |
     |                      |------------------------->|                         |
     |                      |                          | list re-renders         |
     |                      |                          | order auto-saves        |
     |                      |                          | "Saved" toast appears   |
     |                      |                          |                         |
     |                      |     tap back             |                         |
     |                      |<-------------------------|                         |
     |                      |                          |                         |
     |   areas render in new order in HomeView                                   |
     |<--------------------------------------------------------------------------|
     |                                                                           |
  Feels:                Feels:                     Feels:                    Feels:
  "My walk              "I see my areas."          Mild worry:               Relief + quiet
  doesn't match                                    "Will this mess           satisfaction:
  the app."                                        up my staples?"           "The app matches
                                                   -> Auto-save              my walk now."
                                                   reassures.
```

---

## Emotional Arc

| Phase | Emotion | Design Lever |
|-------|---------|--------------|
| Start (HomeView, noticing mismatch) | Mild friction / mild irritation | A visible entry point (gear icon) gives Carlos agency |
| Settings screen (seeing the order) | Focused, oriented | The list mirrors exactly what HomeView showed — no translation needed |
| First tap of up/down | Mild anxiety: "am I safe to rearrange?" | Auto-save toast and untouched staple counts reassure |
| After a few taps | Building confidence | Each tap produces immediate re-render — no latency, no "are you sure" |
| Return to HomeView | Relief + quiet pride | The sweep order now matches the walk; staples are untouched |
| Next sweep | Flow state | Walk and app are in sync; no more mental translation |

The arc is deliberately mild — this is a settings task, not a dramatic journey. The key emotional beat is converting potential anxiety ("will this break my staples?") into confidence through immediate, non-destructive feedback.

---

## Step 1: Entry Point — HomeView with Settings Gear

```
+---------------------------------------------------+
|  Home Sweep                                   [O] |  <- gear icon opens settings
+---------------------------------------------------+
|  Bathroom                                  3 / 5  |
|  Kitchen Cabinets                          1 / 4  |
|  Fridge                                    0 / 6  |
|  Laundry Room                              0 / 2  |
|  Freezer                                   0 / 3  |
+---------------------------------------------------+
```

Carlos feels: "This order doesn't match my walk. Laundry is upstairs now — I pass it first."

Integration checkpoint: the `${areas[]}` list shown here is read from `AreaStorage` via `useAreas().areas`.

---

## Step 2: Area Settings Screen — Showing Order with Up/Down Controls

```
+---------------------------------------------------+
|  < Back           Manage Areas                    |
+---------------------------------------------------+
|                                                   |
|  [^] [v]  Bathroom                   [edit] [x]  |
|  [^] [v]  Kitchen Cabinets           [edit] [x]  |
|  [^] [v]  Fridge                     [edit] [x]  |
|  [^] [v]  Laundry Room               [edit] [x]  |
|  [^] [v]  Freezer                    [edit] [x]  |
|                                                   |
|                            [ + Add Area ]         |
+---------------------------------------------------+
```

Carlos sees exactly the areas from HomeView in the same order. Each row now has an up arrow and a down arrow (disabled at list boundaries — grey for first row's up, last row's down). Edit and delete buttons persist from the existing AreaSettingsScreen.

Integration checkpoint: the list is rendered from the same `${areas[]}` as HomeView — no reordering of the display happens in the UI, only reordering of the underlying data.

---

## Step 3: Reorder in Place — Tap Down on "Laundry Room"

Carlos wants Laundry Room at position 1 (top). He taps the up arrow on Laundry Room twice.

After first tap (Laundry moves above Fridge):

```
+---------------------------------------------------+
|  < Back           Manage Areas                    |
+---------------------------------------------------+
|                                                   |
|  [^] [v]  Bathroom                   [edit] [x]  |
|  [^] [v]  Kitchen Cabinets           [edit] [x]  |
|  [^] [v]  Laundry Room               [edit] [x]  |  <- moved up
|  [^] [v]  Fridge                     [edit] [x]  |
|  [^] [v]  Freezer                    [edit] [x]  |
|                                                   |
|  Saved                                           |  <- toast, 2s fade
+---------------------------------------------------+
```

After second tap (Laundry above Kitchen Cabinets), and third (Laundry above Bathroom):

```
+---------------------------------------------------+
|  < Back           Manage Areas                    |
+---------------------------------------------------+
|                                                   |
|  [^] [v]  Laundry Room               [edit] [x]  |  <- now at top; [^] disabled
|  [^] [v]  Bathroom                   [edit] [x]  |
|  [^] [v]  Kitchen Cabinets           [edit] [x]  |
|  [^] [v]  Fridge                     [edit] [x]  |
|  [^] [v]  Freezer                    [edit] [x]  |
|                                                   |
|  Saved                                           |
+---------------------------------------------------+
```

Each tap:
1. Calls `reorderAreas(newOrder)` which hits the domain's `AreaManagement.reorder()`.
2. `reorder()` returns `success: true` (the set of areas is unchanged — just permuted).
3. React state refreshes via `useAreas`.
4. "Saved" toast appears for ~2s.
5. No explicit save button; the toast confirms persistence.

Carlos feels: initial worry ("what if this breaks my staples?") gives way to confidence as each tap shows an instant, non-destructive update.

---

## Step 4: Return to HomeView — See New Order Reflected

Carlos taps Back. HomeView renders:

```
+---------------------------------------------------+
|  Home Sweep                                   [O] |
+---------------------------------------------------+
|  Laundry Room                              0 / 2  |  <- new top
|  Bathroom                                  3 / 5  |
|  Kitchen Cabinets                          1 / 4  |
|  Fridge                                    0 / 6  |
|  Freezer                                   0 / 3  |
+---------------------------------------------------+
```

Staple counts are unchanged (`3 / 5` for Bathroom still shows Carlos's same 3 checked staples). The reorder only affected the display sequence, not the data.

Carlos feels: relief and quiet pride. The app now matches his walk.

Integration checkpoint: HomeView reads from the same `AreaStorage` that the settings screen just wrote to. Firestore onSnapshot also pushes the new order to Carlos's other device (if he has the app open on a tablet, it updates within 5 seconds).

---

## Failure Mode (covered by edge case scenario)

The only domain-level failure is "reorder list length mismatch" — i.e., `newOrder` does not contain exactly the same areas as current storage. This cannot happen from legitimate UI flow (the UI only permutes the existing list). If it somehow occurs (e.g., a bug or a race with a concurrent delete), `reorder()` returns `{ success: false, error: 'Reorder must contain exactly the same areas' }` and the UI must:

- Leave the list in its last-known-good order
- Show a non-alarming error ("Couldn't save — please try again")
- Re-read from `useAreas().areas` to recover

This is a safety net, not an expected user path.

---

## Cross-Device Sync Visualization

```
  Carlos's phone                        Carlos's tablet
  --------------                        ---------------
  tap [^] on Laundry
       |
       v
  reorderAreas(newOrder)
       |
       v
  AreaStorage.saveAll -----+
       |                   |
       v                   | Firestore write
  local state refresh      |
  "Saved" toast            v
                      +----+----+
                      | Firestore |
                      +----+----+
                           | onSnapshot (<= 5s)
                           v
                      tablet state refresh
                      HomeView re-renders in new order
```

Carlos does not need to do anything on the tablet — it just quietly updates.
