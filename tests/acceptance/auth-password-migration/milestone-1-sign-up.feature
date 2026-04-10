Feature: Milestone 1 - Sign Up with Email and Password
  As Ana, a new grocery list user
  I want to create an account with email and password
  So that I can start managing my grocery lists

  # --- Happy path ---

  Scenario: New user creates account successfully
    Given Ana is on the login screen in "Sign Up" mode
    When Ana enters "ana.kowalski@email.com" as email and "FreshVeggies2024!" as password
    And Ana taps "Sign Up"
    Then Ana is taken to the grocery list screen

  # --- Mode toggle ---

  Scenario: User switches from Sign In to Sign Up mode
    Given the user is on the login screen in "Sign In" mode
    When the user taps "Don't have an account? Sign Up"
    Then the submit button reads "Sign Up"

  Scenario: User switches from Sign Up to Sign In mode
    Given the user is on the login screen in "Sign Up" mode
    When the user taps "Already have an account? Sign In"
    Then the submit button reads "Sign In"

  Scenario: Email field value persists when switching modes
    Given the user is on the login screen in "Sign In" mode
    And the user has entered "carlos@email.com" as email
    When the user taps "Don't have an account? Sign Up"
    Then the email field still contains "carlos@email.com"

  Scenario: Error message clears when switching modes
    Given the user sees "Incorrect password. Please try again." on the login screen
    When the user taps "Don't have an account? Sign Up"
    Then no error message is displayed

  # --- Loading state ---

  Scenario: Loading indicator shown during sign-up
    Given Ana is on the login screen in "Sign Up" mode
    When Ana enters valid credentials and taps "Sign Up"
    Then Ana sees a loading indicator while account creation is in progress
    And the "Sign Up" button is disabled during loading
