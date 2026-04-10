Feature: Email/Password Authentication
  As a grocery list user
  I want to sign in or sign up with email and password
  So that I can access my grocery lists without relying on email links

  Background:
    Given the app is installed and running

  # --- Sign In (Returning User) ---

  Scenario: Successful sign in with correct credentials
    Given Maria Santos (maria.santos@email.com) has an existing account
    And Maria is on the login screen in "Sign In" mode
    When Maria enters "maria.santos@email.com" as email
    And Maria enters "SecureGrocery42!" as password
    And Maria taps "Sign In"
    Then Maria sees a loading indicator
    And Maria is taken to the grocery list screen
    And Maria's email "maria.santos@email.com" is associated with the session

  Scenario: Sign in with wrong password
    Given Carlos Rivera (carlos.rivera@email.com) has an existing account
    And Carlos is on the login screen in "Sign In" mode
    When Carlos enters "carlos.rivera@email.com" as email
    And Carlos enters "WrongPassword99" as password
    And Carlos taps "Sign In"
    Then Carlos sees the error message "Incorrect password. Please try again."
    And the password field is cleared
    And Carlos remains on the login screen

  Scenario: Sign in with non-existent account
    Given no account exists for "new.person@email.com"
    And the user is on the login screen in "Sign In" mode
    When the user enters "new.person@email.com" as email
    And the user enters "SomePassword1!" as password
    And the user taps "Sign In"
    Then the user sees the error message "No account found with this email. Try signing up instead."

  # --- Sign Up (New User) ---

  Scenario: Successful sign up with valid credentials
    Given no account exists for "ana.kowalski@email.com"
    And Ana Kowalski is on the login screen in "Sign Up" mode
    When Ana enters "ana.kowalski@email.com" as email
    And Ana enters "FreshVeggies2024!" as password
    And Ana taps "Sign Up"
    Then Ana sees a loading indicator
    And Ana is taken to the grocery list screen
    And a new account is created for "ana.kowalski@email.com"

  Scenario: Sign up with weak password
    Given Tomoko Hayashi is on the login screen in "Sign Up" mode
    When Tomoko enters "tomoko.hayashi@email.com" as email
    And Tomoko enters "short" as password
    And Tomoko taps "Sign Up"
    Then Tomoko sees the error message "Password must be at least 8 characters."
    And Tomoko remains on the login screen

  Scenario: Sign up with already existing email
    Given Maria Santos (maria.santos@email.com) has an existing account
    And a new user is on the login screen in "Sign Up" mode
    When the user enters "maria.santos@email.com" as email
    And the user enters "AnotherPassword1!" as password
    And the user taps "Sign Up"
    Then the user sees the error message "An account with this email already exists. Try signing in instead."

  # --- Mode Switching ---

  Scenario: Switch from Sign In to Sign Up
    Given the user is on the login screen in "Sign In" mode
    When the user taps "Don't have an account? Sign Up"
    Then the login screen switches to "Sign Up" mode
    And the submit button reads "Sign Up"

  Scenario: Switch from Sign Up to Sign In
    Given the user is on the login screen in "Sign Up" mode
    When the user taps "Already have an account? Sign In"
    Then the login screen switches to "Sign In" mode
    And the submit button reads "Sign In"

  # --- Input Validation ---

  Scenario: Submit with empty email
    Given the user is on the login screen
    When the user leaves the email field empty
    And the user enters "SomePassword1!" as password
    And the user taps "Sign In"
    Then the user sees the error message "Please enter your email address"

  Scenario: Submit with invalid email format
    Given the user is on the login screen
    When the user enters "not-an-email" as email
    And the user enters "SomePassword1!" as password
    And the user taps "Sign In"
    Then the user sees the error message "Please enter a valid email address."

  # --- Cleanup: Email Link Removal ---

  Scenario: No email link UI elements present
    Given the user is on the login screen
    Then the user does not see a "Send Sign-In Link" button
    And the user does not see any mention of "magic link" or "sign-in link"

  Scenario: Deep link for auth no longer handled
    Given Maria Santos is signed out
    When the app receives a deep link URL
    Then the app does not attempt to authenticate via email link
