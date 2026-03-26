Feature: Walking Skeleton - Custom Store Section Ordering
  As Carlos, a bi-weekly grocery shopper
  I want store sections to match my physical walking path through the store
  So that I can shop without mentally translating between the app order and my actual walk

  Background:
    Given Carlos has no custom section order set

  # --- WS: US-SSO-02 - Store View Uses Custom Section Order ---

  @walking_skeleton
  Scenario: Custom section order overrides default sort in store view
    Given Carlos has trip items in these sections:
      | name            | section       | aisle |
      | Shampoo         | Health & Beauty |     |
      | Deli turkey     | Deli          |       |
      | Whole milk      | Dairy         | 3     |
      | Canned beans    | Canned Goods  | 5     |
      | Bread           | Bakery        |       |
    And Carlos has set his walking order to: Health & Beauty, Deli, Dairy, Canned Goods, Bakery
    When Carlos views the store layout
    Then sections appear in Carlos's walking order:
      | position | section         |
      | 1        | Health & Beauty |
      | 2        | Deli            |
      | 3        | Dairy           |
      | 4        | Canned Goods    |
      | 5        | Bakery          |

  @walking_skeleton
  Scenario: Store view falls back to default order when no custom order exists
    Given Carlos has trip items in Dairy (aisle 3), Canned Goods (aisle 5), and Deli (no aisle)
    And no custom section order has been set
    When Carlos views the store layout
    Then sections appear in default order: Dairy, Canned Goods, Deli

  @walking_skeleton
  Scenario: Sections not in custom order appear at the end
    Given Carlos has set his walking order to: Deli, Dairy
    And Carlos has trip items in Deli, Dairy, and Bakery
    When Carlos views the store layout
    Then Deli appears first
    And Dairy appears second
    And Bakery appears last

  @walking_skeleton
  Scenario: Custom section order persists and loads from storage
    Given Carlos has saved his walking order to: Deli, Dairy, Produce
    When Carlos reopens the app and loads his section order
    Then the stored order is: Deli, Dairy, Produce

  @walking_skeleton
  Scenario: Store view with custom order still hides empty sections
    Given Carlos has set his walking order to: Health & Beauty, Deli, Dairy, Canned Goods, Bakery
    And Carlos has trip items only in Deli and Bakery
    When Carlos views the store layout
    Then only Deli and Bakery are shown
    And they appear in custom order: Deli first, Bakery second

  # --- Error/Edge Cases ---

  Scenario: Custom order with null means use default sort
    Given the stored section order is null
    When Carlos views the store layout with items in Dairy (aisle 3) and Deli (no aisle)
    Then Dairy appears before Deli (default sort)

  Scenario: Empty custom order treated as no custom order
    Given the stored section order is an empty list
    When Carlos views the store layout with items in Dairy (aisle 3) and Deli (no aisle)
    Then Dairy appears before Deli (default sort)
