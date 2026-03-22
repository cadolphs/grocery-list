Feature: Milestone 1 - Enhanced Item Management and Navigation
  As Carlos, a household grocery planner
  I want efficient sweep navigation, smart suggestions, and trip summaries
  So that my entire grocery workflow is fast and reliable

  # --- US-07: Skip Staple This Trip ---

  Scenario: Skip a staple without deleting from library
    Given "Shampoo" is pre-loaded as a staple in "Bathroom"
    When Carlos skips "Shampoo" for this trip
    Then "Shampoo" is removed from the current trip
    And "Shampoo" remains in the staple library
    And the "Bathroom" item count decreases by 1

  Scenario: Skipped staple reappears on next trip
    Given Carlos skipped "Shampoo" on the current trip
    When Carlos starts the next sweep
    Then "Shampoo" appears pre-loaded in "Bathroom" again

  Scenario: Re-add a skipped staple within the same trip
    Given Carlos skipped "Butter" in "Fridge"
    When Carlos re-adds "Butter" to this trip
    Then "Butter" is back on the current trip
    And the "Fridge" item count increases by 1

  Scenario: Skip multiple staples across different areas
    Given Carlos has 3 staples in "Bathroom" and 4 in "Fridge"
    When Carlos skips 1 item in "Bathroom" and 2 items in "Fridge"
    Then "Bathroom" shows 2 items needed
    And "Fridge" shows 2 items needed

  # --- US-08: Navigate Areas During Sweep ---

  Scenario: Complete an area and see sweep progress
    Given Carlos is sweeping with 5 house areas
    And Carlos has reviewed all items in "Bathroom"
    When Carlos marks "Bathroom" as done
    Then "Bathroom" shows as complete
    And sweep progress shows "1 of 5 areas complete"
    And the next suggested area is highlighted

  Scenario: Navigate areas out of order
    Given the suggested next area is "Garage Pantry"
    When Carlos taps "Freezer" instead
    Then "Freezer" opens for review
    And no sweep progress is lost

  Scenario: All areas complete triggers whiteboard consolidation
    Given Carlos has completed all 5 house areas
    When Carlos views the sweep progress
    Then all areas show as complete
    And "Add from whiteboard" is prominently shown

  Scenario: Area shows item count after additions during sweep
    Given Carlos is sweeping "Kitchen Cabinets" with 2 pre-loaded staples
    And Carlos quick-adds 1 new item to "Kitchen Cabinets"
    Then "Kitchen Cabinets" shows 3 items

  # --- US-09: Auto-Suggest from Staple Library ---

  Scenario: Type-ahead suggests a known staple with metadata
    Given "Greek yogurt" exists in the staple library with section "Dairy" and aisle 3
    When Carlos types "gre" in the quick-add field
    Then "Greek yogurt - Dairy / Aisle 3" appears as a suggestion

  Scenario: One-tap add from suggestion fills all metadata
    Given the suggestion "Greek yogurt - Dairy / Aisle 3" is showing
    When Carlos taps the suggestion
    Then "Greek yogurt" is added to the current trip
    And all metadata is pre-filled from the staple library

  Scenario: No suggestions for unknown item
    Given "Birthday candles" does not exist in the staple library
    When Carlos types "birthday candles"
    Then no suggestions appear
    And Carlos can add it manually

  Scenario: Multiple suggestions for partial match
    Given "Cheddar cheese" and "Chicken breast" are in the staple library
    When Carlos types "ch"
    Then both "Cheddar cheese" and "Chicken breast" appear as suggestions

  Scenario: Suggestion search is case-insensitive
    Given "Greek yogurt" exists in the staple library
    When Carlos types "GREEK"
    Then "Greek yogurt" appears as a suggestion

  Scenario: Empty input shows no suggestions
    Given "Greek yogurt" exists in the staple library
    When the quick-add field is empty
    Then no suggestions are shown

  # --- US-10: Navigate Store Sections ---

  Scenario: Navigate to next section after completing current
    Given Carlos has checked all items in "Aisle 3: Dairy"
    And the next section is "Aisle 5: Canned Goods"
    When Carlos taps "Next: Aisle 5"
    Then "Aisle 5: Canned Goods" opens
    And "Aisle 3: Dairy" shows a completion badge

  Scenario: Move on with unchecked items in a section
    Given Carlos is in "Produce" with 3 of 4 items checked
    When Carlos taps "Move on"
    Then the next section opens
    And "Produce" shows "3 of 4" in the section list

  Scenario: View section list with progress
    Given Carlos has completed 5 of 9 store sections
    When Carlos views the section list
    Then completed sections show checkmarks
    And incomplete sections show item progress
    And the next incomplete section is highlighted

  Scenario: Last section completed shows trip completion option
    Given Carlos has completed all store sections
    When Carlos views the section list
    Then "Finish Trip" is available

  # --- US-11: Trip Summary ---

  Scenario: View trip summary with breakdown
    Given Carlos completed the sweep with 19 items
    And Carlos added 3 items from whiteboard
    When Carlos views the trip summary
    Then it shows 22 total items
    And breakdown shows 17 staples and 5 one-offs
    And breakdown shows 19 from sweep and 3 from whiteboard

  Scenario: Prep time displayed in trip summary
    Given Carlos started the sweep 4 minutes ago
    When Carlos views the trip summary
    Then the prep time shows approximately 4 minutes

  Scenario: Summary reflects skipped staples
    Given Carlos started with 21 pre-loaded staples and skipped 3
    And Carlos added 2 one-offs during sweep
    When Carlos views the trip summary
    Then it shows 20 total items

  Scenario: Switch to store view from trip summary
    Given the trip summary is displayed
    When Carlos taps "Switch to Store View"
    Then the store view opens with all trip items
