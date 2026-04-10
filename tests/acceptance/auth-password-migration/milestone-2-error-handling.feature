Feature: Milestone 2 - Error Handling for Authentication
  As a grocery list user
  I want clear error messages when authentication fails
  So that I know what went wrong and how to fix it

  # --- Sign In errors ---

  Scenario: Wrong password shows actionable error
    Given Carlos has an existing account with email "carlos.rivera@email.com"
    And Carlos is on the login screen in "Sign In" mode
    When Carlos enters "carlos.rivera@email.com" as email and "WrongPassword99" as password
    And Carlos taps "Sign In"
    Then Carlos sees "Incorrect password. Please try again."
    And Carlos remains on the login screen

  Scenario: Non-existent account suggests signing up
    Given no account exists for "new.person@email.com"
    When the user enters "new.person@email.com" as email and "SomePassword1!" as password on the sign-in form
    And the user taps "Sign In"
    Then the user sees "No account found with this email. Try signing up instead."

  # --- Sign Up errors ---

  Scenario: Password shorter than 8 characters is rejected
    Given Tomoko is on the login screen in "Sign Up" mode
    When Tomoko enters "tomoko.hayashi@email.com" as email and "short" as password
    And Tomoko taps "Sign Up"
    Then Tomoko sees "Password must be at least 8 characters."
    And Tomoko remains on the login screen

  Scenario: Existing email address is rejected on sign-up
    Given Maria Santos already has an account with "maria.santos@email.com"
    And a user is on the login screen in "Sign Up" mode
    When the user enters "maria.santos@email.com" as email and "AnotherPassword1!" as password
    And the user taps "Sign Up"
    Then the user sees "An account with this email already exists. Try signing in instead."

  # --- Input validation errors ---

  Scenario: Empty email shows validation error on sign-in
    Given the user is on the login screen in "Sign In" mode
    And the email field is empty
    When the user taps "Sign In"
    Then the user sees "Please enter your email address"

  Scenario: Empty email shows validation error on sign-up
    Given the user is on the login screen in "Sign Up" mode
    And the email field is empty
    When the user taps "Sign Up"
    Then the user sees "Please enter your email address"

  Scenario: Invalid email format shows validation error
    Given the user is on the login screen
    When the user enters "not-an-email" as email and "ValidPassword1!" as password
    And the user taps "Sign In"
    Then the user sees "Please enter a valid email address."

  # --- Loading state behavior ---

  Scenario: Sign In button disabled while authentication is in progress
    Given the user is on the login screen in "Sign In" mode
    When the user submits valid credentials
    Then the "Sign In" button is disabled while authentication is in progress
