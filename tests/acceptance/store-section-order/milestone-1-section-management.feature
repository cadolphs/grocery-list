Feature: Milestone 1 - Section Management, Navigation, and Reset
  As Carlos, a bi-weekly grocery shopper
  I want new sections to auto-append, navigation to follow my custom order, and the ability to reset
  So that my store layout stays accurate as my shopping evolves

  # --- US-SSO-04: New Section Auto-Appends ---

  Scenario: New section auto-appends to end of custom order
    Given Carlos has a custom order of: Deli, Dairy, Canned Goods
    And Carlos adds "Sushi rolls" in section "Sushi Bar" (not in the current order)
    When the app detects sections not in the custom order
    Then the custom order becomes: Deli, Dairy, Canned Goods, Sushi Bar

  Scenario: Multiple new sections auto-append in discovery order
    Given Carlos has a custom order of: Deli, Dairy
    And Carlos has items in Deli, Dairy, Bakery, and Floral
    When the app detects sections not in the custom order
    Then Bakery and Floral are appended to the custom order
    And the order ends with: Deli, Dairy, Bakery, Floral

  Scenario: No change when all sections already in custom order
    Given Carlos has a custom order of: Deli, Dairy, Bakery
    And Carlos has items only in Deli and Dairy
    When the app checks for new sections
    Then the custom order remains: Deli, Dairy, Bakery

  Scenario: Auto-append does not create duplicates
    Given Carlos has a custom order of: Deli, Dairy, Bakery
    And Carlos adds another item in the Dairy section
    When the app detects sections not in the custom order
    Then the custom order still has exactly one Dairy entry

  # --- US-SSO-05: Reset Section Order ---

  Scenario: Reset clears custom order and reverts to default sort
    Given Carlos has a custom order of: Deli, Dairy, Canned Goods
    When Carlos resets the section order to default
    Then the stored section order is null
    And the store view uses default sort: numbered aisles ascending, then named sections alphabetically

  Scenario: After reset, Carlos can create a new custom order
    Given Carlos has reset his section order to default
    When Carlos sets a new walking order to: Bakery, Produce, Dairy
    Then the stored order is: Bakery, Produce, Dairy
    And the store view uses the new custom order

  # --- US-SSO-03: Section Navigation Follows Custom Order ---

  Scenario: Next section follows custom order
    Given Carlos has custom order: Deli, Dairy, Canned Goods, Produce
    And Carlos has items in all 4 sections
    And the sorted store sections are in custom order
    When Carlos finishes the Deli section
    Then the next section is Dairy

  Scenario: Next section skips empty sections in custom order
    Given Carlos has custom order: Deli, Dairy, Canned Goods, Produce
    And Carlos has items in Deli, Canned Goods, and Produce (none in Dairy)
    And the sorted store sections are in custom order
    When Carlos finishes the Deli section
    Then the next section is Canned Goods (Dairy is skipped because it has no items)

  Scenario: No next section after the last section
    Given Carlos has custom order: Deli, Dairy, Produce
    And Carlos has items in all 3 sections
    And the sorted store sections are in custom order
    When Carlos finishes the Produce section (last in order)
    Then there is no next section

  # --- Error/Boundary Cases ---

  Scenario: Auto-append with null order has no effect
    Given no custom section order has been set
    When the app detects new sections from trip items
    Then no auto-append occurs
    And the section order remains null

  Scenario: Reset when no custom order exists is a no-op
    Given no custom section order has been set
    When Carlos resets the section order to default
    Then the stored section order is still null
