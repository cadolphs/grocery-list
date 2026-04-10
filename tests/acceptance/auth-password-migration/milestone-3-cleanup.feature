Feature: Milestone 3 - Remove Email-Link Auth Flow
  As a developer maintaining the grocery list app
  I want the email-link authentication code removed
  So that the codebase is clean and users never encounter broken email-link UI

  Scenario: No email-link UI elements on login screen
    Given a user opens the login screen
    Then the user does not see a "Send Sign-In Link" button
    And the user does not see mention of "sign-in link" or "magic link"

  Scenario: useAuth hook exposes password auth methods
    Given the useAuth hook is initialized with an auth service
    Then the hook exposes signIn and signUp methods
    And the hook does not expose sendSignInLink or handleSignInLink methods

  Scenario: App does not handle auth deep links
    Given the app is running with no authenticated user
    When the app receives a deep link URL
    Then no email-link authentication is attempted
