Feature: Milestone 1 - UI for Enhanced Item Management and Navigation
  As Carlos, a household grocery planner
  I want the mobile interface to support skipping, navigation, suggestions, and summaries
  So that my sweep and shopping experience is smooth and efficient

  Background:
    Given Carlos has staples in the library:
      | name          | area          | section       | aisle |
      | Whole milk    | Fridge        | Dairy         | 3     |
      | Butter        | Fridge        | Dairy         | 3     |
      | Eggs          | Fridge        | Dairy         | 3     |
      | Toilet paper  | Bathroom      | Paper Goods   | 8     |
      | Shampoo       | Bathroom      | Personal Care | 7     |
      | Canned beans  | Garage Pantry | Canned Goods  | 5     |
    And Carlos starts a new trip

  # --- US-07: Skip button on home screen ---

  Scenario: Skip a staple removes it from the home view
    Given Carlos is viewing the home screen
    When Carlos taps "skip" on "Shampoo"
    Then "Shampoo" is no longer visible in the "Bathroom" area
    And the "Bathroom" area shows 1 item remaining

  Scenario: Skipped item does not appear in store view
    Given Carlos has skipped "Shampoo" on the home screen
    When Carlos switches to the store view
    Then "Shampoo" is not visible in any store section

  Scenario: Re-add a skipped staple on the home screen
    Given Carlos has skipped "Butter" in the "Fridge" area
    When Carlos taps "re-add" on "Butter"
    Then "Butter" reappears in the "Fridge" area

  # --- US-08: Area completion and sweep progress ---

  Scenario: Marking an area complete updates the progress bar
    Given Carlos is sweeping the "Bathroom" area
    When Carlos marks "Bathroom" as done
    Then "Bathroom" shows a completion badge
    And the sweep progress bar shows "1 of 5 areas complete"

  Scenario: Navigate to a different area out of order
    Given the suggested next area is "Garage Pantry"
    When Carlos taps "Freezer" instead
    Then the "Freezer" area opens for review
    And sweep progress is unchanged

  Scenario: All areas complete shows whiteboard prompt
    Given Carlos has marked all 5 areas as done
    When Carlos views the sweep screen
    Then "Add from whiteboard" is prominently displayed

  # --- US-09: Type-ahead suggestions in quick-add ---

  Scenario: Typing a prefix shows matching staple suggestions
    Given the quick-add field is active
    When Carlos types "who" in the quick-add field
    Then "Whole milk" appears as a suggestion below the field

  Scenario: Tapping a suggestion fills in all metadata
    Given "Whole milk" appears as a suggestion
    When Carlos taps the "Whole milk" suggestion
    Then "Whole milk" is added to the trip with section "Dairy" and aisle 3

  Scenario: No suggestions shown for unknown items
    Given the staple library does not contain "Birthday candles"
    When Carlos types "birthday" in the quick-add field
    Then no suggestions appear below the field

  Scenario: Clearing the quick-add field hides suggestions
    Given suggestions are visible for "who"
    When Carlos clears the quick-add field
    Then no suggestions are visible

  # --- US-10: Store section navigation and progress ---

  Scenario: Section progress shows checked count per section
    Given Carlos is viewing the store view
    And Carlos has checked off "Whole milk" in "Aisle 3: Dairy"
    Then "Aisle 3: Dairy" shows "1 of 3" progress

  Scenario: Completed section shows a checkmark badge
    Given Carlos has checked all items in "Aisle 5: Canned Goods"
    When Carlos views the store section list
    Then "Aisle 5: Canned Goods" shows a completion checkmark

  Scenario: Last section completed reveals finish trip button
    Given Carlos has checked all items in all store sections
    When Carlos views the store view
    Then "Finish Trip" button is visible

  # --- US-11: Trip summary screen ---

  Scenario: Trip summary displays total and breakdown
    Given Carlos has completed the trip with 5 items purchased and 1 skipped
    When the trip summary screen appears
    Then Carlos sees "5 items purchased"
    And breakdown shows staple and one-off counts

  Scenario: Trip summary shows preparation time
    Given Carlos started the sweep 3 minutes ago
    When the trip summary screen appears
    Then Carlos sees approximately "3 minutes" prep time

  Scenario: Switch to store view from trip summary
    Given the trip summary is displayed
    When Carlos taps "Switch to Store View"
    Then the store view opens with all trip items grouped by aisle
