Feature: Milestone 1 - Section-Keyed Grouping (Settings Screen + Store View)
  As Carlos, a bi-weekly grocery shopper
  I want sections (not composite section/aisle pairs) to be the orderable unit
  So that one named zone is one row in settings and one card in the store view

  # --- US-01: Settings screen lists section names only ---

  @US-01 @in-memory
  Scenario: Settings screen shows one row per section regardless of aisle count
    Given Carlos has staples in Inner Aisles at aisles 4, 5, and 7
    And Carlos has staples in Deli with no aisle number
    When Carlos opens Store Section Order settings
    Then the settings list has exactly two rows
    And one row is labeled Inner Aisles
    And one row is labeled Deli
    And no row label contains an aisle number prefix

  # --- US-02: Store view groups by section, aisles ascending inside ---

  @US-02 @in-memory
  Scenario: Null aisle items sort last within a section
    Given Carlos has trip items in Inner Aisles at aisle 4 and Inner Aisles at no aisle
    When Carlos views the store layout
    Then within the Inner Aisles card, the aisle 4 item appears before the no-aisle item

  @US-02 @in-memory
  Scenario: No custom order falls back to alphabetical sections
    Given Carlos has trip items in Produce, Inner Aisles, and Bakery
    And no custom section order has been set
    When Carlos views the store layout
    Then sections appear alphabetically: Bakery, Inner Aisles, Produce

  # --- Edge cases ---

  @US-02 @in-memory
  Scenario: Empty trip yields no section cards
    Given Carlos has no trip items
    When Carlos views the store layout
    Then no section cards appear

  @US-02 @in-memory
  Scenario: All-null aisle items render in a single section card
    Given Carlos has trip items only in Deli with no aisle numbers
    When Carlos views the store layout
    Then exactly one Deli card appears
    And the Deli card contains every Deli item
