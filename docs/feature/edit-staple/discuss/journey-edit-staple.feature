Feature: Edit Staple Location
  As Carlos Rivera, a household grocery planner,
  I want to edit a staple's house area and store location
  So that my staple library reflects reality when things move around

  Background:
    Given Carlos has a staple library with the following items:
      | name           | houseArea        | section           | aisle |
      | Paper towels   | Kitchen Cabinets | Cleaning          | 5     |
      | Whole milk     | Fridge           | Dairy             | 3     |
      | Greek yogurt   | Fridge           | Dairy             | 3     |
      | Trash bags     | Garage Pantry    | Cleaning Supplies | 7     |
    And Carlos has house areas: Bathroom, Garage Pantry, Kitchen Cabinets, Fridge, Freezer

  # Step 2: Open Edit Sheet

  Scenario: Open edit sheet for a staple with pre-filled values
    Given Carlos is on the home view during a sweep
    When Carlos taps "Paper towels" in the "Kitchen Cabinets" area
    Then the edit bottom sheet opens with title "Edit 'Paper towels'"
    And the house area "Kitchen Cabinets" is pre-selected
    And the store section field shows "Cleaning"
    And the aisle number field shows "5"

  Scenario: Edit sheet shows all available areas including custom areas
    Given Carlos has added a custom area "Laundry Room"
    When Carlos taps "Paper towels" to edit
    Then the area picker shows: Bathroom, Garage Pantry, Kitchen Cabinets, Fridge, Freezer, Laundry Room

  Scenario: Section auto-suggest works in edit mode
    Given Carlos taps "Paper towels" to edit
    When Carlos clears the section field and types "Dai"
    Then the auto-suggest shows "Dairy"

  # Step 3: Change Location -- House Area

  Scenario: Change house area of a staple
    Given Carlos taps "Paper towels" to edit
    When Carlos selects "Garage Pantry" as the house area
    And Carlos taps "Save Changes"
    Then "Paper towels" is saved with house area "Garage Pantry" in the staple library
    And "Paper towels" appears under "Garage Pantry" in the home view
    And "Paper towels" no longer appears under "Kitchen Cabinets" in the home view

  Scenario: Current trip item updates when staple area changes
    Given a trip is active with "Paper towels" in "Kitchen Cabinets"
    When Carlos edits "Paper towels" and changes the area to "Garage Pantry"
    And Carlos taps "Save Changes"
    Then the trip item "Paper towels" now appears under "Garage Pantry"

  # Step 3: Change Location -- Store Section and Aisle

  Scenario: Change store section of a staple
    Given Carlos taps "Paper towels" to edit
    When Carlos changes the section to "Cleaning Supplies"
    And Carlos taps "Save Changes"
    Then "Paper towels" is saved with section "Cleaning Supplies" in the staple library

  Scenario: Change aisle number of a staple
    Given Carlos taps "Whole milk" to edit
    When Carlos changes the aisle number to "4"
    And Carlos taps "Save Changes"
    Then "Whole milk" is saved with aisle number 4 in the staple library
    And "Whole milk" appears in Aisle 4 in the store view

  Scenario: Remove aisle number from a staple
    Given Carlos taps "Whole milk" to edit
    When Carlos clears the aisle number field
    And Carlos taps "Save Changes"
    Then "Whole milk" is saved with no aisle number
    And "Whole milk" appears under the "Dairy" section after numbered aisles in store view

  Scenario: Change both area and store location at once
    Given Carlos taps "Paper towels" to edit
    When Carlos selects "Garage Pantry" as the house area
    And Carlos changes the section to "Cleaning Supplies"
    And Carlos changes the aisle to "7"
    And Carlos taps "Save Changes"
    Then "Paper towels" is saved with area "Garage Pantry", section "Cleaning Supplies", aisle 7

  # Error Path E1: Duplicate Detection

  Scenario: Duplicate detected when moving to an area with same-name staple
    Given Carlos has "Trash bags" in "Garage Pantry"
    And Carlos adds "Trash bags" as a staple in "Kitchen Cabinets"
    When Carlos edits the Kitchen Cabinets "Trash bags" and selects "Garage Pantry"
    And Carlos taps "Save Changes"
    Then the app shows "Trash bags already exists in Garage Pantry"
    And the edit is not saved
    And Carlos remains on the edit sheet

  # Error Path E2: Cancel

  Scenario: Cancel edit without saving changes
    Given Carlos taps "Paper towels" to edit
    And Carlos selects "Garage Pantry" as the house area
    When Carlos taps "Cancel"
    Then the edit sheet closes
    And "Paper towels" remains in "Kitchen Cabinets" unchanged
    And the staple library is not modified

  # Error Path E3: Remove Staple

  Scenario: Remove a staple from the edit sheet
    Given Carlos taps "Paper towels" to edit
    When Carlos taps "Remove from Staples"
    And Carlos confirms the removal
    Then "Paper towels" is removed from the staple library
    And "Paper towels" on the current trip becomes a one-off item

  Scenario: Cancel staple removal
    Given Carlos taps "Paper towels" to edit
    When Carlos taps "Remove from Staples"
    And Carlos cancels the confirmation
    Then "Paper towels" remains in the staple library
    And the edit sheet remains open

  # Step 4: Verify Updated Staple

  Scenario: Updated staple location persists across app restart
    Given Carlos edits "Paper towels" to area "Garage Pantry", section "Cleaning Supplies", aisle 7
    When Carlos restarts the app
    And Carlos starts a new trip
    Then "Paper towels" appears under "Garage Pantry" with section "Cleaning Supplies" aisle 7

  Scenario: Only staple items are editable (one-off items are not)
    Given Carlos has a one-off item "Birthday candles" on the current trip
    When Carlos taps "Birthday candles" in the home view
    Then no edit sheet opens for "Birthday candles"
