Feature: Store Section Custom Ordering
  As Carlos Rivera, a bi-weekly grocery shopper
  I want to define the order sections appear in the store view
  So that the list matches my physical walking path through the store

  Background:
    Given Carlos has the following staple items:
      | name             | section          | aisleNumber |
      | Whole milk       | Dairy            | 3           |
      | Butter           | Dairy            | 3           |
      | Canned tomatoes  | Canned Goods     | 5           |
      | Paper towels     | Paper & Soap     | 7           |
      | Shampoo          | Health & Beauty  | 8           |
      | Hand soap        | Health & Beauty  | 8           |
      | Baking soda      | Baking           | 12          |
      | Rotisserie chicken | Deli           |             |
      | Sliced turkey    | Deli             |             |
      | Bananas          | Produce          |             |
      | Spinach          | Produce          |             |
      | Sourdough loaf   | Bakery           |             |
      | Frozen peas      | Frozen           |             |

  # Step 1: Default order when no custom order exists

  Scenario: Store view shows default section order
    Given no custom section order has been defined
    When Carlos opens the store view
    Then sections appear in this order:
      | section                      |
      | Aisle 3: Dairy               |
      | Aisle 5: Canned Goods        |
      | Aisle 7: Paper & Soap        |
      | Aisle 8: Health & Beauty     |
      | Aisle 12: Baking             |
      | Bakery                       |
      | Deli                         |
      | Frozen                       |
      | Produce                      |

  # Step 2: Store layout settings shows all known sections

  Scenario: Store layout settings lists all sections
    Given Carlos opens Store Layout Settings
    Then all 9 sections are listed with drag handles
    And the instruction text reads "Drag sections to match your walking order through the store."
    And a "Reset to Default Order" button is visible

  # Step 3: Reorder sections

  Scenario: Reorder sections by drag-and-drop
    Given Carlos is on the Store Layout Settings screen
    And sections are in default order
    When Carlos drags "Deli" from position 7 to position 2
    Then the section list shows:
      | position | section              |
      | 1        | Aisle 3: Dairy       |
      | 2        | Deli                 |
      | 3        | Aisle 5: Canned Goods|
    And the order is persisted to local storage automatically

  Scenario: Reorder multiple sections to match walking path
    Given Carlos is on the Store Layout Settings screen
    When Carlos arranges sections in this order:
      | section                      |
      | Aisle 8: Health & Beauty     |
      | Deli                         |
      | Aisle 3: Dairy               |
      | Aisle 5: Canned Goods        |
      | Aisle 7: Paper & Soap        |
      | Aisle 12: Baking             |
      | Bakery                       |
      | Frozen                       |
      | Produce                      |
    Then the custom order is saved
    And Carlos sees "Order saved automatically"

  # Step 4: Store view uses custom order

  Scenario: Store view respects custom section order
    Given Carlos has set custom section order:
      | position | section              |
      | 1        | Aisle 8: Health & Beauty     |
      | 2        | Deli                         |
      | 3        | Aisle 3: Dairy               |
      | 4        | Aisle 5: Canned Goods        |
      | 5        | Aisle 7: Paper & Soap        |
      | 6        | Aisle 12: Baking             |
      | 7        | Bakery                       |
      | 8        | Frozen                       |
      | 9        | Produce                      |
    When Carlos opens the store view
    Then sections appear in the custom order
    And only sections with items on the current trip are shown

  Scenario: Empty sections hidden even with custom order
    Given Carlos has a custom section order with 9 sections
    And the current trip has items only in Dairy, Deli, and Produce
    When Carlos opens the store view
    Then only 3 sections are shown: Deli, Dairy, Produce
    And they appear in custom order (Deli before Dairy before Produce)

  # Step 5: Navigation follows custom order

  Scenario: Next section follows custom order
    Given Carlos has custom order starting with Health & Beauty, then Deli
    And Carlos has completed all items in Health & Beauty
    When Carlos taps "Next"
    Then the Deli section opens
    And the "Next" hint showed "Next: Deli (2 items)"

  Scenario: Next section skips sections with no items
    Given Carlos has custom order: Health & Beauty, Deli, Dairy, Produce
    And Carlos has no items in Deli on this trip
    And Carlos has completed Health & Beauty
    When Carlos taps "Next"
    Then Dairy opens (skipping Deli which has no items)

  # Step 6: New section auto-appends

  Scenario: New section from item metadata appends to end
    Given Carlos has a custom section order with 9 sections
    When Carlos adds "Sushi rolls" as a one-off with section "Sushi Bar"
    Then "Sushi Bar" is appended at position 10 in the section order
    And in Store Layout Settings, "Sushi Bar" appears at the bottom

  Scenario: New section appears in store view at end
    Given Carlos has custom order ending with Produce
    And Carlos adds an item in section "Sushi Bar" (not in custom order)
    When Carlos opens the store view
    Then "Sushi Bar" appears after Produce

  # Step 7: Reset to default

  Scenario: Reset custom order to default
    Given Carlos has a custom section order
    When Carlos taps "Reset to Default Order"
    Then a confirmation dialog appears
    And the dialog explains "numbered aisles first (ascending), then named sections alphabetically"

  Scenario: Confirm reset clears custom order
    Given Carlos is viewing the reset confirmation dialog
    When Carlos taps "Reset"
    Then sections return to default order
    And the custom section order is removed from storage
    And the store view reverts to default sort

  Scenario: Cancel reset preserves custom order
    Given Carlos is viewing the reset confirmation dialog
    When Carlos taps "Cancel"
    Then the custom section order is unchanged

  # Edge cases

  Scenario: Section order persists across app restart
    Given Carlos has set a custom section order
    And Carlos closes and reopens the app
    When Carlos opens the store view
    Then sections appear in the custom order

  Scenario: Section removed when no items reference it
    Given Carlos has custom order including "Sushi Bar"
    And Carlos removes the only item in "Sushi Bar"
    When Carlos opens Store Layout Settings
    Then "Sushi Bar" still appears in the section order
    And Carlos can leave it or manually note it is unused
