# Journey Visual: Edit Staple Location

**Feature ID**: edit-staple
**Persona**: Carlos Rivera, household grocery planner
**Goal**: Correct a staple's house area or store location when things change
**Job Story Trace**: JS3 (Staple Item Management)

---

## Journey Flow

```
[Trigger]              [Step 1]              [Step 2]              [Step 3]
Carlos notices         Carlos finds          Carlos edits          Carlos sees
wrong location         the staple            the location          updated staple
       |                    |                     |                     |
       v                    v                     v                     v
  "Paper towels       Taps the item         Bottom sheet          Item now shows
   moved to the        in HomeView          opens with            new location
   garage"             during sweep         current values         in both views
                                            pre-filled
                                                |
  Feels: Mildly       Feels: Confident     Feels: In control    Feels: Satisfied
  annoyed             (knows where          (familiar form,       (system reflects
                       to go)               values visible)       reality)

  Artifacts: ---      Artifacts:            Artifacts:            Artifacts:
                      ${stapleId}           ${houseArea}          ${updatedStaple}
                      ${currentArea}        ${storeSection}
                      ${currentSection}     ${aisleNumber}
                      ${currentAisle}
```

## Emotional Arc

**Pattern**: Problem Relief (Frustrated -> Hopeful -> Relieved)

- **Start**: Mildly annoyed -- Carlos knows the data is wrong, wants to fix it quickly
- **Middle**: In control -- the familiar MetadataBottomSheet appears with current values pre-filled, no data re-entry needed
- **End**: Satisfied -- the staple reflects reality, future trips will be correct

## Error Paths

```
[Error 1: Duplicate on move]
Carlos moves "Paper towels" from Kitchen Cabinets to Garage Pantry,
but "Paper towels" already exists in Garage Pantry.
  -> Show: "Paper towels already exists in Garage Pantry"
  -> Carlos can pick a different area or cancel

[Error 2: Accidental edit]
Carlos opens the edit sheet but changes their mind.
  -> Dismiss/cancel returns to previous state with no changes

[Error 3: Area was deleted]
Carlos is editing a staple whose area was batch-renamed.
  -> Not applicable: area rename already propagates to staples.
     Edit sheet shows current (renamed) area.
```

## UI Mockups

### Mockup 1: Item Row with Edit Affordance (HomeView)

```
+-- Fridge ------------------------------------------------+
|                                                           |
|  Whole milk                                    [Skip]     |
|  Greek yogurt                                  [Skip]     |
|  Cheddar cheese                                [Skip]     |
|                                                           |
|                               [Done with Fridge]          |
+-----------------------------------------------------------+
```

**Access point**: Carlos taps the item name (existing `onPress` on TripItemRow).
During sweep (home mode), tap on item name opens the edit bottom sheet
for staple items. One-off items are not editable as staples.

### Mockup 2: Edit Bottom Sheet (pre-filled MetadataBottomSheet)

```
+-- Edit 'Paper towels' -----------------------------------+
|                                                           |
|  [ Staple (locked) ]                                      |
|                                                           |
|  House Area:                                              |
|  [Bathroom] [Garage Pantry*] [Kitchen Cabinets]           |
|  [Fridge] [Freezer]                                       |
|                                                           |
|  Store section: [ Cleaning_______ ]                       |
|                   Cleaning Supplies  <- auto-suggest       |
|                                                           |
|  Aisle number:  [ 7______________ ]                       |
|                                                           |
|  [         Save Changes          ]                        |
|  [            Cancel             ]                        |
|                                                           |
|  [     Remove from Staples       ]  <- destructive,       |
|                                      secondary styling    |
+-----------------------------------------------------------+

* = currently selected (pre-filled from existing data)
```

**Key differences from Add mode**:
- Title says "Edit" not "Add"
- Type toggle is hidden (staple stays staple)
- Fields pre-filled with current values
- "Save Changes" replaces "Add Item"
- "Cancel" replaces "Skip, add with defaults"
- Optional "Remove from Staples" link at bottom

### Mockup 3: Duplicate Warning on Area Change

```
+-- Duplicate Found ----------------------------------------+
|                                                           |
|  "Paper towels" already exists in Garage Pantry           |
|  Cleaning Supplies / Aisle 7                              |
|                                                           |
|  [         Pick Different Area    ]                       |
|  [            Cancel              ]                       |
+-----------------------------------------------------------+
```

### Mockup 4: Confirmation After Save

```
+-- Garage Pantry ------------------------------------------+
|                                                           |
|  Paper towels                                  [Skip]     |
|  ...                                                      |
+-----------------------------------------------------------+
```

Item now appears under its new house area. In store view, it appears
under the updated section/aisle.

## Integration Points

| From | To | Data |
|------|----|------|
| TripItemRow tap | EditBottomSheet | stapleId, current houseArea, storeLocation |
| EditBottomSheet save | StapleLibrary.updateStaple | stapleId, new houseArea, new storeLocation |
| StapleLibrary.updateStaple | StapleStorage | Persisted updated staple |
| StapleLibrary.updateStaple | TripService (current trip) | Trip item area/location updated for current trip |
| Area picker | AreaStorage.loadAll | Dynamic area list including custom areas |
| Section input | existingSections | Auto-suggest from existing staple sections |
