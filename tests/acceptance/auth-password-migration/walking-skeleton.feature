Feature: Walking Skeleton - Email/Password Authentication
  As Maria, a returning grocery list user
  I want to sign in with my email and password
  So that I can access my grocery lists now that email-link auth is deprecated

  # --- WS-1: Returning user signs in with email and password ---

  @walking_skeleton
  Scenario: Returning user signs in and reaches the grocery list
    Given Maria has an existing account with email "maria.santos@email.com"
    And Maria is on the login screen
    When Maria enters "maria.santos@email.com" as email and "SecureGrocery42!" as password
    And Maria taps "Sign In"
    Then Maria is taken to the grocery list screen

  # --- WS-2: New user signs up and reaches the grocery list ---

  @walking_skeleton
  Scenario: New user signs up and reaches the grocery list
    Given no account exists for "ana.kowalski@email.com"
    And Ana is on the login screen in "Sign Up" mode
    When Ana enters "ana.kowalski@email.com" as email and "FreshVeggies2024!" as password
    And Ana taps "Sign Up"
    Then Ana is taken to the grocery list screen

  # --- WS-3: Login screen shows password field instead of email-link ---

  @walking_skeleton
  Scenario: Login screen displays email and password fields
    Given a user opens the app without being signed in
    When the login screen appears
    Then the user sees an email field
    And the user sees a password field
    And the user sees a "Sign In" button
    And the user does not see a "Send Sign-In Link" button
