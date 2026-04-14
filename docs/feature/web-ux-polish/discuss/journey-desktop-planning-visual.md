# Journey: Desktop Planning Session (Web UX Polish)

Two related journeys covered here — both describe the same persona on desktop web.

**Persona:** Priya, a weekly meal-planner who uses the grocery-list app on her MacBook on
Sunday evenings to set up the week's shopping trip before handing off to her phone for the
actual store visit. She uses a keyboard primarily and expects web-native interactions.

## Journey A: Power user adds many staples on desktop

**Goal:** Add 10-20 staples (e.g., "bananas", "olive oil", "dish soap") into the library
without breaking keyboard flow.

**Trigger:** Priya notices multiple missing pantry items while meal-planning; opens app in
browser.

### Emotional Arc (Confidence Building → Flow)

```
Start: Mildly impatient ("I have 15 things to add")
  -> After first Enter-to-submit works: Relieved ("it respects my rhythm")
  -> After items 3-4: In flow ("I don't have to think about the UI")
End: Satisfied ("that was fast"), ready to move on to reviewing areas
```

### ASCII Flow

```
 [Opens app on desktop]
        |
        v
 +-------------------------+     Focus already on input
 | Step 1: Focus QuickAdd  |     Affordance: cursor blinking
 | feels: Impatient        |     Signifier: input is autofocused
 +-------------------------+
        |
   types "bananas"
   presses ENTER
        v
 +----------------------------------+    Sheet opens with name prefilled
 | Step 2: MetadataBottomSheet      |    First field (area) autofocused
 | feels: Engaged                   |    Tab moves between fields
 +----------------------------------+
        |
   fills area/aisle
   presses ENTER
        v
 +-------------------------+    Sheet closes
 | Step 3: Focus returns   |    Input focus restored to QuickAdd
 | feels: In flow          |    Input is cleared
 +-------------------------+
        |
   types "olive oil" -> ENTER -> ...
   (repeat 10-20 times)
        v
 +-------------------------+
 | Step 4: Session done    |
 | feels: Satisfied        |
 +-------------------------+
```

### TUI Mockup — QuickAdd (web)

```
+-- QuickAdd (desktop web) --------------------------------------+
|                                                                |
|   [ bananas|                              ]  [ Add ]           |
|     ^cursor (autofocused on mount)                             |
|                                                                |
|   Suggestions:                                                 |
|     - bananas (existing staple)  [Enter to edit]               |
|     + Add "bananas" as new item  [Enter to create]             |
|                                                                |
|   Tip: Press Enter to ${primary_action}                        |
+----------------------------------------------------------------+

${primary_action} source: derived from suggestion state
  - no suggestions     -> "add new item"
  - existing match     -> "edit existing"
  - top = new          -> "add new item"
```

### TUI Mockup — MetadataBottomSheet (web, keyboard-driven)

```
+-- Add: "bananas" -----------------------------------------------+
|                                                                 |
|   Name:   [ bananas                        ]                    |
|   Area:   [ Kitchen               v ]   <- autofocused          |
|   Aisle:  [ Produce               v ]                           |
|   Notes:  [                                ]                    |
|                                                                 |
|                               [ Cancel ]  [ Add Item ]          |
|                                              ^ primary          |
|                                                                 |
|   Tip: Enter submits, Esc cancels                               |
+-----------------------------------------------------------------+
```

## Journey B: Priya edits a staple on desktop

**Goal:** Correct the aisle on an existing staple ("olive oil" is filed under wrong aisle).

**Trigger:** Reviewing the staple checklist before shopping; spots the misfile.

### Emotional Arc (Problem Relief)

```
Start: Frustrated ("how do I edit this on desktop? long-press doesn't work")
  -> Sees pencil icon: Hopeful ("ah, there it is")
  -> Clicks, sheet opens, corrects, submits: Relieved
End: Confident ("I can manage the library from my laptop now")
```

### ASCII Flow

```
 [Reviewing StapleChecklist]
        |
   notices "olive oil" in wrong aisle
        v
 +--------------------------------------+    Pencil icon visible on row
 | Step 1: Hover/scan row               |    (web only; mobile: long-press)
 | feels: Searching for edit affordance |
 +--------------------------------------+
        |
   clicks pencil icon
        v
 +----------------------------------+    Sheet opens, prefilled
 | Step 2: Edit in sheet            |    with "olive oil" data
 | feels: In control                |
 +----------------------------------+
        |
   corrects aisle, presses Enter
        v
 +-------------------------+    Sheet closes
 | Step 3: Row updates     |    Updated value visible
 | feels: Relieved         |    Focus returns to row
 +-------------------------+
```

### TUI Mockup — StapleChecklist row (web)

```
+-- Staples: Kitchen ---------------------------------------------+
|                                                                 |
|   [x] bananas          Produce                        (pencil)  |
|   [x] olive oil        Oils & Vinegars                (pencil)  |
|       ^--- clicking pencil opens MetadataBottomSheet            |
|   [ ] flour            Baking                         (pencil)  |
|                                                                 |
|   (On iOS/Android: long-press any row to edit — no pencil icon) |
+-----------------------------------------------------------------+
```

### TUI Mockup — StapleChecklist row (iOS/Android — unchanged)

```
+-- Staples: Kitchen -----------+
|                               |
|   [x] bananas         Produce |    <-- long-press to edit
|   [x] olive oil       Oils... |
|   [ ] flour           Baking  |
|                               |
+-------------------------------+
```

## Shared Artifacts

| Artifact | Source | Displayed as |
|----------|--------|--------------|
| `platform_is_web` | `Platform.OS === 'web'` (React Native) | Gates pencil icon rendering, autofocus props, Enter key handlers |
| `staple_name` | QuickAdd input text | Prefilled into MetadataBottomSheet name field |
| `staple_record` | Library store | Prefilled into MetadataBottomSheet when editing |
| `primary_action_on_enter` | derived from input + suggestion state | QuickAdd Enter handler dispatches accordingly |
| `focus_target_after_close` | QuickAdd input ref | Focus restored after sheet dismissal |

## Integration Checkpoints

- Platform detection happens in ONE place per component; do not scatter `Platform.OS` checks
- `Platform.OS === 'web'` is the sole detection mechanism (no user-agent sniffing)
- Enter-key semantics are identical between QuickAdd and MetadataBottomSheet (primary submit)
- Focus ref on QuickAdd input is stable across sheet open/close cycles
- Pencil icon click and native long-press dispatch to the same edit handler

## Failure Modes

- Enter key pressed with empty QuickAdd input — no-op, no sheet opens, soft feedback
- Enter key pressed in MetadataBottomSheet with invalid name — validation blocks submit,
  error shown inline; focus moved to invalid field
- Focus restoration fails (e.g., input unmounted) — graceful; cursor lands somewhere sane
- Pencil icon accidentally rendered on mobile native — regression; caught by test
- Enter inside Notes textarea submits prematurely — mitigated by limiting Enter-submit to
  single-line inputs; multi-line fields use Shift+Enter / Cmd+Enter convention
