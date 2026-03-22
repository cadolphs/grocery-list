Feature: Walking Skeleton - Grocery List UI
  As Carlos, a household grocery planner
  I want a mobile interface that shows my grocery trip organized by location
  So that I can prepare and shop without writing anything down

  Background:
    Given Carlos has staples in the library:
      | name          | area          | section       | aisle |
      | Whole milk    | Fridge        | Dairy         | 3     |
      | Butter        | Fridge        | Dairy         | 3     |
      | Toilet paper  | Bathroom      | Paper Goods   | 8     |
      | Shampoo       | Bathroom      | Personal Care | 7     |
      | Canned beans  | Garage Pantry | Canned Goods  | 5     |
    And Carlos starts a new trip

  # --- UI-WS-1: Home view renders staples grouped by house area ---

  @walking_skeleton
  Scenario: Home view shows staples organized by house area
    When Carlos opens the home screen
    Then Carlos sees the "Fridge" area with "Whole milk" and "Butter"
    And Carlos sees the "Bathroom" area with "Toilet paper" and "Shampoo"
    And Carlos sees the "Garage Pantry" area with "Canned beans"

  # --- UI-WS-2: Quick-add an item from the home screen ---

  @walking_skeleton
  Scenario: Quick-add places a new item on the trip
    When Carlos quick-adds "Greek yogurt" to the trip
    Then "Greek yogurt" appears on the home screen

  # --- UI-WS-3: Toggle from home view to store view ---

  @walking_skeleton
  Scenario: Toggle switches from home view to store view
    Given Carlos is viewing the home screen
    When Carlos taps the store view toggle
    Then the store view is displayed
    And the home view is no longer visible

  # --- UI-WS-4: Store view renders items grouped by aisle ---

  @walking_skeleton
  Scenario: Store view shows items organized by aisle and section
    When Carlos switches to the store view
    Then Carlos sees "Aisle 3: Dairy" with "Whole milk" and "Butter"
    And Carlos sees "Aisle 5: Canned Goods" with "Canned beans"
    And numbered aisles appear before named-only sections

  # --- UI-WS-5: Check off an item in store view ---

  @walking_skeleton
  Scenario: Tapping an item in store view marks it as in the cart
    Given Carlos is viewing the store view
    When Carlos taps "Whole milk" to check it off
    Then "Whole milk" appears as checked off

  # --- UI-WS-6: Trip completion shows summary ---

  @walking_skeleton
  Scenario: Completing the trip shows a summary with carryover
    Given Carlos has checked off "Whole milk" and "Butter"
    And Carlos has not checked off "Canned beans"
    When Carlos finishes the trip
    Then Carlos sees a trip summary showing 2 items purchased
    And the summary indicates "Canned beans" will carry over to the next trip
