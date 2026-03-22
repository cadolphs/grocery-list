<!-- markdownlint-disable MD024 -->
# Acceptance Criteria: Grocery Smart List

**Feature ID**: grocery-smart-list
**Date**: 2026-03-17

---

## Walking Skeleton

### US-01: Add a Staple Item

#### Rule: Items have required metadata
- Given Carlos is on the item creation screen
- When Carlos enters name "Whole milk," area "Fridge," section "Dairy," aisle "3," type "Staple"
- Then whole milk is saved to the staple library with all metadata

#### Rule: Staples persist across trips
- Given Carlos added "Whole milk" as a staple
- When Carlos starts a new trip
- Then whole milk appears pre-loaded in the Fridge area

#### Rule: One-offs are trip-scoped
- Given Carlos adds "Birthday candles" as a one-off
- When Carlos completes the trip and starts a new one
- Then birthday candles does not appear (unless carried over as unbought)

#### Rule: No duplicate staples in same area
- Given "Whole milk" already exists as a staple in Fridge
- When Carlos tries to add "Whole milk" to Fridge again
- Then the app prevents the duplicate and shows a message

#### Rule: Aisle number is optional
- Given Carlos is adding "Rotisserie chicken" to Deli section
- When Carlos leaves aisle number blank
- Then the item is saved successfully under Deli (no aisle)

---

### US-02: See Pre-Loaded Staples by Area

#### Rule: All staples pre-load on sweep start
- Given Carlos has 21 staple items across 5 house areas
- When Carlos starts a new sweep
- Then all 21 staples appear in their respective areas

#### Rule: New staples appear on next sweep
- Given Carlos added "Oat milk" as a staple during the last trip
- When Carlos starts the next sweep
- Then oat milk appears pre-loaded in Fridge

#### Rule: Empty areas still visible
- Given Freezer has 0 staples assigned
- When Carlos views the sweep start screen
- Then Freezer is shown with "0 staples due"

---

### US-03: Quick-Add Item

#### Rule: Manual entry with metadata assignment
- Given Carlos types "Canned tomatoes" in quick-add
- When Carlos assigns area "Garage Pantry," section "Canned Goods," aisle "5," type "Staple"
- Then the item is added to the trip and the staple library

#### Rule: Quick-add works for one-offs
- Given Carlos types "Deli turkey"
- When Carlos selects "Add as one-off" with section "Deli"
- Then deli turkey is added to the current trip only

---

### US-04: Toggle Between Home and Store Views

#### Rule: Home view groups by area
- Given Carlos has items across 5 house areas
- When Carlos is in home view
- Then items are grouped under Bathroom, Garage Pantry, Kitchen Cabinets, Fridge, Freezer

#### Rule: Store view groups by aisle/section
- Given Carlos switches to store view
- Then items are grouped by aisle number (ascending) then named sections
- And only sections with items are shown

#### Rule: State preserved across toggle
- Given Carlos checked off 3 items in store view
- When Carlos toggles to home view and back to store view
- Then all 3 items remain checked

#### Rule: Toggle is fast
- Given Carlos taps the view toggle
- Then the new view renders within 200ms

---

### US-05: Check Off Items in Store

#### Rule: Offline check-off
- Given Carlos has no network
- When Carlos taps "Whole milk" to check it off
- Then milk shows "IN CART" within 100ms
- And the state is saved to local storage within 500ms

#### Rule: Survives app restart
- Given Carlos has checked 8 items and closes the app
- When Carlos reopens the app
- Then all 8 items are still checked

#### Rule: Uncheckable
- Given Carlos accidentally checked butter
- When Carlos taps butter again
- Then butter is unchecked

#### Rule: Progress counter
- Given Carlos is in Aisle 3 with 4 items
- When Carlos checks 2 items
- Then progress shows "2 of 4"

---

### US-06: Complete Trip with Carryover

#### Rule: Purchased staples re-queue
- Given Carlos bought "Whole milk" (staple)
- When Carlos finishes the trip
- Then milk appears pre-loaded on the next sweep

#### Rule: Purchased one-offs cleared
- Given Carlos bought "Birthday candles" (one-off)
- When Carlos finishes the trip
- Then birthday candles does not appear on the next trip

#### Rule: Unbought items carry over
- Given Carlos did not buy "Avocados" (one-off)
- When Carlos finishes the trip
- Then avocados appears on the next trip

#### Rule: No duplicate carryover
- Given avocados was already carried over from a previous trip
- When Carlos finishes another trip without buying it
- Then avocados appears once on the next trip (not duplicated)

#### Rule: Staple library unchanged
- Given Carlos finishes a trip
- Then the staple library has the same items as before the trip
- And no staples were deleted or modified by trip completion

---

## Release 1

### US-07: Skip Staple This Trip

#### Rule: Skip without deleting
- Given shampoo is pre-loaded as a staple in Bathroom
- When Carlos unchecks shampoo
- Then shampoo is removed from this trip
- And shampoo remains in the staple library

#### Rule: Reappears next trip
- Given Carlos skipped shampoo this trip
- When Carlos starts the next sweep
- Then shampoo appears pre-loaded again

#### Rule: Re-add after skip
- Given Carlos unchecked butter
- When Carlos re-checks butter
- Then butter is back on the current trip

---

### US-08: Navigate Areas During Sweep

#### Rule: Area completion tracking
- Given Carlos finished Bathroom with 3 items
- When Carlos taps "Done with Bathroom"
- Then Bathroom shows as complete with 3 items
- And progress shows "1 of 5 areas complete"

#### Rule: Out-of-order navigation
- Given the suggested next area is Garage Pantry
- When Carlos taps Freezer instead
- Then Freezer opens and no progress is lost

#### Rule: All areas complete triggers whiteboard
- Given all 5 areas are complete
- Then "Add from whiteboard" is prominently shown

---

### US-09: Auto-Suggest from Staple Library

#### Rule: Type-ahead with metadata
- Given "Greek yogurt" is in the staple library (Dairy, Aisle 3)
- When Carlos types "gre"
- Then "Greek yogurt - Dairy / Aisle 3" appears within 300ms

#### Rule: One-tap add
- When Carlos taps a suggestion
- Then the item is added with all metadata pre-filled

#### Rule: No match fallback
- Given "Birthday candles" is not in the staple library
- When Carlos types "birthday candles"
- Then no suggestions appear
- And manual add is available

---

### US-10: Navigate Store Sections

#### Rule: Next section navigation
- Given Carlos completed Aisle 3
- When Carlos taps "Next: Aisle 5"
- Then Aisle 5 opens

#### Rule: Move on with unchecked items
- Given Carlos is in Produce with 1 unchecked item
- When Carlos taps "Move on"
- Then the next section opens
- And Produce shows "3 of 4"

#### Rule: Section list with progress
- Given Carlos has completed 5 of 9 sections
- When Carlos views the section list
- Then completed sections have checkmarks
- And the next incomplete section is highlighted

---

### US-11: Trip Summary

#### Rule: Complete breakdown
- Given sweep captured 19 items and whiteboard added 3
- When Carlos views the trip summary
- Then total is 22 items (17 staples, 5 one-offs; 19 sweep, 3 whiteboard)

#### Rule: Prep time shown
- Given Carlos started 4 minutes ago
- Then prep time shows approximately 4 minutes

#### Rule: Transition to store
- Given the trip summary is displayed
- Then "Switch to Store View" is available
