Feature: Milestone 2 - Migration and Auto-Append at Section Grain
  As Carlos, a bi-weekly grocery shopper
  I want my upgrade to wipe legacy composite-key orders cleanly
  And new aisle additions inside a known section to leave my walking order alone
  So that my order list stays a true section spine, never bloated by aisle additions

  # --- US-04: Migration wipes legacy composite order ---

  @US-04 @in-memory
  Scenario: Legacy composite-keyed order is wiped on first read
    Given the stored section order contains legacy entries: Inner Aisles::4, Deli::null
    When Carlos's app loads the section order for the first time on the new build
    Then the stored section order is cleared
    And the section order reports as no custom order

  @US-04 @in-memory
  Scenario: Already-migrated section-name order is preserved untouched
    Given the stored section order contains section names: Inner Aisles, Deli
    When Carlos's app loads the section order
    Then the stored section order is unchanged
    And the section order reports as: Inner Aisles, Deli

  @US-04 @in-memory
  Scenario: Mixed legacy and section-name entries are wiped
    Given the stored section order contains: Inner Aisles, Deli::null
    When Carlos's app loads the section order
    Then the stored section order is cleared

  @US-04 @in-memory
  Scenario: Empty stored order needs no migration
    Given the stored section order is an empty list
    When Carlos's app loads the section order
    Then the stored section order is unchanged
    And the section order reports as an empty list

  # --- US-03: Auto-append at section grain ---

  @US-03 @in-memory
  Scenario: New section name appends to the order
    Given the section order is: Inner Aisles, Deli
    And the known section names include: Inner Aisles, Deli, Sushi Bar
    When the app reconciles known sections against the order
    Then the order becomes: Inner Aisles, Deli, Sushi Bar

  @US-03 @in-memory
  Scenario: New aisle inside a known section is a no-op
    Given the section order is: Inner Aisles, Deli
    And every staple's section name is already in the order
    When the app reconciles known sections against the order
    Then the order remains: Inner Aisles, Deli

  @US-03 @in-memory
  Scenario: Multiple new sections append in discovery order
    Given the section order is: Inner Aisles, Deli
    And the known section names include: Inner Aisles, Deli, Bakery, Floral
    When the app reconciles known sections against the order
    Then the order ends with: Inner Aisles, Deli, Bakery, Floral
