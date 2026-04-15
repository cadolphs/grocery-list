@walking_skeleton @in-memory @web-auth
Feature: Walking skeleton — sign in, see dashboard, sign out
  As Clemens
  I want to authenticate on the web app and see my staples
  So that the web companion is usable without resorting to deprecated auth flows

  # Scenarios below map 1:1 to `describe/it` blocks in /web/src/App.test.tsx (rewritten by DELIVER US-01).
  # Test runner: vitest + React Testing Library + jsdom. AuthService is injected as NullAuthService.

  Background:
    Given the web app is running in the browser
    And AuthService is provided by createNullAuthService (no live Firebase)

  @us-01 @us-02
  Scenario: Signed-out user sees the sign-in form
    Given no active session
    When the app mounts and auth has resolved
    Then I see the LoginScreen with email and password fields
    And I do not see the staples dashboard

  @us-02
  Scenario: Successful sign-in reveals the dashboard
    Given no active session
    When I submit valid credentials on the sign-in form
    Then AuthService.signIn is called with my email and password
    And after auth propagates the staples dashboard replaces the form
    And I see a welcome message referencing my email

  @us-01 @us-02
  Scenario: Restored session bypasses the form
    Given AuthService reports an existing user on mount
    When the app first renders
    Then I see the staples dashboard immediately
    And the sign-in form is not rendered at any point

  @us-07
  Scenario: Sign Out returns to the sign-in form
    Given I am on the staples dashboard
    When I click Sign Out
    Then AuthService.signOut is called
    And the sign-in form replaces the dashboard

  @us-01
  Scenario: Auth-resolving state shows a loading placeholder
    Given AuthService has not yet delivered an initial auth state
    When the app first renders
    Then I see a loading indicator
    And I do not see the LoginScreen or the dashboard
