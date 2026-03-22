Feature: Milestone 1 - Area CRUD Operations
  As Carlos, a household grocery planner
  I want to rename, delete, and reorder my house areas
  So that my app always matches my home layout and vocabulary

  Background:
    Given Carlos has custom house areas configured

  # --- US-CHA-04: Rename a House Area ---

  Scenario: Rename area propagates to all staples
    Given Carlos has 4 staples in "Garage Pantry": canned tomatoes, rice, pasta, beans
    When Carlos renames "Garage Pantry" to "Pantry"
    Then the area list shows "Pantry" instead of "Garage Pantry"
    And all 4 staples now have area "Pantry"

  Scenario: Rename area propagates to active trip items
    Given Carlos has an active trip with 3 items in "Kitchen Cabinets"
    When Carlos renames "Kitchen Cabinets" to "Kitchen"
    Then the 3 trip items now show under "Kitchen"

  Scenario: Rename to existing name is blocked
    Given Carlos has areas "Bathroom" and "Fridge"
    When Carlos tries to rename "Fridge" to "Bathroom"
    Then Carlos sees "Bathroom already exists"
    And the rename is not saved

  Scenario: Rename to same name with different case is blocked
    Given Carlos has an area named "Bathroom"
    When Carlos tries to rename "Fridge" to "bathroom"
    Then Carlos sees "Bathroom already exists"

  # --- US-CHA-05: Delete a House Area ---

  Scenario: Delete an empty area
    Given Ana Lucia has "Garage Pantry" with 0 staples
    When Ana Lucia deletes "Garage Pantry"
    Then "Garage Pantry" is removed from the area list
    And the area count decreases to 4

  Scenario: Delete area with staples requires reassignment
    Given Carlos has 2 staples in "Freezer": frozen peas and ice cream
    When Carlos deletes "Freezer" and reassigns to "Fridge"
    Then "Freezer" is removed from the area list
    And frozen peas and ice cream now have area "Fridge"

  Scenario: Delete area reassigns trip items too
    Given Carlos has an active trip with 1 item in "Freezer"
    And 2 staples in "Freezer"
    When Carlos deletes "Freezer" and reassigns to "Fridge"
    Then the trip item and both staples now belong to "Fridge"

  Scenario: Cannot delete last area
    Given Ana Lucia has only 1 area remaining: "Kitchen"
    When Ana Lucia tries to delete "Kitchen"
    Then she sees "You need at least one area for your sweep"
    And the delete is blocked

  Scenario: Delete detects duplicate conflict on reassignment
    Given Carlos has "Whole milk" in "Fridge" and "Whole milk" in "Freezer"
    When Carlos tries to delete "Freezer" and reassign to "Fridge"
    Then Carlos sees a conflict warning about "Whole milk" already existing in "Fridge"

  # --- US-CHA-06: Reorder Areas ---

  Scenario: Reorder areas changes display order
    Given Carlos has areas: Bathroom, Garage Pantry, Kitchen Cabinets, Fridge, Freezer, Laundry Room
    When Carlos moves "Laundry Room" from position 6 to position 2
    Then the area order becomes: Bathroom, Laundry Room, Garage Pantry, Kitchen Cabinets, Fridge, Freezer

  Scenario: Reordered areas reflected in home view grouping
    Given Carlos has reordered areas to: Bathroom, Laundry Room, Pantry, Kitchen Cabinets, Fridge
    When Carlos starts a new sweep
    Then area sections appear in that exact order

  Scenario: Reorder persists across app restart
    Given Carlos has reordered his areas
    When Carlos closes and reopens the app
    Then areas appear in the same custom order

  # --- US-CHA-07: Area Name Validation ---

  @property
  Scenario: Duplicate name blocked case-insensitively
    Given Carlos has an area named "Bathroom"
    When Carlos tries to add any casing variant of "Bathroom"
    Then the validation rejects it as a duplicate

  Scenario: Empty name blocked
    When Carlos tries to add an area with a blank name
    Then the validation rejects it with "Area name is required"

  Scenario: Whitespace-only name blocked
    When Carlos tries to add "   " as an area name
    Then the validation rejects it with "Area name is required"

  Scenario: Name exceeding 40 characters blocked
    When Carlos tries to add "The Big Room Where We Keep All The Stuff" (41 chars)
    Then the validation rejects it as too long

  Scenario: Name at exactly 40 characters is accepted
    When Carlos tries to add a name that is exactly 40 characters
    Then the validation accepts it
