Feature: Walking Skeleton - Section-Keyed Store Ordering
  As Carlos, a bi-weekly grocery shopper
  I want store sections (not aisle numbers) to be the unit of order
  So that one named zone like Inner Aisles renders as a single card I walk through once

  Background:
    Given Carlos has staples and trip items keyed by section name

  # --- WS: US-01 + US-02 + US-03 combined riskiest path ---
  # The refactor changes three coupled contracts in one slice. The walking
  # skeleton exercises all three together: section-keyed grouping, intra-section
  # aisle-ascending sort, and custom-order applied at section grain.

  @walking_skeleton @in-memory @US-01 @US-02
  Scenario: Carlos opens the store view and sees one card per section with custom order applied
    Given Carlos has trip items in these sections:
      | name         | section       | aisle |
      | Bread        | Inner Aisles  | 4     |
      | Pasta        | Inner Aisles  | 5     |
      | Soap         | Inner Aisles  | 7     |
      | Apple        | Produce       |       |
    And Carlos has set his walking order to: Produce, Inner Aisles
    When Carlos views the store layout
    Then exactly two section cards appear
    And the first card is Produce
    And the second card is Inner Aisles
    And the Inner Aisles card contains items in aisle order: Bread, Pasta, Soap
