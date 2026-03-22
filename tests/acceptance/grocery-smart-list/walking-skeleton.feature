Feature: Walking Skeleton - Core Grocery Smart List Journey
  As Carlos, a household grocery planner
  I want to manage a smart grocery list with staples and dual views
  So that I can reduce trip prep from 20 minutes to under 5 minutes and shop efficiently

  Background:
    Given Carlos has an empty staple library
    And no active trip exists

  # --- WS-1: Add a Staple Item (US-01) ---

  @walking_skeleton
  Scenario: Add a staple item with full metadata
    When Carlos adds "Whole milk" as a staple in "Fridge" area, "Dairy" section, aisle 3
    Then "Whole milk" is saved to the staple library
    And the staple library contains 1 item

  Scenario: Add a staple item without an aisle number
    When Carlos adds "Rotisserie chicken" as a staple in "Fridge" area, "Deli" section, with no aisle
    Then "Rotisserie chicken" is saved to the staple library
    And "Rotisserie chicken" has no aisle assigned

  Scenario: Add a one-off item to the current trip
    Given Carlos has an active trip
    When Carlos adds "Birthday candles" as a one-off in "Kitchen Cabinets" area, "Baking" section, aisle 12
    Then "Birthday candles" appears on the current trip
    And "Birthday candles" does not appear in the staple library

  Scenario: Prevent duplicate staple in the same area
    Given "Whole milk" already exists as a staple in "Fridge"
    When Carlos tries to add "Whole milk" to "Fridge" again
    Then the app shows "Whole milk already exists in Fridge"
    And the staple library still contains only one "Whole milk"

  Scenario: Allow same item name in different areas
    Given "Hand soap" exists as a staple in "Bathroom"
    When Carlos adds "Hand soap" as a staple in "Kitchen Cabinets" area, "Cleaning" section, aisle 9
    Then the staple library contains two "Hand soap" entries
    And they are in different house areas

  # --- WS-2: See Pre-Loaded Staples by Area (US-02) ---

  @walking_skeleton
  Scenario: Staples pre-load on new sweep grouped by house area
    Given Carlos has the following staples in the library:
      | name          | area             | section       | aisle |
      | Whole milk    | Fridge           | Dairy         | 3     |
      | Butter        | Fridge           | Dairy         | 3     |
      | Toilet paper  | Bathroom         | Paper Goods   | 8     |
      | Shampoo       | Bathroom         | Personal Care | 7     |
      | Canned beans  | Garage Pantry    | Canned Goods  | 5     |
    When Carlos starts a new sweep
    Then the home view shows items grouped by house area:
      | area          | count |
      | Bathroom      | 2     |
      | Fridge        | 2     |
      | Garage Pantry | 1     |

  Scenario: Empty areas are still visible
    Given Carlos has staples only in "Fridge" and "Bathroom"
    When Carlos starts a new sweep
    Then all 5 house areas are visible
    And "Freezer" shows 0 staples due
    And "Kitchen Cabinets" shows 0 staples due
    And "Garage Pantry" shows 0 staples due

  Scenario: Newly added staple appears on next sweep
    Given Carlos has an active trip
    And Carlos adds "Oat milk" as a staple in "Fridge" area, "Dairy" section, aisle 3
    When Carlos completes the trip and starts a new sweep
    Then "Oat milk" appears pre-loaded in the "Fridge" area

  # --- WS-3: Quick-Add Item (US-03) ---

  @walking_skeleton
  Scenario: Quick-add a new item with metadata during a trip
    Given Carlos has an active trip
    When Carlos quick-adds "Canned tomatoes" with area "Garage Pantry", section "Canned Goods", aisle 5, type "staple"
    Then "Canned tomatoes" appears on the current trip
    And "Canned tomatoes" is saved to the staple library

  Scenario: Quick-add a one-off item
    Given Carlos has an active trip
    When Carlos quick-adds "Deli turkey" with area "Fridge", section "Deli", no aisle, type "one-off"
    Then "Deli turkey" appears on the current trip
    And "Deli turkey" does not appear in the staple library

  Scenario: Quick-add fails without required metadata
    Given Carlos has an active trip
    When Carlos tries to quick-add "Something" without specifying an area
    Then the item is not added
    And Carlos sees a message that area is required

  # --- WS-4: Toggle Between Home and Store Views (US-04) ---

  @walking_skeleton
  Scenario: Toggle from home view to store view
    Given Carlos has an active trip with items across multiple areas and aisles:
      | name         | area          | section       | aisle |
      | Whole milk   | Fridge        | Dairy         | 3     |
      | Butter       | Fridge        | Dairy         | 3     |
      | Canned beans | Garage Pantry | Canned Goods  | 5     |
      | Deli turkey  | Fridge        | Deli          |       |
    And Carlos is viewing the home view
    When Carlos switches to store view
    Then items are grouped by aisle and section:
      | group          | count |
      | Aisle 3: Dairy | 2     |
      | Aisle 5: Canned Goods | 1 |
      | Deli           | 1     |
    And numbered aisles appear before named sections

  Scenario: Store view excludes empty sections
    Given Carlos has items only in "Dairy" (aisle 3) and "Deli" (no aisle)
    When Carlos views the store layout
    Then only "Aisle 3: Dairy" and "Deli" sections are shown
    And no empty aisles appear

  Scenario: Check-off state preserved across view toggle
    Given Carlos has checked off "Whole milk" in store view
    When Carlos switches to home view and back to store view
    Then "Whole milk" is still checked off

  # --- WS-5: Check Off Items in Store (US-05) ---

  @walking_skeleton
  Scenario: Check off an item in store view
    Given Carlos has an active trip with "Whole milk" in store view
    When Carlos checks off "Whole milk"
    Then "Whole milk" shows as in the cart
    And the check-off is persisted to storage

  Scenario: Uncheck an accidentally checked item
    Given Carlos has checked off "Butter"
    When Carlos taps "Butter" again
    Then "Butter" is unchecked
    And "Butter" no longer shows as in the cart

  Scenario: Check-off survives app restart
    Given Carlos has checked off 3 items on the current trip
    When the app restarts and Carlos reopens the trip
    Then all 3 items are still checked off

  Scenario: Section progress updates on check-off
    Given Carlos is viewing a section with 4 items and 0 checked
    When Carlos checks off 2 items
    Then the section progress shows "2 of 4"

  # --- WS-6: Complete Trip with Carryover (US-06) ---

  @walking_skeleton
  Scenario: Complete trip - bought staples re-queue, bought one-offs cleared
    Given Carlos has an active trip with:
      | name             | type    | checked |
      | Whole milk       | staple  | yes     |
      | Birthday candles | one-off | yes     |
      | Avocados         | one-off | no      |
    When Carlos finishes the trip
    Then the trip summary shows 2 items purchased
    And on the next sweep:
      | item             | appears | reason                      |
      | Whole milk       | yes     | staple re-queued from library |
      | Birthday candles | no      | bought one-off cleared        |
      | Avocados         | yes     | unbought one-off carried over |

  Scenario: Unbought items carry over exactly once
    Given "Avocados" was carried over from the previous trip
    And Carlos did not buy "Avocados" again this trip
    When Carlos finishes the trip
    Then "Avocados" appears once on the next trip
    And there are no duplicate "Avocados" entries

  Scenario: Staple library is unchanged after trip completion
    Given Carlos has 5 staples in the library
    And Carlos finishes a trip
    Then the staple library still contains exactly 5 items
    And no staples were added or removed by trip completion

  Scenario: All items bought - clean next trip
    Given Carlos has checked all items on the trip
    And the trip contains 3 staples and 2 one-offs
    When Carlos finishes the trip
    Then the next trip contains only the 3 staples pre-loaded
    And no one-offs carry over
