Feature: Home Sweep Journey
  As Carlos Rivera, a household grocery planner
  I want to capture needed items room-by-room during my bi-weekly walk-through
  So that I have a complete shopping list in under 5 minutes without manual consolidation

  Background:
    Given Carlos Rivera maintains a staple library with 21 items across 5 house areas
    And the house areas are Bathroom, Garage Pantry, Kitchen Cabinets, Fridge, and Freezer
    And Carlos's wife Elena uses the physical whiteboard for mid-week additions

  # Step 1: Open App and Start Sweep

  Scenario: Pre-loaded staples shown on sweep start
    Given Carlos has 21 items marked as staples across 5 house areas
    When Carlos opens the app to start a new sweep
    Then the app shows 5 house areas each with their staple count
    And the total reads "21 staples pre-loaded"
    And each area is shown as "not yet swept"

  Scenario: Staples from previous trip auto-populate
    Given Carlos bought toilet paper on the last trip and it is a staple
    When Carlos starts a new sweep 2 weeks later
    Then toilet paper appears pre-loaded in the Bathroom area
    And it is marked as "needed" by default

  # Step 2: Select Area and Review Staples

  Scenario: Area shows pre-loaded staples with metadata
    Given Carlos selects "Bathroom" which has 3 staple items
    When the area detail screen opens
    Then Carlos sees toilet paper (Aisle 7), hand soap (Aisle 7), shampoo (Aisle 8)
    And all staples are pre-checked as "needed this trip"
    And the area shows "1 of 5" progress

  Scenario: Uncheck a staple not needed this trip
    Given Carlos is reviewing Bathroom staples
    And shampoo is pre-checked as "needed"
    When Carlos unchecks shampoo
    Then shampoo is removed from this trip's list
    And shampoo remains in the staple library for next trip
    And the Bathroom item count decreases by 1

  # Step 3: Add Items During Sweep

  Scenario: Add known staple by type-ahead suggestion
    Given Carlos is in the Bathroom area during his walk-through
    When Carlos types "cotton sw" in the quick-add field
    Then the suggestion "Cotton swabs - Aisle 8" appears
    When Carlos taps the suggestion
    Then cotton swabs is added to the Bathroom area as a staple
    And its aisle is set to Aisle 8 automatically

  Scenario: Add new item as one-off
    Given Carlos is in the Kitchen Cabinets area
    When Carlos types "birthday candles" with no matching staple
    And Carlos selects "Add as one-off"
    And Carlos assigns it to Baking section, Aisle 12
    Then birthday candles appears in Kitchen Cabinets
    And it is marked as a one-off item
    And it will not appear on future trips after purchase

  Scenario: Add new item as staple
    Given Carlos is in the Fridge area
    When Carlos types "oat milk" with no matching staple
    And Carlos selects "Add as staple"
    And Carlos assigns it to Dairy section, Aisle 3
    Then oat milk appears in the Fridge area
    And oat milk is added to the staple library permanently
    And it will auto-populate on future trips

  # Step 4: Navigate Between Areas

  Scenario: Complete an area and move to next
    Given Carlos has reviewed all items in Bathroom with 3 items captured
    When Carlos taps "Done with Bathroom"
    Then the sweep progress shows Bathroom as complete with 3 items
    And Garage Pantry is highlighted as the next area
    And the progress reads "1 of 5 areas complete"

  Scenario: Skip an area with no changes needed
    Given Carlos is at the Freezer area during his walk-through
    And all 2 staples are pre-loaded and correct
    When Carlos taps "Done with Freezer" without changes
    Then Freezer is marked complete with 2 items
    And Carlos is returned to the sweep progress screen

  # Step 5: Consolidate from Whiteboard

  Scenario: Add known item from whiteboard
    Given Carlos has completed the physical sweep
    And the whiteboard has "Greek yogurt" written by Elena
    When Carlos taps "Add from whiteboard" and types "greek yo"
    Then the suggestion "Greek yogurt - Dairy / Aisle 3" appears
    When Carlos taps the suggestion
    Then Greek yogurt is added to the trip list

  Scenario: Add unknown item from whiteboard
    Given Carlos is on the whiteboard consolidation screen
    And the whiteboard has "Deli turkey" written by Elena
    When Carlos types "deli turkey" with no matching suggestion
    And Carlos assigns it to Deli section with no aisle number
    Then deli turkey is added as a one-off item
    And it appears in the Deli section in store view

  Scenario: Skip whiteboard consolidation when whiteboard is empty
    Given Carlos has completed the physical sweep
    And there are no items on the whiteboard this week
    When Carlos taps "Done with whiteboard"
    Then Carlos proceeds directly to the trip review screen

  # Step 6: Review Complete List

  Scenario: Review complete list before trip
    Given Carlos has completed the sweep with 19 items
    And Carlos has added 3 items from the whiteboard
    When Carlos views the trip summary
    Then the list shows 22 total items
    And the breakdown shows 17 staples and 5 one-offs
    And the breakdown shows 19 from sweep and 3 from whiteboard
    And a "Switch to Store View" button is available

  Scenario: Prep time is under target
    Given Carlos started the sweep 4 minutes ago
    When Carlos completes the trip review
    Then the prep time shows approximately 4 minutes
    And this is under the 5-minute target

  # Error and Edge Cases

  Scenario: App works offline during sweep
    Given Carlos has no network connectivity at home
    When Carlos completes a full sweep adding 5 new items
    Then all items are saved to local storage
    And no error messages appear
    And the list is fully functional without network

  Scenario: Duplicate item prevented
    Given Carlos has already added "toilet paper" as a staple in Bathroom
    When Carlos tries to add "toilet paper" again in the same area
    Then the app shows "Toilet paper is already on your list"
    And no duplicate is created
