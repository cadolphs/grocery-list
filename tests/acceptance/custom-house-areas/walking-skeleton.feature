Feature: Walking Skeleton - Custom House Areas
  As Carlos, a household grocery planner
  I want house areas to be configurable instead of hardcoded
  So that the app matches my actual home layout and my sister Ana Lucia can set up her own rooms

  Background:
    Given a fresh app installation with default areas: Bathroom, Garage Pantry, Kitchen Cabinets, Fridge, Freezer

  # --- WS-CHA-03: Dynamic Area Consumption (riskiest-first) ---
  # De-risks the cross-cutting type change before building settings UI

  @walking_skeleton
  Scenario: groupByArea returns groups for custom areas
    Given Carlos has configured 6 areas: Bathroom, Garage Pantry, Kitchen Cabinets, Fridge, Freezer, Laundry Room
    And Carlos has staples: detergent in "Laundry Room" and milk in "Fridge"
    When Carlos starts a new sweep
    Then the home view shows 6 area sections
    And "Laundry Room" contains detergent
    And "Fridge" contains milk

  @walking_skeleton
  Scenario: Sweep progress uses dynamic area count
    Given Carlos has 6 configured areas
    When Carlos completes "Bathroom" during a sweep
    Then sweep progress shows 1 of 6 areas complete
    And all-areas-complete triggers only after completing all 6

  @walking_skeleton
  Scenario: Area management persists a new area
    Given Carlos has the 5 default areas
    When Carlos adds "Laundry Room" as a new area
    Then the area list contains 6 areas
    And "Laundry Room" is at the end of the list

  Scenario: New area appears in groupByArea output
    Given Carlos has added "Laundry Room" to his areas
    And Carlos adds "Detergent" as a staple in "Laundry Room"
    When Carlos starts a new sweep
    Then "Laundry Room" appears as a group with "Detergent" pre-loaded

  Scenario: Default areas seeded on fresh install
    Given a brand new app with no prior data
    When the area list is loaded
    Then it contains exactly: Bathroom, Garage Pantry, Kitchen Cabinets, Fridge, Freezer

  # --- WS-CHA-01: View Area List in Settings ---

  Scenario: Settings screen shows all configured areas
    Given Carlos has 6 areas including "Laundry Room"
    When Carlos opens area settings
    Then all 6 areas are displayed in their configured order
    And each area shows editing controls

  Scenario: Fresh install settings shows 5 default areas
    Given Ana Lucia has just installed the app
    When Ana Lucia opens area settings
    Then she sees 5 areas: Bathroom, Garage Pantry, Kitchen Cabinets, Fridge, Freezer

  # --- WS-CHA-02: Add a New Area ---

  Scenario: Add area from settings and it appears in home view
    Given Ana Lucia has the 5 default areas
    When Ana Lucia adds "Laundry Room" from the area settings
    Then "Laundry Room" appears in the home view with 0 staples due
    And sweep progress shows 0 of 6 areas complete

  Scenario: Add staple to newly created area
    Given Ana Lucia has added "Laundry Room"
    When Ana Lucia adds "Detergent" as a staple in "Laundry Room", section "Cleaning", aisle 9
    Then "Detergent" is saved with area "Laundry Room"
    And on the next sweep, "Detergent" appears pre-loaded in "Laundry Room"
