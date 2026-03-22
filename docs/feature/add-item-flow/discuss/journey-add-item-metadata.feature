Feature: Add new item with metadata
  As Carlos Rivera (household grocery planner)
  I want to add new items with proper metadata (type, area, section, aisle)
  So that items are correctly classified from the start and I don't have to re-enter details

  Background:
    Given Carlos has an active trip
    And the staple library contains items in sections "Dairy", "Produce", "Deli", "Baking"

  # Step 1: Name entry and no-match detection

  Scenario: New item prompt appears when no staple matches
    Given Carlos is on the home view during a sweep
    And the staple library does not contain "Oat milk"
    When Carlos types "Oat milk" in the QuickAdd input
    Then a suggestion row shows "Add 'Oat milk' as new item..."
    And no staple suggestions are displayed

  Scenario: Existing staple suggestion still works
    Given the staple library contains "Whole milk" in Fridge, Dairy, Aisle 3
    When Carlos types "who" in the QuickAdd input
    Then "Whole milk - Dairy / Aisle 3" appears as a suggestion
    And "Add 'who' as new item..." also appears below the suggestions

  # Step 2: Metadata bottom sheet with smart defaults

  Scenario: Bottom sheet shows smart defaults during sweep
    Given Carlos is viewing the Fridge area during a sweep
    When Carlos taps "Add 'Oat milk' as new item..."
    Then a bottom sheet appears with title "Add 'Oat milk'"
    And the type toggle defaults to "Staple"
    And the area picker shows "Fridge" pre-selected
    And the section field is empty with auto-suggest available
    And the aisle field is empty and marked as optional

  Scenario: Bottom sheet defaults to one-off during whiteboard entry
    Given Carlos is in whiteboard entry mode
    When Carlos taps "Add 'Paper towels' as new item..."
    Then a bottom sheet appears with title "Add 'Paper towels'"
    And the type toggle defaults to "One-off"
    And the area picker shows no pre-selection

  Scenario: All five house areas available in area picker
    Given Carlos has opened the metadata bottom sheet
    When Carlos taps the area picker
    Then the options are "Bathroom", "Garage Pantry", "Kitchen Cabinets", "Fridge", "Freezer"
    And no other options are available

  # Step 3: Section auto-suggest

  Scenario: Previously used sections appear as suggestions
    Given Carlos has staples in sections "Dairy", "Produce", and "Deli"
    And Carlos has opened the metadata bottom sheet
    When Carlos types "Da" in the section field
    Then "Dairy" appears as a section suggestion
    And "Deli" does not appear

  Scenario: Carlos enters a brand new section name
    Given Carlos has no staples in section "International Foods"
    And Carlos has opened the metadata bottom sheet
    When Carlos types "International Foods" in the section field
    Then no section suggestions match
    And Carlos can submit with "International Foods" as the section

  # Step 4: Confirmation

  Scenario: Staple item saved to library and added to trip
    Given Carlos has opened the metadata bottom sheet for "Oat milk"
    And Carlos selects type "Staple", area "Fridge", section "Dairy", aisle "3"
    When Carlos taps "Add Item"
    Then "Oat milk" is saved to the staple library with area Fridge, section Dairy, aisle 3
    And "Oat milk" is added to the current trip in the Fridge area
    And a confirmation toast shows "Oat milk added to Fridge"
    And the QuickAdd input is cleared
    And the bottom sheet dismisses

  Scenario: One-off item added to trip only
    Given Carlos has opened the metadata bottom sheet for "Birthday candles"
    And Carlos selects type "One-off", area "Kitchen Cabinets", section "Baking", aisle "12"
    When Carlos taps "Add Item"
    Then "Birthday candles" is added to the current trip in Kitchen Cabinets
    And "Birthday candles" is NOT saved to the staple library
    And a confirmation toast shows "Birthday candles added to Kitchen Cabinets"

  Scenario: Staple without aisle number
    Given Carlos has opened the metadata bottom sheet for "Rotisserie chicken"
    And Carlos selects type "Staple", area "Fridge", section "Deli", aisle blank
    When Carlos taps "Add Item"
    Then "Rotisserie chicken" is saved with no aisle number
    And "Rotisserie chicken" appears in the Fridge area on the trip

  # Error paths

  Scenario: Skip metadata to stay in flow
    Given Carlos is viewing the Fridge area during a sweep
    And Carlos has tapped "Add 'Sriracha' as new item..."
    When Carlos taps "Skip, add with defaults"
    Then "Sriracha" is added as one-off in the Fridge area
    And the section is "Uncategorized"
    And no aisle number is set
    And the bottom sheet dismisses

  Scenario: Skip metadata defaults to Kitchen Cabinets when no active area
    Given Carlos is in whiteboard entry mode with no active area
    And Carlos has tapped "Add 'Sriracha' as new item..."
    When Carlos taps "Skip, add with defaults"
    Then "Sriracha" is added as one-off in Kitchen Cabinets
    And the section is "Uncategorized"

  Scenario: Duplicate staple detected in same area
    Given "Whole milk" already exists as a staple in the Fridge area
    And Carlos has opened the metadata bottom sheet for "Whole milk"
    And Carlos selects area "Fridge"
    When Carlos taps "Add Item"
    Then the bottom sheet shows "Whole milk already exists in Fridge"
    And offers options "Add to trip instead" and "Cancel"

  Scenario: Add existing staple to trip from duplicate warning
    Given the duplicate warning is showing for "Whole milk" in Fridge
    When Carlos taps "Add to trip instead"
    Then "Whole milk" is added to the current trip with its existing staple metadata
    And the bottom sheet dismisses

  Scenario: Cancel from duplicate warning
    Given the duplicate warning is showing for "Whole milk" in Fridge
    When Carlos taps "Cancel"
    Then the bottom sheet returns to the metadata form
    And Carlos can change the area or name

  Scenario: Dismiss bottom sheet without adding
    Given Carlos has opened the metadata bottom sheet for "Oat milk"
    When Carlos taps the dismiss button
    Then the bottom sheet dismisses
    And no item is added to the trip
    And no item is added to the staple library
    And the QuickAdd input still shows "Oat milk"
