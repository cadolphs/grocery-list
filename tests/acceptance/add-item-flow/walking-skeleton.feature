Feature: Walking Skeleton - Add Item Metadata Flow
  As Carlos, a household grocery planner
  I want to add new items with complete metadata via a bottom sheet
  So that items are correctly classified from the start and appear in the right areas

  Background:
    Given Carlos has a staple library with existing items:
      | name       | area   | section | aisle |
      | Whole milk | Fridge | Dairy   | 3     |
    And Carlos has an active trip pre-loaded from the staple library

  # --- WS-AIF-1: New item prompt appears when no staple matches ---

  @walking_skeleton
  Scenario: "Add as new item" row appears when no staple matches
    When Carlos types "Oat milk" in the quick-add input
    Then a suggestion row shows "Add 'Oat milk' as new item..."

  # --- WS-AIF-2: Bottom sheet opens with form fields ---

  @walking_skeleton
  Scenario: Bottom sheet opens with metadata form when row is tapped
    Given Carlos has typed "Oat milk" and sees the new item prompt
    When Carlos taps "Add 'Oat milk' as new item..."
    Then a bottom sheet opens with title "Add 'Oat milk'"
    And the bottom sheet shows fields for type, area, section, and aisle

  # --- WS-AIF-3: Staple saved to library AND added to trip ---

  @walking_skeleton
  Scenario: Submitting as staple saves to library and adds to trip
    Given Carlos has opened the metadata bottom sheet for "Oat milk"
    And Carlos selects type "Staple"
    And Carlos selects area "Fridge"
    And Carlos enters section "Dairy" and aisle 3
    When Carlos taps "Add Item"
    Then "Oat milk" is saved to the staple library with area Fridge, section Dairy, aisle 3
    And "Oat milk" appears on the current trip in the Fridge area
    And the bottom sheet dismisses

  # --- WS-AIF-4: One-off added to trip only ---

  @walking_skeleton
  Scenario: Submitting as one-off adds to trip without saving to library
    Given Carlos has opened the metadata bottom sheet for "Birthday candles"
    And Carlos selects type "One-off"
    And Carlos selects area "Kitchen Cabinets"
    And Carlos enters section "Baking" and aisle 12
    When Carlos taps "Add Item"
    Then "Birthday candles" appears on the current trip
    And "Birthday candles" is NOT in the staple library
    And the bottom sheet dismisses
