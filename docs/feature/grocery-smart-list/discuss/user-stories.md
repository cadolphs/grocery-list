<!-- markdownlint-disable MD024 -->
# User Stories: Grocery Smart List

**Feature ID**: grocery-smart-list
**Date**: 2026-03-17

---

## Walking Skeleton Stories

---

## US-01: Add a Staple Item

### Problem
Carlos Rivera is a household grocery planner who maintains a bi-weekly shopping system. He finds it tedious to re-enter the same items (milk, eggs, toilet paper) every trip because his current tool (Notion) has no concept of recurring items. He "just suffers" through rebuilding the list from memory.

### Who
- Carlos Rivera | Household grocery planner | Wants to define items once and have them auto-populate

### Solution
Allow creating an item marked as "staple" with persistent metadata: name, house area, store section, and optional aisle number.

### Domain Examples
#### 1: Create a Dairy Staple
Carlos adds "Whole milk" as a staple in the Fridge area, assigned to Dairy section, Aisle 3. Milk will appear pre-loaded on every future trip.

#### 2: Create a Non-Aisle Staple
Carlos adds "Rotisserie chicken" as a staple in the Fridge area, assigned to Deli section, no aisle number. It appears in the Deli section in store view.

#### 3: Create a One-Off Item
Carlos adds "Birthday candles" as a one-off in Kitchen Cabinets, assigned to Baking section, Aisle 12. It appears only on this trip.

### UAT Scenarios (BDD)

#### Scenario: Add staple with full metadata
Given Carlos is on the item creation screen
When Carlos enters name "Whole milk," area "Fridge," section "Dairy," aisle "3," type "Staple"
Then whole milk is saved to the staple library
And whole milk appears in the Fridge area in home view
And whole milk appears in Aisle 3: Dairy in store view

#### Scenario: Add one-off item
Given Carlos is on the item creation screen
When Carlos enters name "Birthday candles," area "Kitchen Cabinets," section "Baking," aisle "12," type "One-off"
Then birthday candles is saved to the current trip only
And birthday candles does not appear in the staple library

#### Scenario: Add staple without aisle number
Given Carlos is creating a Deli item
When Carlos enters name "Rotisserie chicken," area "Fridge," section "Deli," aisle blank, type "Staple"
Then rotisserie chicken is saved with no aisle number
And it appears under the "Deli" section (after numbered aisles) in store view

#### Scenario: Prevent duplicate staple
Given "Whole milk" already exists as a staple in the Fridge area
When Carlos tries to add another "Whole milk" to Fridge
Then the app shows "Whole milk already exists in Fridge"
And no duplicate is created

### Acceptance Criteria
- [ ] Items can be created with name, house area, section, optional aisle, and type (staple/one-off)
- [ ] Staple items persist in the staple library across trips
- [ ] One-off items exist only on the current trip
- [ ] Duplicate item names within the same house area are prevented
- [ ] Items without aisle numbers are valid

### Outcome KPIs
- **Who**: Carlos (household grocery planner)
- **Does what**: Builds a staple library of 20+ items
- **By how much**: 20 staples created within the first week of use
- **Measured by**: Count of items in staple library
- **Baseline**: 0 items (new app)

### Technical Notes
- Item model: { name, houseArea, storeSection, aisleNumber?, type: 'staple' | 'one-off' }
- Staple library persisted to local storage (offline-first)
- Aisle number is optional (nullable integer)

### Job Story Trace
- JS3 (Staple Item Management)

---

## US-02: See Pre-Loaded Staples by Area

### Problem
Carlos Rivera spends 20 minutes every trip rebuilding his shopping list from scratch. He dreads the prep because it means manually remembering and typing every recurring item. The list should be mostly ready before he even starts.

### Who
- Carlos Rivera | Bi-weekly shopper | Wants the list pre-populated so he only handles exceptions

### Solution
When starting a new sweep, automatically populate the list with all staple items from the library, organized by house area.

### Domain Examples
#### 1: Staples Pre-Loaded Across All Areas
Carlos opens the app to start a sweep. He sees Bathroom (3 staples: toilet paper, hand soap, shampoo), Fridge (4 staples: milk, butter, cheese, yogurt), etc. Total: 21 staples pre-loaded. He did not type any of them.

#### 2: Empty Area Still Shown
Carlos has no staples assigned to Freezer yet. Freezer still appears in the area list but shows "0 staples due."

#### 3: New Staple Appears After Being Added
Carlos added "oat milk" as a staple last trip. On the next sweep, oat milk appears pre-loaded in the Fridge area automatically.

### UAT Scenarios (BDD)

#### Scenario: Staples pre-loaded on sweep start
Given Carlos has 21 staple items across 5 house areas
When Carlos opens the app to start a new sweep
Then each house area shows its staple items pre-loaded
And the total reads "21 staples pre-loaded"

#### Scenario: Newly added staple appears on next sweep
Given Carlos added "Oat milk" as a staple during the previous trip
When Carlos starts a new sweep
Then oat milk appears pre-loaded in the Fridge area

#### Scenario: Area with no staples shown
Given Carlos has no staples assigned to Freezer
When Carlos views the sweep start screen
Then Freezer appears with "0 staples due"

### Acceptance Criteria
- [ ] All staples from the library appear pre-loaded when starting a new sweep
- [ ] Staples are grouped by their assigned house area
- [ ] Each area shows its staple count
- [ ] Areas with zero staples are still visible
- [ ] Pre-loaded staples are marked as "needed this trip" by default

### Outcome KPIs
- **Who**: Carlos
- **Does what**: Starts sweep with list already 80%+ populated
- **By how much**: 80% of trip items are pre-loaded staples (vs 0% today)
- **Measured by**: Pre-loaded staple count / total trip items
- **Baseline**: 0% (manual list building from scratch)

### Technical Notes
- Query staple library on sweep start, group by house area
- Sweep start creates a new trip record with pre-loaded items

### Job Story Trace
- JS1 (Home Sweep Capture), JS3 (Staple Item Management)

---

## US-03: Quick-Add Item

### Problem
Carlos Rivera needs to add items he spots during his walk-through or reads off the whiteboard. In Notion, adding a single item is painful because the database structure makes quick entry cumbersome. This friction drives him to use the physical whiteboard instead, which then requires consolidation.

### Who
- Carlos Rivera | Mid-sweep or consolidating whiteboard | Wants to add an item in seconds, not minutes

### Solution
A quick-add input that accepts an item name, with an option to assign house area, section, aisle, and type.

### Domain Examples
#### 1: Add Item During Sweep
Carlos is in the garage pantry and notices they are low on canned tomatoes. He types "canned tom," sees no suggestion (first time), adds it as a staple in Garage Pantry, Canned Goods, Aisle 5.

#### 2: Add Whiteboard Item
Carlos reads "Greek yogurt" off the whiteboard. He types "greek yo," and since Greek yogurt is already a staple, the suggestion shows "Greek yogurt - Dairy / Aisle 3." He taps to add it.

#### 3: Add Unknown One-Off
Elena wrote "Deli turkey" on the whiteboard. Carlos types it, no suggestion appears, adds it as a one-off in the Deli section with no aisle.

### UAT Scenarios (BDD)

#### Scenario: Add new item with metadata
Given Carlos is in the Garage Pantry area during a sweep
When Carlos types "Canned tomatoes" in the quick-add field
And selects type "Staple," section "Canned Goods," aisle "5"
Then canned tomatoes appears in the Garage Pantry area
And it is saved to the staple library

#### Scenario: Quick-add from whiteboard with suggestion
Given Carlos is on the whiteboard consolidation screen
And "Greek yogurt" exists in the staple library (Dairy, Aisle 3)
When Carlos types "greek yo"
Then the suggestion "Greek yogurt - Dairy / Aisle 3" appears
When Carlos taps the suggestion
Then Greek yogurt is added to the current trip

#### Scenario: Quick-add unknown one-off
Given Carlos types "Deli turkey" with no matching staple
When Carlos selects "Add as one-off" and assigns section "Deli"
Then deli turkey is added to the current trip as a one-off
And it does not enter the staple library

### Acceptance Criteria
- [ ] Quick-add input accepts item name
- [ ] New items can be assigned house area, section, optional aisle, and type
- [ ] Adding a known staple to the trip does not create a duplicate library entry
- [ ] One-off items are trip-scoped only

### Outcome KPIs
- **Who**: Carlos
- **Does what**: Adds items in under 10 seconds each
- **By how much**: Average add time under 10 seconds (vs 30+ seconds in Notion)
- **Measured by**: Time from starting quick-add to item appearing on list
- **Baseline**: 30+ seconds per item in Notion

### Technical Notes
- Quick-add input with focus on speed
- Metadata assignment as secondary step (not blocking entry)
- Works offline

### Job Story Trace
- JS1 (Home Sweep Capture), JS2 (Whiteboard Consolidation)

---

## US-04: Toggle Between Home and Store Views

### Problem
Carlos Rivera needs to see his shopping list organized by house area when at home (for the sweep) and by store aisle when shopping. No existing tool supports this dual-view of the same data. Notion approximates it with multiple database views, but the friction of maintaining two views is high.

### Who
- Carlos Rivera | Transitioning from home prep to store shopping | Wants the same list reorganized instantly

### Solution
A manual toggle that switches between home view (items grouped by house area) and store view (items grouped by aisle/section).

### Domain Examples
#### 1: Switch to Store View at the Store
Carlos arrives at the store and taps "Store" toggle. His 22 items instantly reorganize from 5 house areas into 9 store sections ordered by aisle number.

#### 2: Switch Back to Home View
Carlos realizes he forgot to check the freezer. He taps "Home" toggle and sees items by house area again. His check-off state is preserved.

#### 3: Empty Aisles Excluded
Carlos has no items in Aisles 1, 2, 4, 6, 9, 10, 11. Store view shows only the 5 aisles and 4 sections that have items.

### UAT Scenarios (BDD)

#### Scenario: Switch to store view
Given Carlos has 22 items across 5 house areas with aisle metadata
When Carlos taps the "Store" toggle
Then items are grouped by aisle/section in store walk order
And numbered aisles appear in ascending order
And named sections (Deli, Produce) appear after aisles
And only sections with items are shown

#### Scenario: Switch back to home view
Given Carlos is in store view with 3 items checked off
When Carlos taps the "Home" toggle
Then items are grouped by house area
And the 3 check-offs are preserved

#### Scenario: Empty aisles excluded
Given Carlos has items in Aisles 3, 5, 7, 8, 12 and sections Deli, Produce, Bakery, Frozen
And no items in Aisles 1, 2, 4, 6, 9, 10, 11
When Carlos views the store layout
Then only 9 sections are shown (5 aisles + 4 sections)

### Acceptance Criteria
- [ ] Manual toggle between home view and store view
- [ ] Home view groups items by house area
- [ ] Store view groups items by aisle (ascending) then named sections
- [ ] Only non-empty sections shown in store view
- [ ] Check-off state preserved across view switches
- [ ] Toggle completes in under 200ms

### Outcome KPIs
- **Who**: Carlos
- **Does what**: Switches views with zero re-entry or reorganization
- **By how much**: View switch in under 1 second (vs 30+ seconds switching Notion views)
- **Measured by**: Time from toggle tap to fully rendered new view
- **Baseline**: 30+ seconds to switch between Notion database views

### Technical Notes
- Same data model, different groupBy (houseArea vs storeSection/aisleNumber)
- Must preserve all state (check-offs, items) across toggles
- Offline-capable

### Job Story Trace
- JS4 (Store Navigation)

---

## US-05: Check Off Items in Store

### Problem
Carlos Rivera checks off items as he puts them in the cart. With Notion, check-offs sometimes fail on the store's unreliable Wi-Fi, and reloading the list takes a long time. He loses check-off state and cannot trust the list.

### Who
- Carlos Rivera | In-store, standing in an aisle | Wants reliable check-off that never fails

### Solution
Tap-to-check-off that persists to local storage immediately, works fully offline, and survives app restart.

### Domain Examples
#### 1: Check Off in Dairy Aisle
Carlos is in Aisle 3 and puts milk in the cart. He taps milk -- it shows "IN CART" instantly. He has no Wi-Fi. The check-off is saved locally.

#### 2: App Restart Preserves State
Carlos accidentally closes the app after checking off 8 items. He reopens the app and all 8 items still show as checked.

#### 3: Uncheck by Mistake
Carlos accidentally checks off butter. He taps it again to uncheck. Butter returns to unchecked state.

### UAT Scenarios (BDD)

#### Scenario: Check off item offline
Given Carlos has no network connectivity in the store
And Carlos is viewing Aisle 3: Dairy with 4 items
When Carlos taps "Whole milk" to check it off
Then milk shows "IN CART" within 100ms
And the check-off is saved to local storage within 500ms

#### Scenario: Check-off survives app restart
Given Carlos has checked off 8 items across multiple sections
And Carlos accidentally closes the app
When Carlos reopens the app
Then all 8 items still show as checked
And the trip state is fully preserved

#### Scenario: Uncheck item
Given Carlos has checked off "Butter, unsalted"
When Carlos taps butter again
Then butter is unchecked
And the "IN CART" badge is removed

#### Scenario: Section progress updates on check-off
Given Carlos is in Aisle 3 with 4 items and 0 checked
When Carlos checks off 2 items
Then the section progress shows "2 of 4"

### Acceptance Criteria
- [ ] Tap to check off item, tap again to uncheck
- [ ] Check-off visual feedback within 100ms
- [ ] Check-off persisted to local storage within 500ms
- [ ] Full trip state survives app restart
- [ ] Works with zero network connectivity
- [ ] Section progress counter updates on check-off

### Outcome KPIs
- **Who**: Carlos
- **Does what**: Completes a full shopping trip with zero check-off failures
- **By how much**: 0 check-off failures (vs occasional failures with Notion)
- **Measured by**: Count of check-off state losses per trip
- **Baseline**: 1-3 state losses per trip with Notion on unreliable Wi-Fi

### Technical Notes
- Local storage write on every check-off (no network dependency)
- State includes: item ID, checked boolean, timestamp
- Must handle app backgrounding and cold restart

### Job Story Trace
- JS5 (In-Store Check-Off)

---

## US-06: Complete Trip with Carryover

### Problem
Carlos Rivera finishes shopping but some items were unavailable or intentionally skipped. Currently, he must manually track what was not bought and remember to add it next time. Items occasionally slip through the cracks between trips.

### Who
- Carlos Rivera | Finishing a shopping trip | Wants unbought items to automatically carry to the next trip

### Solution
A "Finish Trip" action that summarizes what was bought, carries over unbought items to the next trip, re-queues staples, and clears purchased one-offs.

### Domain Examples
#### 1: All Items Bought
Carlos checks off all 22 items. He taps "Finish Trip." Summary: 22/22 purchased. Staples re-queue for next trip. One-offs cleared.

#### 2: One-Off Not Bought Carries Over
Carlos could not find avocados (one-off). He finishes the trip. Avocados appears on the next trip's list automatically.

#### 3: Staple Not Bought Carries Over
Carlos skipped cheddar cheese (staple) because it was too expensive. It carries over to next trip as a pre-loaded staple.

### UAT Scenarios (BDD)

#### Scenario: Complete trip with all items bought
Given Carlos has checked all 22 items
When Carlos taps "Finish Trip"
Then the summary shows "22 of 22 items purchased"
And all purchased staples are re-queued for the next trip
And all purchased one-offs are cleared

#### Scenario: Unbought one-off carries over
Given Carlos did not buy "Avocados" (one-off)
When Carlos taps "Finish Trip"
Then avocados is listed under "Carrying to next trip"
And avocados appears on the next trip's list

#### Scenario: Unbought staple carries over
Given Carlos did not buy "Cheddar cheese" (staple)
When Carlos taps "Finish Trip"
Then cheddar cheese carries over to the next trip
And it appears as a pre-loaded staple on the next sweep

#### Scenario: No duplicate carryover
Given avocados was carried over from the previous trip
And Carlos did not buy avocados again this trip
When Carlos finishes the trip
Then avocados carries over once (no duplicate)

### Acceptance Criteria
- [ ] "Finish Trip" shows summary of bought and not-bought items
- [ ] Purchased staples re-queue for next trip automatically
- [ ] Purchased one-offs are cleared permanently
- [ ] Unbought items (staple or one-off) carry over to next trip
- [ ] No duplicate items created by carryover
- [ ] Staple library is never modified by trip completion

### Outcome KPIs
- **Who**: Carlos
- **Does what**: Zero items forgotten between trips
- **By how much**: 0 items lost between trips (vs occasional forgetting)
- **Measured by**: Count of items that should have carried over but did not
- **Baseline**: 1-2 forgotten items per month (manual tracking)

### Technical Notes
- Trip completion is a state transition, not item deletion
- Carryover creates new trip items referencing same staple/one-off definitions
- Must handle edge case: item carried over multiple consecutive trips

### Job Story Trace
- JS6 (Trip Completion)

---

## Release 1 Stories

---

## US-07: Skip Staple This Trip

### Problem
Carlos Rivera has staples that auto-populate every trip, but sometimes he does not need one this trip (shampoo still full, already has enough butter). He needs to remove it from this trip without deleting it from the staple library.

### Who
- Carlos Rivera | Reviewing pre-loaded staples during sweep | Wants to skip an item this time without losing it permanently

### Solution
Uncheck a pre-loaded staple during the sweep to remove it from the current trip. The staple remains in the library and re-appears on the next trip.

### Domain Examples
#### 1: Skip Shampoo
Carlos opens Bathroom and sees shampoo pre-loaded. The bottle is still half full. He unchecks shampoo. It disappears from this trip but reappears next time.

#### 2: Skip Then Re-Add
Carlos unchecks butter in Fridge, walks to the kitchen, realizes he does need it, and re-checks butter.

#### 3: Skip Multiple
Carlos unchecks 3 staples across different areas. The trip summary reflects the reduced count.

### UAT Scenarios (BDD)

#### Scenario: Skip staple without deleting from library
Given Carlos is reviewing Bathroom staples
And shampoo is pre-loaded as "needed this trip"
When Carlos unchecks shampoo
Then shampoo is removed from the current trip
And shampoo remains in the staple library
And the Bathroom item count decreases by 1

#### Scenario: Skipped staple reappears next trip
Given Carlos skipped shampoo on the current trip
When Carlos starts the next sweep
Then shampoo appears pre-loaded in Bathroom again

#### Scenario: Re-add a skipped staple
Given Carlos unchecked butter in Fridge
When Carlos taps butter to re-check it
Then butter is back on the current trip

### Acceptance Criteria
- [ ] Pre-loaded staples can be unchecked to skip this trip
- [ ] Unchecking does not remove the item from the staple library
- [ ] Skipped staples reappear on the next trip
- [ ] Skipped staples can be re-added by checking again

### Outcome KPIs
- **Who**: Carlos
- **Does what**: Customizes each trip without list maintenance overhead
- **By how much**: Skips 2-5 items per trip in under 5 seconds each
- **Measured by**: Number of skips per trip and time per skip
- **Baseline**: N/A (no skip capability exists)

### Technical Notes
- Skip is a per-trip state, not a library mutation
- Data model: trip_item.needed = true/false

### Job Story Trace
- JS3 (Staple Item Management)

---

## US-08: Navigate Areas During Sweep

### Problem
Carlos Rivera physically walks through his house room by room. His current app (Notion) shows a flat list with no sense of progression through the sweep. He wants the app to match his physical journey.

### Who
- Carlos Rivera | Walking room-to-room during sweep | Wants digital progress to mirror physical progress

### Solution
A room-by-room navigation flow that tracks completed areas and shows the next area to visit.

### Domain Examples
#### 1: Complete Bathroom, Move to Garage
Carlos finishes reviewing Bathroom (3 items). He taps "Done with Bathroom." The progress screen shows Bathroom as complete and highlights Garage Pantry as next.

#### 2: Progress Tracking
After completing 3 of 5 areas, Carlos sees "3 of 5 areas complete, 14 items captured."

#### 3: Out-of-Order Navigation
Carlos decides to check Freezer before Kitchen Cabinets. He taps Freezer directly from the progress screen.

### UAT Scenarios (BDD)

#### Scenario: Complete area and see progress
Given Carlos has reviewed all items in Bathroom (3 items captured)
When Carlos taps "Done with Bathroom"
Then the sweep progress shows Bathroom as complete with 3 items
And the next area (Garage Pantry) is highlighted
And progress reads "1 of 5 areas complete"

#### Scenario: Navigate out of order
Given Carlos is on the sweep progress screen
And Garage Pantry is suggested as next
When Carlos taps Freezer instead
Then the Freezer area detail opens
And no progress is lost

#### Scenario: All areas complete
Given Carlos has completed all 5 areas
When Carlos views the sweep progress screen
Then all areas show as complete
And the total item count is displayed
And the "Add from whiteboard" option appears

### Acceptance Criteria
- [ ] Each area can be marked as complete
- [ ] Progress shows completed vs remaining areas and item counts
- [ ] Areas can be visited in any order
- [ ] Next area is suggested but not enforced

### Outcome KPIs
- **Who**: Carlos
- **Does what**: Completes sweep with all areas visited
- **By how much**: 100% area coverage per sweep (vs occasionally forgetting a room)
- **Measured by**: Areas swept / total areas per trip
- **Baseline**: Not tracked (occasional room skip with current system)

### Technical Notes
- Area completion is per-sweep state
- No enforced ordering -- user may skip around

### Job Story Trace
- JS1 (Home Sweep Capture)

---

## US-09: Auto-Suggest from Staple Library

### Problem
Carlos Rivera reads items off the whiteboard and types them into the app. For staples he has added before, re-entering metadata (area, section, aisle) is wasted effort. He wants known items to auto-fill.

### Who
- Carlos Rivera | Entering whiteboard items or adding during sweep | Wants known items to be one-tap adds

### Solution
Type-ahead suggestions from the staple library that auto-fill all metadata when selected.

### Domain Examples
#### 1: Suggest Known Staple
Carlos types "gre" and sees "Greek yogurt - Dairy / Aisle 3." One tap adds it with full metadata.

#### 2: Partial Match Multiple
Carlos types "ch" and sees "Cheddar cheese - Dairy / Aisle 3" and "Chicken breast - Meat / Aisle 6." He picks the one he wants.

#### 3: No Match for New Item
Carlos types "birthday candles" and sees no suggestions. He adds it manually as a one-off.

### UAT Scenarios (BDD)

#### Scenario: Suggest known staple with metadata
Given "Greek yogurt" exists in the staple library (Fridge, Dairy, Aisle 3)
When Carlos types "gre" in the quick-add field
Then "Greek yogurt - Dairy / Aisle 3" appears as a suggestion

#### Scenario: One-tap add from suggestion
Given the suggestion "Greek yogurt - Dairy / Aisle 3" is showing
When Carlos taps the suggestion
Then Greek yogurt is added to the current trip with all metadata pre-filled

#### Scenario: No suggestion for unknown item
Given "Birthday candles" does not exist in the staple library
When Carlos types "birthday candles"
Then no suggestions appear
And Carlos can add it manually as a one-off

### Acceptance Criteria
- [ ] Type-ahead suggestions appear within 300ms of typing
- [ ] Suggestions show item name, section, and aisle
- [ ] Tapping a suggestion adds the item with all metadata pre-filled
- [ ] Suggestions are filtered by text match on item name
- [ ] No suggestions shown when no match exists

### Outcome KPIs
- **Who**: Carlos
- **Does what**: Adds known items with one tap instead of full metadata entry
- **By how much**: Known item add time under 5 seconds (vs 15+ seconds manual)
- **Measured by**: Time from typing to item added for suggestion-assisted adds
- **Baseline**: 15+ seconds to enter item with full metadata in Notion

### Technical Notes
- Search index on staple library item names
- Prefix matching, case-insensitive
- Suggestions limited to top 5 matches

### Job Story Trace
- JS2 (Whiteboard Consolidation), JS1 (Home Sweep Capture)

---

## US-10: Navigate Store Sections

### Problem
Carlos Rivera shops aisle by aisle in order. In the store view, he needs to move from one section to the next efficiently, skipping empty aisles and seeing what comes next.

### Who
- Carlos Rivera | In-store, moving between aisles | Wants seamless section-to-section flow

### Solution
Section-level navigation with progress tracking, next-section hints, and the ability to move on with unchecked items.

### Domain Examples
#### 1: Complete Section and Move On
Carlos checks all 4 items in Aisle 3: Dairy. The section shows "All items!" and a "Next: Aisle 5" button. He taps it.

#### 2: Partial Section
Carlos is in Produce with 4 items but skips avocados. He taps "Move on (1 not bought)" and proceeds to Bakery.

#### 3: Return to Section List
Carlos taps "Back" to see all sections with their completion status.

### UAT Scenarios (BDD)

#### Scenario: Navigate to next section after completing current
Given Carlos has checked all 4 items in Aisle 3: Dairy
When Carlos taps "Next: Aisle 5"
Then Aisle 5: Canned Goods opens with its 3 items
And Aisle 3 shows a completion badge in the section list

#### Scenario: Move on with unchecked items
Given Carlos is in Produce with 3 of 4 items checked
When Carlos taps "Move on (1 not bought)"
Then the next section opens
And Produce shows "3 of 4" in the section list

#### Scenario: View section list with progress
Given Carlos has completed 5 of 9 sections
When Carlos returns to the section list
Then completed sections show checkmarks
And incomplete sections show "X of Y" progress
And the next incomplete section is highlighted

### Acceptance Criteria
- [ ] "Next" button navigates to the next non-empty section in store order
- [ ] "Move on" allows leaving a section with unchecked items
- [ ] Section list shows completion status for all sections
- [ ] Completed sections show checkmarks

### Outcome KPIs
- **Who**: Carlos
- **Does what**: Navigates the store without backtracking
- **By how much**: Zero unnecessary backtracking per trip
- **Measured by**: Number of times user re-opens a completed section
- **Baseline**: Not tracked (occasional backtracking with paper/Notion list)

### Technical Notes
- Section order: numbered aisles ascending, then named sections
- "Next" skips fully completed sections

### Job Story Trace
- JS4 (Store Navigation), JS5 (In-Store Check-Off)

---

## US-11: Trip Summary

### Problem
Carlos Rivera finishes his sweep and wants to see a summary before heading to the store. He needs confidence that the list is complete and correct.

### Who
- Carlos Rivera | After completing sweep and whiteboard consolidation | Wants confirmation that prep is done

### Solution
A trip summary showing total items, breakdown by source (sweep vs whiteboard) and type (staple vs one-off), and prep time.

### Domain Examples
#### 1: Normal Trip Summary
After sweep (19 items) and whiteboard (3 items), Carlos sees: 22 total, 17 staples, 5 one-offs. Prep time: 4 min 12 sec.

#### 2: Trip with No Whiteboard Items
Carlos's wife did not add anything this week. Summary: 19 items from sweep, 0 from whiteboard.

#### 3: Trip with Many Skips
Carlos skipped 4 staples. Summary: 18 items (from 22 pre-loaded, 4 skipped, 0 added).

### UAT Scenarios (BDD)

#### Scenario: View trip summary
Given Carlos completed the sweep with 19 items and added 3 from whiteboard
When Carlos views the trip summary
Then it shows 22 total items
And 17 staples and 5 one-offs
And 19 from sweep and 3 from whiteboard

#### Scenario: Prep time displayed
Given Carlos started the sweep 4 minutes ago
When Carlos views the trip summary
Then the prep time shows approximately 4 minutes

#### Scenario: Summary reflects skipped staples
Given Carlos started with 21 pre-loaded staples and skipped 3
And added 2 one-offs during sweep
When Carlos views the trip summary
Then it shows 20 total items (18 staples + 2 one-offs)

### Acceptance Criteria
- [ ] Trip summary shows total item count
- [ ] Breakdown by source (sweep vs whiteboard)
- [ ] Breakdown by type (staple vs one-off)
- [ ] Prep time displayed
- [ ] "Switch to Store View" action available from summary

### Outcome KPIs
- **Who**: Carlos
- **Does what**: Completes prep in under 5 minutes
- **By how much**: Prep time under 5 min (from 20 min)
- **Measured by**: Prep time displayed in trip summary
- **Baseline**: 20 minutes (Notion consolidation)

### Technical Notes
- Prep time: timestamp from sweep start to summary view
- Summary is read-only, not editable

### Job Story Trace
- JS1 (Home Sweep Capture), JS2 (Whiteboard Consolidation)
