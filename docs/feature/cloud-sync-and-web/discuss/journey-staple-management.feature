Feature: Staple Management Across Devices
  As a grocery list user
  I want to manage staples on a web app and shop on my phone
  So I can comfortably organize my staple library and always have it at the store

  # --- Web Management ---

  Scenario: View staple library on web
    Given I have staples saved in the cloud
    When I open the web management app
    Then I see all my staples organized by area and section

  Scenario: Add a staple on web
    Given I am on the web management app
    When I add a new staple "Olive Oil" in area "Pantry" section "Oils & Vinegar"
    Then the staple is saved to the cloud
    And it appears in my staple library immediately

  Scenario: Edit a staple on web
    Given I have a staple "Olive Oil" in section "Oils & Vinegar"
    When I change its section to "Cooking Oils"
    Then the change is saved to the cloud automatically

  Scenario: Delete a staple on web
    Given I have a staple "Olive Oil"
    When I delete it from the web app
    Then it is removed from the cloud
    And it no longer appears in my library

  Scenario: Reorganize sections on web
    Given I have sections "Produce", "Dairy", "Bakery"
    When I reorder them to "Bakery", "Produce", "Dairy"
    Then the new order is saved to the cloud

  # --- Mobile Sync ---

  Scenario: Mobile app loads latest staples from cloud
    Given I added staple "Sourdough" on the web app
    When I open the mobile app
    Then I see "Sourdough" in my staple library

  Scenario: Quick-add staple on mobile syncs to cloud
    Given I am shopping on my phone
    When I quick-add "Tahini" as a new staple
    Then "Tahini" is saved to the cloud
    And it appears on the web app next time I open it

  # --- Offline / Error Handling ---

  Scenario: Mobile works offline at the store
    Given I have staples cached locally on my phone
    And I have no internet connection
    When I open the app and start a trip
    Then I can shop using locally cached staples

  Scenario: Offline changes sync when back online
    Given I quick-added "Tahini" while offline
    When my phone reconnects to the internet
    Then "Tahini" syncs to the cloud

  Scenario: Cloud unavailable degrades gracefully
    Given the cloud backend is unreachable
    When I open the mobile app
    Then I see my locally cached staples
    And I can still shop normally
