Feature: Carlos Customizes His House Areas
  As Carlos Rivera, a household grocery planner
  I want to customize the house areas in my sweep
  So that the app matches my actual home layout

  Background:
    Given Carlos has the default house areas: Bathroom, Garage Pantry, Kitchen Cabinets, Fridge, Freezer

  # --- Step 1: Discover Area Settings ---

  Scenario: View area management from settings
    Given Carlos is on the home view
    When Carlos taps the settings icon
    Then Carlos sees a list of 5 house areas
    And each area shows a drag handle and an edit button
    And an "Add Area" button appears at the bottom

  # --- Step 2a: Add a New Area ---

  Scenario: Add a new house area
    Given Carlos is on the area management screen
    When Carlos taps "Add Area"
    And Carlos types "Laundry Room" as the area name
    And Carlos taps "Save"
    Then "Laundry Room" appears at the end of the area list
    And the area count is now 6

  Scenario: Prevent adding a duplicate area name
    Given Carlos is on the area management screen
    When Carlos taps "Add Area"
    And Carlos types "Bathroom" as the area name
    Then Carlos sees "Bathroom already exists"
    And the save button is disabled

  Scenario: Prevent adding an empty area name
    Given Carlos is on the add area screen
    When Carlos leaves the area name blank
    Then Carlos sees "Area name is required"
    And the save button is disabled

  Scenario: Enforce area name length limit
    Given Carlos is on the add area screen
    When Carlos types a name longer than 40 characters
    Then the input is truncated to 40 characters
    And a character count "40/40" is shown

  # --- Step 2b: Rename an Existing Area ---

  Scenario: Rename an area with staples
    Given Carlos has 4 staples in "Garage Pantry" (canned tomatoes, rice, pasta, beans)
    When Carlos opens the edit screen for "Garage Pantry"
    And Carlos changes the name to "Pantry"
    And Carlos taps "Save"
    Then the area list shows "Pantry" instead of "Garage Pantry"
    And all 4 staples now show "Pantry" as their house area
    And the home view shows "Pantry (4)" where "Garage Pantry (4)" was

  Scenario: Rename propagates to current trip items
    Given Carlos has started a sweep with items in "Garage Pantry"
    When Carlos renames "Garage Pantry" to "Pantry"
    Then current trip items in "Garage Pantry" now show under "Pantry"

  Scenario: Prevent renaming to an existing area name
    Given Carlos has areas "Bathroom" and "Fridge"
    When Carlos tries to rename "Fridge" to "Bathroom"
    Then Carlos sees "Bathroom already exists"
    And the rename is not saved

  # --- Step 2c: Delete an Area ---

  Scenario: Delete an area with staples requires reassignment
    Given Carlos has 2 staples in "Freezer" (frozen peas, ice cream)
    And Carlos has areas: Bathroom, Pantry, Kitchen Cabinets, Fridge, Freezer
    When Carlos taps delete on "Freezer"
    Then Carlos sees "2 staples are assigned to Freezer"
    And Carlos sees a list of remaining areas to reassign to
    When Carlos selects "Fridge" as the reassignment target
    And Carlos taps "Delete and Move Staples"
    Then "Freezer" is removed from the area list
    And frozen peas and ice cream now belong to "Fridge"
    And the area count is now 4

  Scenario: Delete an empty area shows simple confirmation
    Given "Laundry Room" has 0 staples
    When Carlos taps delete on "Laundry Room"
    Then Carlos sees "Delete Laundry Room?"
    And no reassignment picker is shown
    When Carlos confirms
    Then "Laundry Room" is removed from the area list

  Scenario: Cannot delete the last remaining area
    Given Carlos has only 1 area remaining: "Kitchen"
    When Carlos tries to delete "Kitchen"
    Then Carlos sees "You need at least one area for your sweep"
    And the delete button is disabled

  Scenario: Delete reassigns current trip items too
    Given Carlos has started a sweep with 2 trip items in "Freezer"
    And Carlos has 2 staples in "Freezer"
    When Carlos deletes "Freezer" and reassigns to "Fridge"
    Then both staples and both trip items now belong to "Fridge"

  # --- Step 2d: Reorder Areas ---

  Scenario: Reorder areas by dragging
    Given Carlos has areas in order: Bathroom, Garage Pantry, Kitchen Cabinets, Fridge, Freezer
    When Carlos drags "Fridge" from position 4 to position 2
    Then the area order becomes: Bathroom, Fridge, Garage Pantry, Kitchen Cabinets, Freezer

  Scenario: Reorder affects home view display
    Given Carlos has reordered areas to: Bathroom, Laundry Room, Pantry, Kitchen Cabinets, Fridge
    When Carlos views the home screen
    Then areas appear in that exact order

  Scenario: Reorder affects sweep progress
    Given Carlos has reordered areas to: Bathroom, Laundry Room, Pantry, Kitchen Cabinets, Fridge
    When Carlos completes "Bathroom" during a sweep
    Then sweep progress shows "1 of 5 areas complete"
    And the next suggested area is "Laundry Room"

  # --- Step 3: Verify Changes in Home View ---

  Scenario: Home view reflects all area changes
    Given Carlos renamed "Garage Pantry" to "Pantry"
    And Carlos added "Laundry Room"
    And Carlos deleted "Freezer" (moved staples to Fridge)
    And Carlos reordered areas to: Bathroom, Laundry Room, Pantry, Kitchen Cabinets, Fridge
    When Carlos views the home screen
    Then 5 areas are shown in the custom order
    And "Pantry" shows with its staples (not "Garage Pantry")
    And "Laundry Room" shows with 0 staples
    And "Fridge" includes the former Freezer staples
    And "Freezer" does not appear

  # --- Step 4: Sweep with Custom Areas ---

  Scenario: New area participates in sweep
    Given Carlos added "Laundry Room" as an area
    And Carlos added "Detergent" as a staple in "Laundry Room"
    When Carlos starts a new sweep
    Then "Laundry Room" appears with 1 staple pre-loaded
    And sweep progress shows "0 of 6 areas complete" (if 6 areas exist)

  # --- Error Paths ---

  Scenario: Area order persists after app restart
    Given Carlos has reordered areas to: Bathroom, Laundry Room, Pantry, Kitchen Cabinets, Fridge
    When Carlos closes and reopens the app
    Then areas appear in the same custom order

  Scenario: Area changes persist after app restart
    Given Carlos renamed "Garage Pantry" to "Pantry" and added "Laundry Room"
    When Carlos closes and reopens the app
    Then "Pantry" and "Laundry Room" are still present
    And staples still reflect the rename
