<!-- markdownlint-disable MD024 -->
# User Stories: Edit Staple Location

**Feature ID**: edit-staple
**Date**: 2026-03-22

---

## Release 1: Core Edit (Walking Skeleton)

---

## US-ES-01: Edit Staple House Area

### Problem
Carlos Rivera is a household grocery planner who reorganizes his home periodically. He finds it frustrating that after moving paper towels from the kitchen cabinets to the garage pantry, his shopping app still groups them under Kitchen Cabinets during the sweep. He has no way to correct this without deleting the staple and re-creating it from scratch, losing the original metadata.

### Who
- Carlos Rivera | Household grocery planner | Wants staple locations to reflect where items actually live in his house

### Solution
Allow Carlos to tap a staple item during the home sweep to open an edit sheet with pre-filled current values, change the house area, and save the update.

### Domain Examples
#### 1: Move Paper Towels to Garage
Carlos moved his paper towels from Kitchen Cabinets to Garage Pantry last weekend. During his bi-weekly sweep, he taps "Paper towels" under Kitchen Cabinets, selects "Garage Pantry" in the area picker, and taps Save Changes. Paper towels now appear under Garage Pantry.

#### 2: Reassign to Custom Area
Carlos created a new custom area "Laundry Room" and wants to move "Dryer sheets" from Bathroom to Laundry Room. He taps "Dryer sheets," sees all areas including Laundry Room in the picker, selects it, and saves. Dryer sheets now appear under Laundry Room.

#### 3: Duplicate Blocked on Area Change
Carlos has "Trash bags" in both Kitchen Cabinets and Garage Pantry. When he tries to move the Kitchen Cabinets "Trash bags" to Garage Pantry, the app shows "Trash bags already exists in Garage Pantry" and the edit is not saved. Carlos picks a different area instead.

#### 4: Cancel Without Saving
Carlos opens the edit sheet for "Whole milk" but decides not to change anything. He taps Cancel and the sheet closes with no modifications to the staple.

### UAT Scenarios (BDD)

#### Scenario: Open edit sheet with pre-filled house area
Given Carlos has "Paper towels" as a staple in "Kitchen Cabinets" with section "Cleaning" aisle 5
When Carlos taps "Paper towels" in the home view
Then the edit sheet opens with "Kitchen Cabinets" pre-selected in the area picker
And the section field shows "Cleaning"
And the aisle field shows "5"

#### Scenario: Change house area and save
Given Carlos is editing "Paper towels" currently in "Kitchen Cabinets"
When Carlos selects "Garage Pantry" as the house area
And Carlos taps "Save Changes"
Then "Paper towels" is saved with house area "Garage Pantry" in the staple library
And "Paper towels" appears under "Garage Pantry" in the home view

#### Scenario: Duplicate prevents area change
Given "Trash bags" exists as a staple in both "Kitchen Cabinets" and "Garage Pantry"
When Carlos edits the Kitchen Cabinets "Trash bags" and selects "Garage Pantry"
And Carlos taps "Save Changes"
Then the app shows "Trash bags already exists in Garage Pantry"
And the staple is not modified

#### Scenario: Cancel edit preserves original
Given Carlos is editing "Paper towels" in "Kitchen Cabinets"
And Carlos selects "Garage Pantry"
When Carlos taps "Cancel"
Then "Paper towels" remains in "Kitchen Cabinets" unchanged

#### Scenario: Edit sheet shows custom areas
Given Carlos has a custom area "Laundry Room"
When Carlos taps "Dryer sheets" to edit
Then the area picker includes "Laundry Room"

### Acceptance Criteria
- [ ] Tapping a staple item in home view opens the edit bottom sheet
- [ ] Edit sheet pre-fills house area, store section, and aisle from current staple data
- [ ] Changing house area and saving updates the staple in the library
- [ ] Duplicate name+area combinations are prevented with a clear message
- [ ] Cancel dismisses the sheet with no changes
- [ ] Area picker includes all areas from AreaStorage (including custom areas)
- [ ] One-off items do not open an edit sheet

### Outcome KPIs
- **Who**: Carlos (household grocery planner with 20+ staples)
- **Does what**: Corrects a staple's house area without delete-and-recreate
- **By how much**: Edit takes under 10 seconds (vs 30+ seconds to delete and re-add)
- **Measured by**: Time from tap to save; count of edit-vs-delete-recreate actions
- **Baseline**: No edit capability exists (must delete and re-create)

### Technical Notes
- New domain function needed: `updateStaple(id, changes)` on StapleLibrary
- New port method needed: `update(item: StapleItem)` on StapleStorage (or reuse `save` with same ID)
- MetadataBottomSheet can be extended with an "edit" mode (pre-filled values, different title/buttons)
- Duplicate check: reuse existing `isDuplicate` logic but exclude the staple being edited

### Job Story Trace
- JS3: Staple Item Management

### Dependencies
- StapleLibrary (exists, needs updateStaple)
- StapleStorage (exists, needs update method or save-by-id)
- MetadataBottomSheet (exists, needs edit mode)
- AreaStorage (exists, no changes)

---

## US-ES-02: Edit Staple Store Location

### Problem
Carlos Rivera is a household grocery planner who shops at a store that occasionally reorganizes its aisles. He finds it annoying that after the store moved Dairy from Aisle 3 to Aisle 4, his app still shows Aisle 3 for milk and yogurt. He wants to update the store section and aisle without affecting which house area the item belongs to.

### Who
- Carlos Rivera | Household grocery planner | Wants store location data to match the current store layout

### Solution
Allow Carlos to change a staple's store section and aisle number from the edit sheet, with section auto-suggest from existing staple sections.

### Domain Examples
#### 1: Store Reorganized Dairy Aisle
The store moved Dairy from Aisle 3 to Aisle 4. Carlos taps "Whole milk" in the Fridge area, changes the aisle from 3 to 4, and saves. He does the same for "Greek yogurt." Both now show Aisle 4 in store view.

#### 2: Correct Wrong Section
Carlos initially entered "Cheddar cheese" with section "Refrigerated" but it should be "Dairy." He taps it, clears the section, types "Dai," selects "Dairy" from auto-suggest, and saves.

#### 3: Remove Aisle Number
Carlos realizes rotisserie chicken is in the Deli counter, not a numbered aisle. He taps "Rotisserie chicken," clears the aisle field, and saves. It now appears after numbered aisles in store view.

### UAT Scenarios (BDD)

#### Scenario: Change aisle number
Given Carlos has "Whole milk" as a staple with section "Dairy" aisle 3
When Carlos taps "Whole milk" to edit
And Carlos changes the aisle number to "4"
And Carlos taps "Save Changes"
Then "Whole milk" is saved with aisle 4 in the staple library
And "Whole milk" appears in Aisle 4 in the store view

#### Scenario: Change store section with auto-suggest
Given Carlos has "Cheddar cheese" with section "Refrigerated"
And the staple library contains sections: Dairy, Cleaning, Produce, Refrigerated
When Carlos taps "Cheddar cheese" to edit
And Carlos clears the section and types "Dai"
Then the auto-suggest shows "Dairy"
When Carlos selects "Dairy" from suggestions
And Carlos taps "Save Changes"
Then "Cheddar cheese" is saved with section "Dairy"

#### Scenario: Remove aisle number
Given Carlos has "Rotisserie chicken" with section "Deli" aisle 8
When Carlos taps "Rotisserie chicken" to edit
And Carlos clears the aisle number field
And Carlos taps "Save Changes"
Then "Rotisserie chicken" is saved with no aisle number
And it appears under "Deli" after numbered aisles in store view

#### Scenario: Change section and aisle together
Given Carlos has "Paper towels" with section "Cleaning" aisle 5
When Carlos edits "Paper towels" and changes section to "Cleaning Supplies" and aisle to "7"
And Carlos taps "Save Changes"
Then "Paper towels" is saved with section "Cleaning Supplies" aisle 7

### Acceptance Criteria
- [ ] Store section can be changed and saved
- [ ] Aisle number can be changed and saved
- [ ] Aisle number can be cleared (set to null)
- [ ] Section auto-suggest works in edit mode with existing sections
- [ ] Section and aisle changes can be combined with area changes in a single save

### Outcome KPIs
- **Who**: Carlos (household grocery planner)
- **Does what**: Updates store location of staples when store reorganizes
- **By how much**: Store view accuracy stays above 95% of items in correct aisle
- **Measured by**: Count of staple edits that change section/aisle only
- **Baseline**: No edit capability (stale aisle data accumulates)

### Technical Notes
- Shares the edit sheet with US-ES-01 (same bottom sheet, same save action)
- Section auto-suggest: reuse `filterSectionSuggestions` already in MetadataBottomSheet
- Store location update is part of the same `updateStaple` domain function

### Job Story Trace
- JS3: Staple Item Management

### Dependencies
- US-ES-01 (edit sheet infrastructure)

---

## Release 2: Full Edit Experience

---

## US-ES-03: Remove Staple from Edit Sheet

### Problem
Carlos Rivera is a household grocery planner who occasionally discovers during a sweep that a staple is no longer needed (stopped buying a brand, dietary change). He finds it inconvenient that he cannot remove the staple from the same place where he sees it -- the edit sheet. He has to remember to go to settings or find another path to delete it.

### Who
- Carlos Rivera | Household grocery planner | Wants to remove obsolete staples without leaving the edit context

### Solution
Add a "Remove from Staples" option at the bottom of the edit sheet, with a confirmation step to prevent accidental deletion.

### Domain Examples
#### 1: Remove Discontinued Brand
Carlos stopped buying "Fancy crackers" after a price increase. During his sweep, he taps "Fancy crackers," taps "Remove from Staples," confirms, and the item is gone from the library. On the current trip it becomes a one-off that he can skip.

#### 2: Cancel Accidental Remove
Carlos accidentally taps "Remove from Staples" on "Whole milk." The confirmation prompt appears, he taps Cancel, and milk remains in the library untouched.

#### 3: Remove and Skip on Current Trip
Carlos removes "Almond butter" from staples. On the current trip, almond butter becomes a one-off item. Carlos then skips it since he does not need it this trip either.

### UAT Scenarios (BDD)

#### Scenario: Remove staple with confirmation
Given Carlos is editing "Fancy crackers" in "Kitchen Cabinets"
When Carlos taps "Remove from Staples"
And Carlos confirms the removal
Then "Fancy crackers" is removed from the staple library
And "Fancy crackers" on the current trip becomes a one-off item

#### Scenario: Cancel removal preserves staple
Given Carlos is editing "Whole milk" in "Fridge"
When Carlos taps "Remove from Staples"
And Carlos cancels the confirmation
Then "Whole milk" remains in the staple library
And the edit sheet remains open

#### Scenario: Removed staple does not appear on next trip
Given Carlos removed "Fancy crackers" from the staple library
When Carlos starts a new trip
Then "Fancy crackers" does not appear as a pre-loaded staple

### Acceptance Criteria
- [ ] "Remove from Staples" button appears on the edit sheet
- [ ] Tapping remove triggers a confirmation prompt
- [ ] Confirmed removal deletes the staple from the library
- [ ] Current trip item converts from staple to one-off on removal
- [ ] Cancelled removal preserves the staple and keeps the edit sheet open

### Outcome KPIs
- **Who**: Carlos (household grocery planner)
- **Does what**: Removes obsolete staples directly from the edit context
- **By how much**: Removal takes under 5 seconds (single-context action)
- **Measured by**: Count of removals via edit sheet vs other paths
- **Baseline**: Must navigate away from sweep to remove staples

### Technical Notes
- Domain `remove` already exists on StapleLibrary -- wire it to the edit sheet
- Trip item conversion: change `itemType` from 'staple' to 'one-off' for current trip item
- Confirmation UX: inline confirmation (like reset sweep) or alert dialog

### Job Story Trace
- JS3: Staple Item Management

### Dependencies
- US-ES-01 (edit sheet must exist)
- StapleLibrary.remove (exists)

---

## US-ES-04: Sync Current Trip on Staple Edit

### Problem
Carlos Rivera is a household grocery planner who edits a staple's location mid-sweep. He finds it confusing that after changing paper towels from Kitchen Cabinets to Garage Pantry in the staple library, the paper towels on his current trip still show under Kitchen Cabinets until the next trip. He expects the current trip to reflect the change immediately.

### Who
- Carlos Rivera | Household grocery planner mid-sweep | Expects current trip to reflect staple edits immediately

### Solution
When a staple is edited, update the matching trip item on the active trip so the current sweep and store view reflect the change instantly.

### Domain Examples
#### 1: Area Change Reflected Immediately
Carlos moves "Paper towels" from Kitchen Cabinets to Garage Pantry in the edit sheet. Immediately, the current trip shows paper towels under Garage Pantry in both home and store views.

#### 2: Aisle Change Reflected in Store View
Carlos changes "Whole milk" from Aisle 3 to Aisle 4. In store view, milk now appears in Aisle 4 without needing to start a new trip.

#### 3: No Trip Active (Edit Outside Sweep)
Carlos edits a staple when no trip is active. The change is saved to the library. The next trip created will use the updated location.

### UAT Scenarios (BDD)

#### Scenario: Trip item area updates on staple edit
Given a trip is active with "Paper towels" in "Kitchen Cabinets"
When Carlos edits the staple "Paper towels" and changes area to "Garage Pantry"
And Carlos taps "Save Changes"
Then the trip item "Paper towels" appears under "Garage Pantry" in home view
And the trip item "Paper towels" no longer appears under "Kitchen Cabinets"

#### Scenario: Trip item store location updates on staple edit
Given a trip is active with "Whole milk" in section "Dairy" aisle 3
When Carlos edits "Whole milk" and changes aisle to 4
And Carlos taps "Save Changes"
Then the trip item "Whole milk" appears in Aisle 4 in store view

#### Scenario: No trip active, only library updated
Given no trip is currently active
When Carlos edits "Paper towels" and changes area to "Garage Pantry"
Then the staple library shows "Paper towels" in "Garage Pantry"
And the next trip created pre-loads "Paper towels" under "Garage Pantry"

### Acceptance Criteria
- [ ] Editing a staple's area updates the matching trip item's area on the active trip
- [ ] Editing a staple's store location updates the matching trip item's store location
- [ ] If no trip is active, only the staple library is updated
- [ ] Trip item identity (id, checked state, needed state) is preserved during update

### Outcome KPIs
- **Who**: Carlos (mid-sweep)
- **Does what**: Sees corrected location immediately in current trip without restarting
- **By how much**: 100% of edits reflected in current trip within the same session
- **Measured by**: UI state after edit save (trip items match staple library)
- **Baseline**: Edits only take effect on next trip

### Technical Notes
- Trip items link to staples via name+area (no stapleId foreign key currently)
- Matching strategy: find trip item where `name === staple.name` and `houseArea === oldArea`
- Must preserve trip item state (checked, needed, checkedAt) while updating location fields
- Consider adding `stapleId` to TripItem for reliable matching (currently null for preloaded items)

### Job Story Trace
- JS3: Staple Item Management

### Dependencies
- US-ES-01 (edit sheet and updateStaple must exist)
- TripService (exists, needs updateItemLocation or similar)
