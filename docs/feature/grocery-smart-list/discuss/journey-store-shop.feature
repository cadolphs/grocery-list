Feature: Store Shop Journey
  As Carlos Rivera, a household grocery planner
  I want to navigate the store aisle-by-aisle with a reliable offline list
  So that I can shop efficiently without backtracking or missing items

  Background:
    Given Carlos Rivera has completed his home sweep with 22 items
    And each item has stored aisle/section metadata
    And the store has numbered aisles (3, 5, 7, 8, 12) and named sections (Deli, Produce, Bakery, Frozen)
    And Carlos is at the store with unreliable Wi-Fi

  # Step 1: Switch to Store View

  Scenario: Manual switch to store view
    Given Carlos is viewing his list in home view (organized by house area)
    When Carlos taps the "Store" toggle
    Then the list reorganizes by aisle/section in store walk order
    And numbered aisles appear first in ascending order
    And named sections (Deli, Produce, Bakery, Frozen) appear after aisles
    And each section shows its item count

  Scenario: Empty aisles are excluded
    Given Carlos has no items assigned to Aisle 1, Aisle 2, or Aisle 4
    When Carlos views the store layout
    Then Aisle 1, Aisle 2, and Aisle 4 do not appear
    And only aisles with items on the current trip are shown

  Scenario: Switch back to home view
    Given Carlos is in store view
    When Carlos taps the "Home" toggle
    Then the list reorganizes by house area
    And no check-off state is lost

  # Step 2: Open Section and Shop

  Scenario: View items in a section
    Given Carlos opens "Aisle 3: Dairy" which has 4 items
    When the section detail screen opens
    Then Carlos sees milk (staple), Greek yogurt (one-off), butter (staple), cheddar cheese (staple)
    And the progress shows "0 of 4"
    And the next section hint shows "Aisle 5: Canned Goods (3 items)"

  Scenario: Non-aisle section shows items correctly
    Given Carlos opens "Deli" which has 2 items
    When the section detail screen opens
    Then Carlos sees deli turkey (one-off) and rotisserie chicken (staple)
    And no aisle number is shown for this section

  # Step 3: Check Off Items

  Scenario: Check off item with no network
    Given Carlos has no network connectivity in the store
    And Carlos is viewing Aisle 3: Dairy with 4 items
    When Carlos taps the checkbox next to "Milk, whole"
    Then milk shows an "IN CART" badge
    And the progress updates to "1 of 4"
    And the check-off is persisted to local storage immediately

  Scenario: Check off multiple items in same section
    Given Carlos is in Aisle 7: Paper and Soap with 3 items
    When Carlos checks off toilet paper, hand soap, and dish soap
    Then all 3 items show "IN CART" badges
    And the progress shows "3 of 3"
    And a completion message says "All items in this section!"

  Scenario: Uncheck item checked by mistake
    Given Carlos checked off "Butter, unsalted" in Aisle 3
    When Carlos taps butter again to uncheck it
    Then butter is unchecked and the "IN CART" badge is removed
    And the progress decreases to reflect the change

  Scenario: Check-off survives app restart
    Given Carlos has checked off 8 items across multiple sections
    And Carlos accidentally closes the app
    When Carlos reopens the app
    Then all 8 items still show as checked
    And the trip state is fully preserved

  # Step 4: Navigate Between Sections

  Scenario: Navigate to next section
    Given Carlos has checked all 4 items in Aisle 3: Dairy
    When Carlos taps "Next: Aisle 5"
    Then Aisle 5: Canned Goods opens with its 3 items
    And Aisle 3 shows a completion badge in the section list

  Scenario: Return to section list
    Given Carlos is viewing Aisle 5: Canned Goods
    When Carlos taps the back button
    Then the section list shows progress for each section
    And completed sections have a checkmark
    And the next incomplete section is highlighted

  # Step 5: Handle Partial Sections

  Scenario: Leave section with unchecked items
    Given Carlos is in Produce with 4 items
    And Carlos has checked bananas, spinach, and tomatoes
    But avocados are not available today
    When Carlos taps "Move on (1 not bought)"
    Then Carlos proceeds to the next section
    And Produce shows "3 of 4" in the section list

  Scenario: All items in a section skipped
    Given Carlos is in Bakery with 1 item (sourdough bread)
    And the bakery is out of sourdough today
    When Carlos taps "Move on (1 not bought)"
    Then Bakery shows "0 of 1" in the section list
    And Carlos moves to the next section

  # Step 6: Complete Trip

  Scenario: Complete trip with all items bought
    Given Carlos has checked all 22 items across all sections
    When Carlos taps "Finish Trip"
    Then the summary shows "22 of 22 items purchased"
    And all purchased staple items are re-queued for the next trip
    And all purchased one-off items are cleared permanently
    And the next trip's staple library is updated

  Scenario: Complete trip with unbought items carried over
    Given Carlos has checked 21 of 22 items
    And "Avocados" (one-off) was not bought
    When Carlos taps "Finish Trip"
    Then the summary shows "21 of 22 items purchased"
    And avocados is listed under "Carrying to next trip"
    And avocados will appear on the next trip's list

  Scenario: Unbought staple carries over
    Given Carlos has checked 20 of 22 items
    And "Cheddar cheese" (staple) was not bought
    When Carlos taps "Finish Trip"
    Then cheddar cheese appears under "Carrying to next trip"
    And cheddar cheese will appear on the next trip as a staple (pre-loaded)

  Scenario: Multiple trips do not duplicate carryover items
    Given avocados was carried over from the previous trip
    And avocados appears on the current trip
    When Carlos finishes the current trip without buying avocados
    Then avocados carries over again (single entry, not duplicated)

  # Error and Edge Cases

  Scenario: Offline sync when network returns
    Given Carlos checked off 15 items while offline
    When Carlos's phone reconnects to the network after leaving the store
    Then all 15 check-offs are synced to cloud storage
    And no data conflicts occur
    And the trip state matches exactly what Carlos saw offline

  @property
  Scenario: Check-off response time
    Given Carlos is shopping in the store
    When Carlos taps any item's checkbox
    Then the visual state change appears within 100 milliseconds
    And the local storage write completes within 500 milliseconds

  @property
  Scenario: Offline data integrity
    Given the app has been offline for the entire shopping trip
    Then all check-offs, section navigation, and trip state are preserved
    And no data is lost regardless of app backgrounding or restart
