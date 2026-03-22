Feature: Milestone 1 - Add Item Metadata Flow
  As Carlos, a household grocery planner
  I want smart defaults, shortcuts, section suggestions, and duplicate warnings
  So that adding new items is fast, consistent, and error-free

  # --- US-AIF-02: Context-Aware Smart Defaults ---

  Scenario: Sweep mode pre-fills staple type and active area
    Given Carlos is viewing the Fridge area during a sweep
    When Carlos opens the metadata bottom sheet for "Almond butter"
    Then the type toggle defaults to "Staple"
    And the area picker shows "Fridge" pre-selected

  Scenario: Whiteboard mode defaults to one-off with no area
    Given all sweep areas are complete
    When Carlos opens the metadata bottom sheet for "Dish soap"
    Then the type toggle defaults to "One-off"
    And the area picker shows no pre-selection

  Scenario: Active area changes when Carlos switches rooms
    Given Carlos was viewing Fridge but switches to Garage Pantry
    When Carlos opens the metadata bottom sheet for "Dog treats"
    Then the area picker shows "Garage Pantry" pre-selected

  Scenario: Carlos can override any smart default
    Given Carlos is viewing the Fridge area during a sweep
    And the bottom sheet defaults to type Staple and area Fridge
    When Carlos changes type to "One-off" and area to "Freezer"
    And Carlos fills section "Frozen Treats" and taps "Add Item"
    Then the item is saved as one-off in the Freezer area

  # --- US-AIF-03: Skip Metadata Shortcut ---

  Scenario: Skip adds item with defaults during sweep
    Given Carlos is viewing the Fridge area during a sweep
    And Carlos has opened the metadata bottom sheet for "Sriracha"
    When Carlos taps "Skip, add with defaults"
    Then "Sriracha" is added as one-off in the Fridge area
    And the section is "Uncategorized" with no aisle number
    And the bottom sheet dismisses

  Scenario: Skip uses Kitchen Cabinets fallback during whiteboard entry
    Given all sweep areas are complete with no active area
    And Carlos has opened the metadata bottom sheet for "Fancy mustard"
    When Carlos taps "Skip, add with defaults"
    Then "Fancy mustard" is added as one-off in Kitchen Cabinets
    And the section is "Uncategorized" with no aisle number

  Scenario: Skipped items are not saved to staple library
    Given Carlos has opened the metadata bottom sheet for "Sriracha"
    When Carlos taps "Skip, add with defaults"
    Then "Sriracha" is NOT saved to the staple library

  # --- US-AIF-04: Section Auto-Suggest ---

  Scenario: Previously used section appears as suggestion
    Given Carlos has staples in sections "Dairy", "Produce", and "Deli"
    And Carlos has opened the metadata bottom sheet
    When Carlos types "Da" in the section field
    Then "Dairy" appears as a section suggestion

  Scenario: Non-matching sections are filtered out
    Given Carlos has staples in sections "Dairy", "Produce", and "Deli"
    And Carlos has opened the metadata bottom sheet
    When Carlos types "Da" in the section field
    Then "Produce" does not appear as a suggestion
    And "Deli" does not appear as a suggestion

  Scenario: Tapping a section suggestion fills the field
    Given "Dairy" appears as a section suggestion
    When Carlos taps "Dairy"
    Then the section field is filled with "Dairy"
    And the suggestion list dismisses

  Scenario: New section name accepted without restriction
    Given Carlos has no staples in section "International Foods"
    And Carlos has filled the metadata form for "Tahini"
    When Carlos types "International Foods" in the section field and taps "Add Item"
    Then the item is created with section "International Foods"

  # --- US-AIF-05: Duplicate Staple Detection ---

  Scenario: Duplicate detected when same name and area exist
    Given "Whole milk" exists as a staple in the Fridge area
    And Carlos has opened the metadata bottom sheet for "Whole milk" with area Fridge
    When Carlos taps "Add Item"
    Then the bottom sheet shows "Whole milk already exists in Fridge"
    And displays the existing metadata "Dairy / Aisle 3"

  Scenario: Same name in different area is not a duplicate
    Given "Trash bags" exists as a staple in Kitchen Cabinets
    And Carlos has opened the metadata bottom sheet for "Trash bags" with area Bathroom
    When Carlos taps "Add Item"
    Then "Trash bags" is saved as a new staple in Bathroom
    And no duplicate warning is shown

  Scenario: "Add to trip instead" uses existing staple metadata
    Given the duplicate warning is showing for "Whole milk" in Fridge
    When Carlos taps "Add to trip instead"
    Then "Whole milk" is added to the trip with area Fridge, section Dairy, aisle 3
    And the bottom sheet dismisses

  Scenario: Cancel from duplicate warning returns to form
    Given the duplicate warning is showing for "Whole milk" in Fridge
    When Carlos taps "Cancel"
    Then the bottom sheet returns to the metadata form
    And Carlos can change the area or name

  # --- Error and Edge Cases ---

  Scenario: Submit blocked when area is not selected
    Given Carlos has opened the metadata bottom sheet for "Oat milk"
    And Carlos has not selected an area
    When Carlos taps "Add Item"
    Then the item is not added
    And Carlos sees a message that area is required

  Scenario: Submit blocked when section is empty
    Given Carlos has opened the metadata bottom sheet for "Oat milk"
    And Carlos selects area "Fridge" but leaves section empty
    When Carlos taps "Add Item"
    Then the item is not added
    And Carlos sees a message that section is required

  Scenario: Aisle number is optional
    Given Carlos has opened the metadata bottom sheet for "Rotisserie chicken"
    And Carlos selects type "Staple", area "Fridge", section "Deli"
    And Carlos leaves the aisle field blank
    When Carlos taps "Add Item"
    Then "Rotisserie chicken" is saved with no aisle number

  Scenario: Dismissing the bottom sheet adds nothing
    Given Carlos has opened the metadata bottom sheet for "Oat milk"
    When Carlos dismisses the bottom sheet without submitting
    Then no item is added to the trip
    And no staple is added to the library
