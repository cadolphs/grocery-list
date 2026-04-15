Feature: Sign in to the web app with email and password
  As Clemens
  I want to sign in to the web app with the same email + password I use on mobile
  So that I can use the grocery list on my laptop without being stuck on a deprecated auth flow

  Background:
    Given the web app is deployed at https://grocery-list-cad.web.app
    And Firebase Auth email/password provider is enabled for project grocery-list-cad
    And grocery-list-cad.web.app is listed in Firebase Auth authorized domains

  # Walking skeleton -- sign-in happy path

  Scenario: Returning user signs in and sees the dashboard
    Given I am on the sign-in screen with no active session
    And an account exists for "clemens@example.com" with password "correct-horse-battery"
    When I enter "clemens@example.com" and "correct-horse-battery" and click Sign In
    Then I see "Signing In..." while the request is in flight
    And after auth succeeds the staples dashboard appears
    And the welcome message shows my email

  Scenario: Session persists across reload
    Given I have just signed in successfully
    When I reload the tab
    Then I see the staples dashboard without any sign-in form

  # Sign-up mode

  Scenario: New user signs up from the same screen
    Given I am on the sign-in screen
    When I click "Don't have an account? Sign Up"
    Then the button label becomes "Sign Up"
    And the helper text updates to reflect sign-up mode
    When I enter a new email and a password of at least 8 characters and click Sign Up
    Then an account is created
    And the staples dashboard appears

  Scenario: Switching modes preserves the typed email
    Given I have typed "clemens@example.com" in the email field
    When I toggle between Sign In and Sign Up
    Then the email field still contains "clemens@example.com"

  # Error paths

  Scenario: Wrong password shows an actionable error
    Given I am on the sign-in screen
    When I enter a valid email and an incorrect password and click Sign In
    Then I see an error message explaining the credentials were invalid
    And the form re-enables so I can retry

  Scenario: Non-existent account hints at signing up
    Given I am on the sign-in screen
    When I enter an email with no Firebase account and a password and click Sign In
    Then the error message hints at toggling to Sign Up

  Scenario: Duplicate email on sign-up hints at signing in
    Given I am in sign-up mode
    When I enter an email that already has an account and click Sign Up
    Then the error message explains the email is already in use
    And the message hints at toggling to Sign In

  Scenario: Weak password rejected on sign-up before network call
    Given I am in sign-up mode
    When I enter a valid email and a password shorter than 8 characters and click Sign Up
    Then I see "Password must be at least 8 characters."
    And no Firebase network request is made

  Scenario: Empty email rejected before network call
    Given I am on the sign-in screen with an empty email field
    When I click Sign In
    Then I see "Please enter your email address"
    And no Firebase network request is made

  Scenario: Invalid email format rejected before network call
    Given I am on the sign-in screen
    When I enter "not-an-email" and a password and click Sign In
    Then I see "Please enter a valid email address."
    And no Firebase network request is made

  Scenario: Submit button disabled while auth is in flight
    Given I have entered valid credentials
    When I click Sign In
    Then the Sign In button is disabled until the response returns

  # Sign out

  Scenario: Sign out returns to the sign-in screen
    Given I am on the staples dashboard
    When I click Sign Out
    Then I am back on the sign-in screen
    And reloading the tab keeps me on the sign-in screen
