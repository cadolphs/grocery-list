<!-- markdownlint-disable MD024 -->
# User Stories: Add Item Metadata Flow

**Feature ID**: add-item-flow
**Date**: 2026-03-19

---

## Walking Skeleton

---

## US-AIF-01: Add New Item via Bottom Sheet

### Problem
Carlos Rivera is a household grocery planner who adds new items during his bi-weekly sweep and from the whiteboard. He finds it frustrating that every new item gets hardcoded defaults (Kitchen Cabinets, Unknown section, one-off) because the QuickAdd input has no way to specify metadata. He ends up with a trip list full of mis-categorized items that show up in the wrong house area and wrong store section.

### Who
- Carlos Rivera | Household grocery planner | Wants new items to be correctly classified from the start

### Solution
When Carlos types a new item name that does not match any staple, show an "Add as new item" prompt. Tapping it opens a bottom sheet where Carlos can set item type (staple/one-off), house area, store section, and optional aisle number. The item is then added with the correct metadata.

### Domain Examples

#### 1: Add a New Staple to the Fridge
Carlos types "Oat milk" during his sweep of the Fridge area. No staple matches. He taps "Add as new item", selects Staple, Fridge, Dairy, Aisle 3. Oat milk is saved to the staple library and added to the current trip in the Fridge area.

#### 2: Add a One-Off Item for a Special Occasion
Carlos types "Birthday candles" while entering whiteboard items. He taps "Add as new item", selects One-off, Kitchen Cabinets, Baking, Aisle 12. Birthday candles appear on this trip only and are not saved to the staple library.

#### 3: Add a Staple Without an Aisle Number
Carlos types "Rotisserie chicken" during his Fridge sweep. He taps "Add as new item", selects Staple, Fridge, Deli, leaves aisle blank. Rotisserie chicken is saved to the staple library with no aisle number and appears in the Deli section (after numbered aisles) in store view.

### UAT Scenarios (BDD)

#### Scenario: New item prompt when no staple matches
Given Carlos is on the home view with an active trip
And the staple library does not contain "Oat milk"
When Carlos types "Oat milk" in the QuickAdd input
Then a suggestion row shows "Add 'Oat milk' as new item..."

#### Scenario: Bottom sheet opens with item name pre-filled
Given Carlos has typed "Oat milk" and sees the new item prompt
When Carlos taps "Add 'Oat milk' as new item..."
Then a bottom sheet opens with title "Add 'Oat milk'"
And the bottom sheet shows fields for type, area, section, and aisle

#### Scenario: Staple saved to library and added to trip
Given Carlos has filled the bottom sheet with name "Oat milk", type Staple, area Fridge, section "Dairy", aisle 3
When Carlos taps "Add Item"
Then "Oat milk" is saved to the staple library with area Fridge, section Dairy, aisle 3
And "Oat milk" is added to the current trip in the Fridge area
And the bottom sheet dismisses and the QuickAdd input clears

#### Scenario: One-off added to trip only
Given Carlos has filled the bottom sheet with name "Birthday candles", type One-off, area Kitchen Cabinets, section "Baking", aisle 12
When Carlos taps "Add Item"
Then "Birthday candles" is added to the current trip
And "Birthday candles" is NOT in the staple library

#### Scenario: Staple without aisle number is valid
Given Carlos has filled the bottom sheet with name "Rotisserie chicken", type Staple, area Fridge, section "Deli", aisle blank
When Carlos taps "Add Item"
Then "Rotisserie chicken" is saved to the staple library with no aisle number

### Acceptance Criteria
- [ ] When QuickAdd input matches no staple, an "Add as new item" prompt appears
- [ ] Tapping the prompt opens a bottom sheet with type, area, section, and aisle fields
- [ ] Staple items are saved to the staple library AND added to the trip
- [ ] One-off items are added to the trip only, not the staple library
- [ ] Aisle number is optional (nullable)
- [ ] Bottom sheet dismisses and QuickAdd clears after successful add

### Outcome KPIs
- **Who**: Carlos (household grocery planner)
- **Does what**: Adds new items with complete metadata (type + area + section)
- **By how much**: 80% of new items have full metadata (MK1)
- **Measured by**: Count of items with non-default metadata / total new items
- **Baseline**: 0% (current QuickAdd hardcodes all defaults)

### Technical Notes
- Bottom sheet component (React Native modal or bottom sheet library)
- Calls `addStaple` for staple type, then `addItem` for trip; calls only `addItem` for one-off
- House areas are the 5 fixed values from the `HouseArea` type
- Store section is free-text string
- Aisle number is `number | null`
- Offline-first: no network calls

### Job Story Trace
- **JS1 (Home Sweep Capture)**: Enables capturing new items discovered during sweep with correct metadata
- **JS3 (Staple Item Management)**: Enables marking new items as staples with store location

---

## US-AIF-02: Context-Aware Smart Defaults

### Problem
Carlos Rivera is a household grocery planner doing a room-by-room sweep. He finds it tedious that when adding a new item in the Fridge area, he has to manually select "Fridge" in the area picker even though he is already looking at the Fridge section. During sweep, most items are staples, but he has to manually select "Staple" every time. This repetitive selection slows him down and breaks his sweep flow.

### Who
- Carlos Rivera | Household grocery planner mid-sweep | Wants metadata pre-filled based on current context

### Solution
Pre-fill the bottom sheet with context-aware defaults. During sweep: type defaults to Staple, area defaults to the currently active area. During whiteboard entry: type defaults to One-off, area has no default (must select).

### Domain Examples

#### 1: Sweep Mode Defaults
Carlos is sweeping the Fridge area and types "Almond butter". The bottom sheet opens with type=Staple and area=Fridge pre-selected. Carlos only needs to type the section and optional aisle.

#### 2: Whiteboard Mode Defaults
Carlos has finished sweeping all areas and is entering whiteboard items. He types "Dish soap". The bottom sheet opens with type=One-off and area blank. Carlos must select the area (Bathroom? Kitchen Cabinets?).

#### 3: Sweep Mode in Garage Pantry
Carlos is sweeping the Garage Pantry and types "Dog treats". The bottom sheet opens with type=Staple and area=Garage Pantry pre-selected.

### UAT Scenarios (BDD)

#### Scenario: Sweep mode pre-fills staple and active area
Given Carlos is viewing the Fridge area during a sweep (not all areas complete)
When Carlos opens the metadata bottom sheet for "Almond butter"
Then the type toggle defaults to "Staple"
And the area picker shows "Fridge" pre-selected

#### Scenario: Whiteboard mode defaults to one-off with no area
Given all sweep areas are complete (whiteboard mode active)
When Carlos opens the metadata bottom sheet for "Dish soap"
Then the type toggle defaults to "One-off"
And the area picker shows no pre-selection

#### Scenario: Active area changes when Carlos switches rooms
Given Carlos was viewing Fridge but now selects Garage Pantry
When Carlos opens the metadata bottom sheet for "Dog treats"
Then the area picker shows "Garage Pantry" pre-selected

#### Scenario: Carlos can override any default
Given Carlos is viewing the Fridge area during a sweep
And the bottom sheet defaults to type Staple, area Fridge
When Carlos changes type to "One-off" and area to "Freezer"
Then the overridden values are used when adding the item

### Acceptance Criteria
- [ ] During sweep, type defaults to Staple and area defaults to the active area
- [ ] During whiteboard entry, type defaults to One-off and area has no default
- [ ] All defaults can be overridden by the user
- [ ] Active area detection uses the same state as AreaSection selection in HomeView

### Outcome KPIs
- **Who**: Carlos (household grocery planner during sweep)
- **Does what**: Completes metadata entry in under 5 seconds (because defaults pre-filled)
- **By how much**: Average metadata entry time under 5 seconds during sweep (MK2)
- **Measured by**: Time from bottom sheet open to "Add Item" tap
- **Baseline**: N/A (no metadata entry exists yet)

### Technical Notes
- Reads `activeArea` state from HomeView
- Reads `sweepProgress.allAreasComplete` to determine sweep vs whiteboard mode
- No new domain logic needed -- only UI default selection

### Job Story Trace
- **JS1 (Home Sweep Capture)**: "Capture items without breaking my flow" -- smart defaults reduce decisions

---

## US-AIF-03: Skip Metadata Shortcut

### Problem
Carlos Rivera is mid-sweep and discovers an item he wants to add quickly but does not know its store section or does not care right now. He finds it frustrating that the metadata bottom sheet requires him to think about classification when he just wants to capture the item name and move on. If adding metadata is mandatory, he might skip the bottom sheet entirely and lose the item.

### Who
- Carlos Rivera | Household grocery planner in a rush | Wants to capture items without mandatory classification

### Solution
Add a "Skip, add with defaults" button in the bottom sheet. This adds the item as one-off with the current area (or Kitchen Cabinets if no active area), section "Uncategorized", and no aisle number.

### Domain Examples

#### 1: Skip During Sweep
Carlos is sweeping the Fridge and types "Sriracha". He opens the bottom sheet but does not know which store section Sriracha is in. He taps "Skip, add with defaults". Sriracha is added as one-off in Fridge, section Uncategorized.

#### 2: Skip During Whiteboard Entry
Carlos is entering whiteboard items and types "Fancy mustard". He does not want to think about area right now. He taps "Skip, add with defaults". Fancy mustard is added as one-off in Kitchen Cabinets (fallback), section Uncategorized.

#### 3: Skip, Then Edit Later (future capability)
Carlos skipped metadata for Sriracha. During the next sweep, he notices Sriracha in Uncategorized and can promote it to a staple with proper metadata. (Note: editing is out of scope for this feature but motivates the skip design.)

### UAT Scenarios (BDD)

#### Scenario: Skip with active area during sweep
Given Carlos is viewing the Fridge area during a sweep
And Carlos has opened the metadata bottom sheet for "Sriracha"
When Carlos taps "Skip, add with defaults"
Then "Sriracha" is added as one-off in the Fridge area
And the section is "Uncategorized" with no aisle number
And the bottom sheet dismisses

#### Scenario: Skip without active area during whiteboard entry
Given Carlos is in whiteboard entry mode with no active area
And Carlos has opened the metadata bottom sheet for "Fancy mustard"
When Carlos taps "Skip, add with defaults"
Then "Fancy mustard" is added as one-off in Kitchen Cabinets
And the section is "Uncategorized" with no aisle number

#### Scenario: Skipped items are not saved to staple library
Given Carlos has opened the metadata bottom sheet for "Sriracha"
When Carlos taps "Skip, add with defaults"
Then "Sriracha" is NOT saved to the staple library

### Acceptance Criteria
- [ ] "Skip, add with defaults" button visible in the bottom sheet
- [ ] Skip uses current active area or Kitchen Cabinets as fallback
- [ ] Skip always creates a one-off item (never a staple)
- [ ] Skip sets section to "Uncategorized" and aisle to null
- [ ] Skipped items are not saved to the staple library

### Outcome KPIs
- **Who**: Carlos (household grocery planner in a rush)
- **Does what**: Captures items without metadata in under 3 seconds
- **By how much**: Skip path takes under 3 seconds (guardrail: K4 add time under 10s preserved)
- **Measured by**: Time from bottom sheet open to "Skip" tap
- **Baseline**: N/A

### Technical Notes
- Calls `addItem` with `itemType: 'one-off'`, `source: 'quick-add'`
- Does NOT call `addStaple`
- Area fallback: `activeArea ?? 'Kitchen Cabinets'`
- Section: hardcoded `'Uncategorized'`

### Job Story Trace
- **JS1 (Home Sweep Capture)**: "Capture items without breaking my flow" -- skip preserves speed when classification is unknown

---

## US-AIF-04: Section Auto-Suggest

### Problem
Carlos Rivera is adding a new staple and needs to enter the store section. He finds it tedious to type "Dairy" from scratch every time when he has already created 12 items in the Dairy section. He also worries about typos ("Dary" vs "Dairy") creating inconsistent section names that fragment his store view.

### Who
- Carlos Rivera | Household grocery planner building staple library | Wants consistent section names without retyping

### Solution
When Carlos types in the section field, show auto-suggestions from previously used section names (derived from existing staples). Tapping a suggestion fills the field. Typing a new name creates a new section.

### Domain Examples

#### 1: Match Existing Section
Carlos types "Da" in the section field. "Dairy" appears as a suggestion (he has 12 items in Dairy). He taps it and the field fills with "Dairy".

#### 2: No Match, New Section
Carlos types "International Foods" in the section field. No suggestions match. He submits with "International Foods" as a new section name.

#### 3: Multiple Partial Matches
Carlos types "D" in the section field. Both "Dairy" and "Deli" appear as suggestions. He taps "Deli".

### UAT Scenarios (BDD)

#### Scenario: Previously used section appears as suggestion
Given Carlos has staples in sections "Dairy", "Produce", and "Deli"
And Carlos has opened the metadata bottom sheet
When Carlos types "Da" in the section field
Then "Dairy" appears as a section suggestion

#### Scenario: Non-matching sections are filtered out
Given Carlos has staples in sections "Dairy", "Produce", and "Deli"
And Carlos has opened the metadata bottom sheet
When Carlos types "Da" in the section field
Then "Deli" does not appear as a suggestion
And "Produce" does not appear as a suggestion

#### Scenario: New section name accepted
Given Carlos has no staples in section "International Foods"
And Carlos has opened the metadata bottom sheet
When Carlos types "International Foods" and taps "Add Item"
Then the item is created with section "International Foods"

#### Scenario: Tapping suggestion fills the field
Given "Dairy" appears as a section suggestion
When Carlos taps "Dairy"
Then the section field is filled with "Dairy"
And the suggestion list dismisses

### Acceptance Criteria
- [ ] Section field shows auto-suggestions from previously used section names
- [ ] Suggestions filter as Carlos types (prefix match)
- [ ] Tapping a suggestion fills the section field
- [ ] New section names are accepted (free-text, not restricted to existing)
- [ ] Suggestions come from distinct sections in the staple library

### Outcome KPIs
- **Who**: Carlos (household grocery planner)
- **Does what**: Enters section names with fewer keystrokes and zero typos
- **By how much**: 90% of section entries use a suggestion (for sections that already exist)
- **Measured by**: Count of section entries from suggestion tap / total section entries for existing sections
- **Baseline**: N/A (no section entry exists)

### Technical Notes
- Section suggestions derived from `StapleLibrary.listAll()` -> distinct `storeLocation.section` values
- Prefix matching (case-insensitive)
- No new domain types needed -- uses existing `StapleItem.storeLocation.section`

### Job Story Trace
- **JS3 (Staple Item Management)**: "Mark it as a staple with its store location" -- auto-suggest makes store location entry faster and more consistent

---

## US-AIF-05: Duplicate Staple Detection

### Problem
Carlos Rivera is adding "Whole milk" as a new staple in the Fridge area, but he already has "Whole milk" in the Fridge staple library. Without a warning, he would create a duplicate that clutters his list and causes confusion during the sweep ("why do I have two milks?").

### Who
- Carlos Rivera | Household grocery planner with existing staple library | Wants to avoid duplicate staples

### Solution
When Carlos attempts to add a staple with a name and area that already exist in the staple library, show a warning with options to "Add to trip instead" (use existing staple metadata) or "Cancel" (go back to the form).

### Domain Examples

#### 1: Exact Duplicate Caught
Carlos types "Whole milk" and selects area Fridge. The staple library already has "Whole milk" in Fridge (Dairy, Aisle 3). The bottom sheet shows: "Whole milk already exists in Fridge as a staple (Dairy / Aisle 3)."

#### 2: Same Name, Different Area Is Allowed
Carlos types "Trash bags" and selects area Bathroom. The staple library has "Trash bags" in Kitchen Cabinets but not in Bathroom. No duplicate warning -- Carlos can have trash bags in multiple areas.

#### 3: Add to Trip from Duplicate Warning
Carlos sees the duplicate warning for Whole milk. He taps "Add to trip instead". Whole milk is added to the trip with the existing staple metadata.

### UAT Scenarios (BDD)

#### Scenario: Duplicate detected on same name and area
Given "Whole milk" exists as a staple in the Fridge area with section Dairy, aisle 3
And Carlos has opened the metadata bottom sheet for "Whole milk" with area Fridge
When Carlos taps "Add Item"
Then the bottom sheet shows "Whole milk already exists in Fridge"
And displays the existing metadata "Dairy / Aisle 3"

#### Scenario: Same name in different area is not a duplicate
Given "Trash bags" exists as a staple in Kitchen Cabinets
And Carlos has opened the metadata bottom sheet for "Trash bags" with area Bathroom
When Carlos taps "Add Item"
Then "Trash bags" is saved as a new staple in Bathroom
And no duplicate warning is shown

#### Scenario: Add existing staple to trip from duplicate warning
Given the duplicate warning is showing for "Whole milk" in Fridge
When Carlos taps "Add to trip instead"
Then "Whole milk" is added to the trip with area Fridge, section Dairy, aisle 3
And the bottom sheet dismisses

#### Scenario: Cancel from duplicate returns to form
Given the duplicate warning is showing for "Whole milk" in Fridge
When Carlos taps "Cancel"
Then the bottom sheet returns to the metadata form
And Carlos can change the area or name

### Acceptance Criteria
- [ ] Duplicate check triggers when name + area match an existing staple
- [ ] Duplicate warning shows existing staple metadata (section, aisle)
- [ ] "Add to trip instead" adds the existing staple to the trip
- [ ] "Cancel" returns to the metadata form
- [ ] Same name in different area is not treated as duplicate

### Outcome KPIs
- **Who**: Carlos (household grocery planner)
- **Does what**: Avoids creating duplicate staples
- **By how much**: Zero duplicate staples created per month (MK3)
- **Measured by**: Count of duplicate name+area pairs in staple library
- **Baseline**: N/A (no duplicate detection exists)

### Technical Notes
- Uses existing `isDuplicate` logic in `staple-library.ts` (already checks name + area)
- Duplicate check happens client-side before calling `addStaple`
- "Add to trip instead" calls `addItem` with existing staple's metadata

### Job Story Trace
- **JS3 (Staple Item Management)**: "Never have to enter it again" -- duplicate detection prevents re-entry of already-known staples
