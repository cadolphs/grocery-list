Feature: Reorder Home Areas
  # Platform: mobile (React Native) + web (Expo)
  # Persona: Carlos Rivera
  # Job traceability: JS1 (Home Sweep Capture)
  # Completes: US-CHA-06 from custom-house-areas (domain shipped; this is the UI half)
  # Key heuristics: visibility of system status (Nielsen 1), user control and freedom (Nielsen 3), error prevention (Nielsen 5)

  Background:
    Given Carlos Rivera has 5 configured house areas: Bathroom, Kitchen Cabinets, Fridge, Laundry Room, Freezer
    And Carlos has staples assigned across these areas
    And Carlos's walking path recently changed so he now passes Laundry Room first

  Scenario: Carlos reorders his areas to match his new walking path
    Given Carlos is viewing the HomeView
    When Carlos taps the settings gear icon
    And Carlos taps the up-arrow on "Laundry Room" three times on the Manage Areas screen
    Then the Manage Areas list shows the order: Laundry Room, Bathroom, Kitchen Cabinets, Fridge, Freezer
    And a "Saved" confirmation appears after each tap
    And when Carlos returns to HomeView the areas appear in the new order
    And the staple check-off counts for each area are unchanged

  Scenario: Reorder persists across app restart and syncs to a second device
    Given Carlos has reordered his areas to Laundry Room, Bathroom, Kitchen Cabinets, Fridge, Freezer on his phone
    When Carlos closes and reopens the app on his phone
    Then the HomeView still shows areas in the order: Laundry Room, Bathroom, Kitchen Cabinets, Fridge, Freezer
    And when Carlos opens the app on a second device signed into the same account within 5 seconds of the reorder
    Then the second device's HomeView also shows areas in the new order
    And no manual refresh was required on the second device

  Scenario: Up-arrow on the top area is not interactive
    Given Carlos is on the Manage Areas screen
    And the current order starts with Bathroom at position 1
    When Carlos looks at the up-arrow button on Bathroom
    Then the up-arrow on Bathroom is visually disabled
    And tapping it produces no change to the list

  Scenario: Down-arrow on the bottom area is not interactive
    Given Carlos is on the Manage Areas screen
    And the current order ends with Freezer at the last position
    When Carlos looks at the down-arrow button on Freezer
    Then the down-arrow on Freezer is visually disabled
    And tapping it produces no change to the list
