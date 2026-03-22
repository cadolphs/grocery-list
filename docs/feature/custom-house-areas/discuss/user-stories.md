<!-- markdownlint-disable MD024 -->
# User Stories: Custom House Areas

**Feature ID**: custom-house-areas
**Date**: 2026-03-20

---

## Changed Assumptions

The original grocery-smart-list DISCUSS wave decided:

> "House areas as fixed list -- 5 areas are stable; dynamic management is over-engineering for initial scope."

This feature reverses that decision. The 5 hardcoded areas become the default starting set for new users, but all areas are now user-configurable.

---

## Walking Skeleton Stories

---

## US-CHA-01: View Area List in Settings

### Problem
Carlos Rivera wants to see what house areas his app is configured with. Currently there is no way to view or manage areas -- they are invisible, hardcoded constants. When his sister Ana Lucia sets up the app for her house (which has no garage but has a laundry room), she has no idea why "Garage Pantry" appears or how to change it.

### Who
- Ana Lucia Rivera | New user with a different house layout | Wants to understand and control her area configuration

### Solution
A settings screen accessible from the home view that displays the current list of house areas with their order.

### Domain Examples
#### 1: Default Areas on Fresh Install
Ana Lucia opens the app for the first time and taps the settings icon. She sees 5 areas: Bathroom, Garage Pantry, Kitchen Cabinets, Fridge, Freezer. These are the defaults.

#### 2: Custom Areas After Modification
Carlos has added "Laundry Room" and renamed "Garage Pantry" to "Pantry." When he opens settings, he sees 6 areas in his custom order: Bathroom, Laundry Room, Pantry, Kitchen Cabinets, Fridge, Freezer.

#### 3: Settings Accessible During Sweep
Carlos is mid-sweep and realizes he forgot to add a room. He taps the gear icon, sees his areas, and can make changes without losing sweep progress.

### UAT Scenarios (BDD)

#### Scenario: View default areas on fresh install
Given Ana Lucia has just installed the app
When Ana Lucia taps the settings icon from the home view
Then she sees 5 house areas: Bathroom, Garage Pantry, Kitchen Cabinets, Fridge, Freezer
And each area shows a drag handle and an edit button
And an "Add Area" button appears at the bottom

#### Scenario: View custom areas after modification
Given Carlos has added "Laundry Room" and renamed "Garage Pantry" to "Pantry"
When Carlos opens the area settings
Then he sees 6 areas in his custom order
And "Pantry" appears where "Garage Pantry" used to be
And "Laundry Room" appears in its configured position

#### Scenario: Settings accessible from home view
Given Carlos is on the home view during a sweep
When Carlos taps the settings gear icon
Then the area management screen opens
And Carlos can navigate back without losing sweep state

### Acceptance Criteria
- [ ] Settings icon visible on the home view
- [ ] Area list displays all configured areas in order
- [ ] Each area shows drag handle and edit affordance
- [ ] "Add Area" button visible at the bottom
- [ ] Fresh install shows 5 default areas

### Outcome KPIs
- **Who**: New users (like Ana Lucia)
- **Does what**: Discovers area management within first session
- **By how much**: 80% of users who open settings find area management
- **Measured by**: Settings screen open rate in first session
- **Baseline**: N/A (settings screen does not exist yet)

### Technical Notes
- Requires new AreaStorage port for persisting area list
- Default areas seeded on first launch (migration path for existing users)
- Settings icon added to HomeView header

### Job Story Trace
- JS1 (Home Sweep Capture), JS3 (Staple Item Management)

---

## US-CHA-02: Add a New House Area

### Problem
Ana Lucia Rivera has a laundry room where she keeps household supplies (detergent, dryer sheets, stain remover). The app only shows 5 rooms that do not match her house. She cannot add items to a "Laundry Room" area because it does not exist. She ends up putting laundry items under "Bathroom" which feels wrong and makes her sweep confusing.

### Who
- Ana Lucia Rivera | User with rooms not in the default list | Wants to add areas that match her actual home

### Solution
An "Add Area" action that creates a new house area with a user-chosen name, appended to the end of the area list.

### Domain Examples
#### 1: Add Laundry Room
Ana Lucia taps "Add Area," types "Laundry Room," and taps Save. "Laundry Room" appears at the end of her area list. She can now assign staples to it.

#### 2: Add Basement Pantry
Carlos's neighbor Miguel has a basement pantry. He adds "Basement Pantry" and starts assigning bulk items (paper towels, canned goods) to it.

#### 3: Add Office
Work-from-home user Priya Sharma adds "Office" for office supplies she buys at the grocery store (snack bars, tea, hand sanitizer).

### UAT Scenarios (BDD)

#### Scenario: Add a new area
Given Ana Lucia is on the area management screen with 5 default areas
When Ana Lucia taps "Add Area"
And Ana Lucia types "Laundry Room"
And Ana Lucia taps "Save"
Then "Laundry Room" appears at the end of the area list
And the area count is 6

#### Scenario: New area appears in home view
Given Ana Lucia has added "Laundry Room"
When Ana Lucia returns to the home view
Then "Laundry Room" appears with "0 staples due"
And sweep progress shows "0 of 6 areas complete"

#### Scenario: New area appears in area picker
Given Ana Lucia has added "Laundry Room"
When Ana Lucia opens the metadata bottom sheet to add a new item
Then "Laundry Room" appears as an area option alongside the other 5

#### Scenario: Add staple to new area
Given Ana Lucia has added "Laundry Room"
When Ana Lucia adds "Detergent" as a staple in "Laundry Room," section "Cleaning," aisle 9
Then detergent is saved with houseArea "Laundry Room"
And on the next sweep, detergent appears pre-loaded in "Laundry Room"

### Acceptance Criteria
- [ ] New area created with a user-provided name
- [ ] New area appended to end of area list by default
- [ ] New area immediately available in home view, area picker, and sweep progress
- [ ] New area persists across app restart

### Outcome KPIs
- **Who**: Users with non-default rooms (Ana Lucia, Miguel, Priya)
- **Does what**: Adds at least 1 custom area within first week
- **By how much**: 60% of active users add at least 1 area
- **Measured by**: Count of users with >5 areas
- **Baseline**: 0 (feature does not exist)

### Technical Notes
- New area gets a generated ID and position = last
- Area name validation deferred to US-CHA-07

### Job Story Trace
- JS1 (Home Sweep Capture), JS3 (Staple Item Management)

---

## US-CHA-03: Home View and Domain Logic Use Dynamic Area List

### Problem
Carlos Rivera has added "Laundry Room" to his areas, but the home view still only shows 5 hardcoded areas. The `groupByArea` function ignores his new area. The sweep progress says "0 of 5 areas complete" even though he has 6 areas. The area picker in the metadata sheet only shows the original 5. His new area is invisible to the rest of the app.

### Who
- Carlos Rivera | User who added a custom area | Expects the entire app to recognize his new area

### Solution
All domain logic and UI components that reference house areas read from the dynamic area list (AreaStorage) instead of hardcoded constants.

### Domain Examples
#### 1: groupByArea Includes Laundry Room
Carlos has 6 areas. When he starts a sweep, `groupByArea` returns 6 groups -- including "Laundry Room" with its 2 staples (detergent, dryer sheets).

#### 2: Sweep Progress Reflects 6 Areas
Carlos completes Bathroom. Sweep progress shows "1 of 6 areas complete" (not "1 of 5").

#### 3: Area Picker Shows All 6
Carlos opens the metadata bottom sheet to add "Fabric softener." The area picker shows 6 buttons including "Laundry Room."

### UAT Scenarios (BDD)

#### Scenario: groupByArea returns custom areas
Given Carlos has 6 areas including "Laundry Room"
And "Laundry Room" has 2 staples: detergent and dryer sheets
When Carlos starts a new sweep
Then the home view shows 6 area sections
And "Laundry Room" shows 2 pre-loaded staples

#### Scenario: Sweep progress uses dynamic area count
Given Carlos has 6 areas
When Carlos completes "Bathroom" during a sweep
Then sweep progress shows "1 of 6 areas complete"
And "all areas complete" triggers only after completing all 6

#### Scenario: MetadataBottomSheet shows dynamic area list
Given Carlos has 6 areas including "Laundry Room"
When Carlos opens the metadata bottom sheet to add a new item
Then 6 area buttons are shown, including "Laundry Room"

#### Scenario: Removed area not shown anywhere
Given Carlos deleted "Freezer" (now has 5 areas)
When Carlos views the home screen
Then only 5 area sections appear
And "Freezer" does not appear in the area picker

### Acceptance Criteria
- [ ] `groupByArea` accepts area list as parameter (no hardcoded constant)
- [ ] `getSweepProgress` uses dynamic area count (no hardcoded constant)
- [ ] `MetadataBottomSheet` reads areas from storage (no hardcoded array)
- [ ] `HomeView` displays areas from the dynamic list in the configured order
- [ ] All existing behavior preserved when using the 5 default areas

### Outcome KPIs
- **Who**: All users
- **Does what**: See consistent area information across all screens
- **By how much**: Zero screens show stale or hardcoded area lists
- **Measured by**: Presence of hardcoded area references in codebase (should be zero)
- **Baseline**: 3 hardcoded area lists (item-grouping.ts, trip.ts, MetadataBottomSheet.tsx)

### Technical Notes
- `ALL_HOUSE_AREAS` constant removed from `item-grouping.ts` and `trip.ts`
- `groupByArea` signature changes: `(items: TripItem[], areas: string[]) => AreaGroup[]`
- `HOUSE_AREAS` constant removed from `MetadataBottomSheet.tsx`
- `HouseArea` type in `types.ts` changes from union to `string` (or branded string)
- Existing tests updated to provide area list explicitly

### Job Story Trace
- JS1 (Home Sweep Capture), JS3 (Staple Item Management)

---

## Release 1 Stories

---

## US-CHA-04: Rename a House Area

### Problem
Carlos Rivera calls his garage pantry just "the pantry" in everyday conversation. Every time he sees "Garage Pantry" in the app, it feels slightly off -- it is technically correct but not how he and Elena refer to it. He wants the app to use the same words his family uses.

### Who
- Carlos Rivera | Existing user who wants area names to match his vocabulary | Wants names that feel natural

### Solution
An edit screen for each area where the user can change the name. Renaming propagates automatically to all staples and trip items that reference the old name.

### Domain Examples
#### 1: Rename Garage Pantry to Pantry
Carlos opens settings, taps "Garage Pantry," changes it to "Pantry," and saves. All 4 staples (canned tomatoes, rice, pasta, beans) now show "Pantry" as their area. The home view shows "Pantry (4)" where "Garage Pantry (4)" was.

#### 2: Rename Fridge to Refrigerator
Ana Lucia prefers "Refrigerator." She renames it. Her 6 staples (milk, butter, cheese, yogurt, eggs, orange juice) all update to "Refrigerator."

#### 3: Rename During Active Trip
Carlos is mid-sweep and realizes "Kitchen Cabinets" should just be "Kitchen." He renames it. The 5 trip items currently in "Kitchen Cabinets" update to "Kitchen" in his active trip.

### UAT Scenarios (BDD)

#### Scenario: Rename area and propagate to staples
Given Carlos has 4 staples in "Garage Pantry": canned tomatoes, rice, pasta, beans
When Carlos opens the edit screen for "Garage Pantry"
And Carlos changes the name to "Pantry"
And Carlos taps "Save"
Then the area list shows "Pantry" instead of "Garage Pantry"
And all 4 staples now have houseArea "Pantry"

#### Scenario: Rename propagates to home view
Given Carlos renamed "Garage Pantry" to "Pantry"
When Carlos views the home screen
Then "Pantry (4)" appears where "Garage Pantry (4)" was

#### Scenario: Rename propagates to active trip items
Given Carlos has an active trip with 3 items in "Kitchen Cabinets"
When Carlos renames "Kitchen Cabinets" to "Kitchen"
Then the 3 trip items now show under "Kitchen"

#### Scenario: Prevent rename to existing name
Given Carlos has areas "Bathroom" and "Fridge"
When Carlos tries to rename "Fridge" to "Bathroom"
Then Carlos sees "Bathroom already exists"
And the rename is not saved

### Acceptance Criteria
- [ ] Area name editable from area detail screen
- [ ] Rename propagates to all staples with the old area name
- [ ] Rename propagates to all trip items with the old area name
- [ ] Rename to an existing area name is prevented
- [ ] Rename persists across app restart

### Outcome KPIs
- **Who**: Existing users personalizing their setup
- **Does what**: Renames at least 1 area to match their household vocabulary
- **By how much**: 30% of active users rename at least 1 area
- **Measured by**: Count of rename events
- **Baseline**: 0 (feature does not exist)

### Technical Notes
- Rename is a batch update: area list + all matching staples + all matching trip items
- Must handle concurrent trip: propagation includes in-flight trip data
- Consider atomic operation or rollback on failure

### Job Story Trace
- JS1 (Home Sweep Capture), JS3 (Staple Item Management)

---

## US-CHA-05: Delete a House Area

### Problem
Ana Lucia does not have a garage. "Garage Pantry" is meaningless to her and clutters her sweep with an empty room she will never use. She wants to remove it, but she is worried about what happens to items if she accidentally deletes a room that has staples.

### Who
- Ana Lucia Rivera | User with areas that do not match her home | Wants to remove irrelevant areas without losing data

### Solution
A delete action on each area that requires staple reassignment when the area has items, and shows a simple confirmation when empty.

### Domain Examples
#### 1: Delete Empty Area
Ana Lucia never used "Garage Pantry" (0 staples). She taps delete, confirms, and it disappears. Her area count drops from 5 to 4.

#### 2: Delete Area with Staples -- Reassign to Fridge
Carlos decides to merge Freezer into Fridge. Freezer has 2 staples (frozen peas, ice cream). He taps delete on Freezer, selects Fridge as the target, and confirms. Frozen peas and ice cream now belong to Fridge.

#### 3: Cannot Delete Last Area
Ana Lucia has trimmed her areas down to just "Kitchen." She tries to delete it but the app blocks her: "You need at least one area for your sweep."

### UAT Scenarios (BDD)

#### Scenario: Delete an empty area
Given Ana Lucia has "Garage Pantry" with 0 staples
When Ana Lucia taps delete on "Garage Pantry"
Then she sees "Delete Garage Pantry?"
And no reassignment picker is shown
When Ana Lucia confirms
Then "Garage Pantry" is removed from the area list
And the area count decreases by 1

#### Scenario: Delete area with staples requires reassignment
Given Carlos has 2 staples in "Freezer": frozen peas and ice cream
When Carlos taps delete on "Freezer"
Then Carlos sees "2 staples are assigned to Freezer"
And a list of remaining areas appears for reassignment
When Carlos selects "Fridge"
And Carlos taps "Delete and Move Staples"
Then "Freezer" is removed
And frozen peas and ice cream now have houseArea "Fridge"

#### Scenario: Delete area reassigns trip items too
Given Carlos has an active trip with 1 item in "Freezer"
And 2 staples in "Freezer"
When Carlos deletes "Freezer" and reassigns to "Fridge"
Then the trip item and both staples now belong to "Fridge"

#### Scenario: Cannot delete last area
Given Ana Lucia has only 1 area remaining: "Kitchen"
When Ana Lucia tries to delete "Kitchen"
Then she sees "You need at least one area for your sweep"
And the delete action is blocked

#### Scenario: Delete area with potential duplicate after reassignment
Given Carlos has "Whole milk" as a staple in "Fridge"
And Carlos has "Whole milk" as a staple in "Freezer"
When Carlos deletes "Freezer" and reassigns to "Fridge"
Then Carlos sees a warning: "Whole milk already exists in Fridge"
And Carlos must resolve the conflict before deletion proceeds

### Acceptance Criteria
- [ ] Empty areas can be deleted with simple confirmation
- [ ] Areas with staples require reassignment target selection
- [ ] Staples and trip items are moved to the target area
- [ ] Cannot delete the last remaining area
- [ ] Duplicate detection when reassignment would create a same-name item in the target area
- [ ] Delete persists across app restart

### Outcome KPIs
- **Who**: Users cleaning up irrelevant areas
- **Does what**: Removes at least 1 unused default area
- **By how much**: 40% of active users remove at least 1 area
- **Measured by**: Count of delete events
- **Baseline**: 0 (feature does not exist)

### Technical Notes
- Delete with reassignment is a multi-step operation: move staples, move trip items, remove area
- Must handle duplicate item names in the target area (same item name + same area = conflict)
- Consider what happens if reassignment target is also deleted in the same session (edge case)

### Job Story Trace
- JS1 (Home Sweep Capture), JS3 (Staple Item Management)

---

## US-CHA-06: Reorder House Areas

### Problem
Carlos Rivera sweeps his house in a specific physical path: bathroom first (upstairs), then laundry room (hallway), then pantry (garage), then kitchen, then fridge. But the app shows areas in a different order. He has to scroll up and down to match his walking path, which breaks his flow.

### Who
- Carlos Rivera | User who sweeps in a specific physical path | Wants the app order to match his walking order

### Solution
Drag-and-drop reordering of areas in the settings screen. The new order is used everywhere: home view display, sweep progression, and area picker.

### Domain Examples
#### 1: Reorder to Match Walking Path
Carlos drags "Laundry Room" from position 6 to position 2 (between Bathroom and Pantry). Now his sweep follows his actual walking path.

#### 2: Move Fridge to End
Ana Lucia always checks the fridge last. She drags "Fridge" to the bottom of the list.

#### 3: Order Persists After Restart
Carlos reorders his areas, closes the app, and reopens it the next day. The areas are still in his custom order.

### UAT Scenarios (BDD)

#### Scenario: Reorder areas by dragging
Given Carlos has areas: Bathroom, Garage Pantry, Kitchen Cabinets, Fridge, Freezer, Laundry Room
When Carlos drags "Laundry Room" from position 6 to position 2
Then the area order becomes: Bathroom, Laundry Room, Garage Pantry, Kitchen Cabinets, Fridge, Freezer

#### Scenario: Reorder affects home view
Given Carlos reordered areas to: Bathroom, Laundry Room, Pantry, Kitchen Cabinets, Fridge
When Carlos views the home screen
Then area sections appear in that exact order

#### Scenario: Reorder affects sweep progress suggestion
Given Carlos reordered areas to: Bathroom, Laundry Room, Pantry, Kitchen Cabinets, Fridge
When Carlos completes "Bathroom"
Then the next suggested area is "Laundry Room" (position 2)

#### Scenario: Reorder persists after restart
Given Carlos has reordered his areas
When Carlos closes and reopens the app
Then areas appear in the same custom order

### Acceptance Criteria
- [ ] Areas can be reordered via drag-and-drop in settings
- [ ] New order immediately reflected in home view
- [ ] New order used by sweep progress for "next area" suggestion
- [ ] New order persists across app restart
- [ ] Area picker in MetadataBottomSheet uses the new order

### Outcome KPIs
- **Who**: Users who sweep in a specific path
- **Does what**: Reorders areas to match physical walking path
- **By how much**: 50% of users who customize areas also reorder them
- **Measured by**: Count of reorder events
- **Baseline**: 0 (feature does not exist)

### Technical Notes
- Area order = array index in AreaStorage
- Drag-and-drop requires a suitable React Native library or gesture handler
- Order change triggers re-render of HomeView

### Job Story Trace
- JS1 (Home Sweep Capture)

---

## US-CHA-07: Area Name Validation

### Problem
Carlos Rivera accidentally types a space and saves a blank area. Or he types "Bathroom" again without realizing it already exists. Or Ana Lucia names an area with a very long string that breaks the layout. Without validation, bad data enters the system and causes confusing behavior.

### Who
- Any user | Making mistakes during area creation or editing | Wants the app to prevent obviously bad input

### Solution
Validation rules on area names: non-empty, unique (case-insensitive), max 40 characters. Clear inline error messages guide the user to fix the input.

### Domain Examples
#### 1: Duplicate Name Blocked
Carlos types "Bathroom" on the add area screen. The app shows "Bathroom already exists" and the save button stays disabled.

#### 2: Empty Name Blocked
Ana Lucia accidentally submits a blank area name. The app shows "Area name is required" and does not save.

#### 3: Long Name Truncated
Miguel starts typing "The Big Room Where We Keep All The Stuff From Costco" but the input stops accepting characters at 40. A counter shows "40/40."

### UAT Scenarios (BDD)

#### Scenario: Prevent duplicate area name
Given Carlos has an area named "Bathroom"
When Carlos tries to add a new area named "Bathroom"
Then Carlos sees "Bathroom already exists"
And the save button is disabled

#### Scenario: Prevent duplicate name case-insensitive
Given Carlos has an area named "Bathroom"
When Carlos tries to add "bathroom" (lowercase)
Then Carlos sees "Bathroom already exists"

#### Scenario: Prevent empty area name
Given Carlos is on the add area screen
When Carlos leaves the name field blank and tries to save
Then Carlos sees "Area name is required"
And the save button is disabled

#### Scenario: Prevent whitespace-only name
Given Carlos types "   " (only spaces) as the area name
Then Carlos sees "Area name is required"
And the save button is disabled

#### Scenario: Enforce max length
Given Carlos is typing an area name
When the name reaches 40 characters
Then no more characters can be entered
And a character count shows "40/40"

### Acceptance Criteria
- [ ] Area name must be non-empty (after trimming whitespace)
- [ ] Area name must be unique (case-insensitive comparison)
- [ ] Area name max length is 40 characters
- [ ] Inline error messages shown for each violation
- [ ] Save button disabled when validation fails
- [ ] Validation applies to both add and rename operations

### Outcome KPIs
- **Who**: All users
- **Does what**: Never creates an invalid area
- **By how much**: Zero invalid areas in storage (empty, duplicate, or over-length)
- **Measured by**: Count of validation-blocked submissions
- **Baseline**: N/A (no validation exists because the feature is new)

### Technical Notes
- Validation is a pure function: `validateAreaName(name: string, existingNames: string[]) => ValidationResult`
- Validation runs on every keystroke (for real-time feedback)
- Same validation logic reused for add and rename

### Job Story Trace
- JS3 (Staple Item Management)

---

## Dependencies

```
US-CHA-01 (View Area List)
    |
    +---> US-CHA-02 (Add Area)
    |         |
    |         +---> US-CHA-07 (Validation)
    |
    +---> US-CHA-03 (Dynamic Consumption) --- riskiest, start here
    |         |
    |         +---> US-CHA-04 (Rename)
    |         |
    |         +---> US-CHA-05 (Delete)
    |         |
    |         +---> US-CHA-06 (Reorder)
    |
    (US-CHA-01 is foundational; all others depend on it)
```
