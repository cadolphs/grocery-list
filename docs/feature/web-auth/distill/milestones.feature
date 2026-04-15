@in-memory @web-auth
Feature: Milestone scenarios — AuthService, useAuthState, LoginScreen, validation, error mapping
  Expanded coverage beyond the walking skeleton. Scenario names map 1:1 to vitest describe/it titles
  in /web/src/auth/*.test.ts and /web/src/components/LoginScreen.test.tsx.

  # ---------------------------------------------------------------
  # AuthService factory — /web/src/auth/AuthService.test.ts
  # ---------------------------------------------------------------

  @us-01
  Scenario: AuthService factory exposes the expected port
    When I call createAuthService()
    Then the returned service has functions: signIn, signUp, signOut, getCurrentUser, onAuthStateChanged

  @us-01
  Scenario: AuthService sign-in returns a user on success
    Given a NullAuthService seeded with an account for "clemens@example.com"
    When I call signIn("clemens@example.com", "correct-horse-battery")
    Then the result is { success: true, user: { uid: <string>, email: "clemens@example.com" } }

  @us-01 @us-05
  Scenario: AuthService sign-in returns a non-empty error on failure
    Given a NullAuthService configured to reject the next call
    When I call signIn with any credentials
    Then the result is { success: false, error: <non-empty string> }

  @us-01
  Scenario: onAuthStateChanged returns an unsubscribe function
    Given a NullAuthService
    When I register a listener via onAuthStateChanged
    Then I receive a function that, when called, detaches the listener

  @us-01
  Scenario: createNullAuthService mirrors the real factory shape
    When I call createNullAuthService()
    Then the returned service has the same function surface as createAuthService()

  # ---------------------------------------------------------------
  # useAuthState hook — /web/src/auth/useAuthState.test.ts
  # ---------------------------------------------------------------

  @us-01
  Scenario: useAuthState initial render is loading with no user
    Given a NullAuthService that has not yet delivered an auth callback
    When useAuthState is mounted via renderHook
    Then the initial state is { user: null, loading: true }

  @us-01
  Scenario: useAuthState reflects the first auth callback
    Given a NullAuthService seeded to emit a user on subscribe
    When useAuthState mounts
    Then after the effect flushes the state is { user: <that user>, loading: false }

  @us-01
  Scenario: useAuthState unsubscribes on unmount
    Given a NullAuthService tracking subscribe/unsubscribe calls
    When useAuthState is mounted and then unmounted
    Then the unsubscribe function was called exactly once

  @us-02 @us-07
  Scenario: useAuthState re-renders on auth-state changes
    Given a NullAuthService that can push auth state
    When the service emits a user then later emits null
    Then useAuthState observed states are [loading, signed-in, signed-out]

  # ---------------------------------------------------------------
  # LoginScreen — /web/src/components/LoginScreen.test.tsx
  # ---------------------------------------------------------------

  @us-02
  Scenario: LoginScreen renders email, password, and Sign In button
    When I render LoginScreen with signIn and signUp props
    Then I see an email input
    And I see a password input of type "password"
    And I see a "Sign In" button

  @us-02
  Scenario: Submitting valid credentials calls signIn
    Given LoginScreen is rendered with a signIn spy
    When I type "clemens@example.com" and "correct-horse-battery" and click Sign In
    Then signIn is called once with "clemens@example.com" and "correct-horse-battery"

  @us-03
  Scenario: Toggling to Sign Up mode flips the button label and helper text
    Given LoginScreen is rendered in default (Sign In) mode
    When I click the toggle link
    Then the submit button label becomes "Sign Up"
    And the toggle link becomes "Already have an account? Sign In"

  @us-03
  Scenario: Toggle preserves typed email
    Given I have typed "clemens@example.com" in the email field
    When I toggle between Sign In and Sign Up
    Then the email field still contains "clemens@example.com"

  @us-03
  Scenario: Toggle clears prior error message
    Given LoginScreen is showing an error
    When I toggle mode
    Then the error is no longer displayed

  @us-03
  Scenario: Submitting valid Sign Up form calls signUp
    Given LoginScreen is in Sign Up mode with a signUp spy
    When I submit with a new email and an 8+ char password
    Then signUp is called once with those credentials

  @us-04
  Scenario: Empty email is rejected before calling signIn
    Given LoginScreen with signIn/signUp spies
    When I click Sign In with an empty email
    Then signIn is not called
    And an "enter your email" validation message is visible

  @us-04
  Scenario: Invalid email format is rejected before calling signIn
    When I type "not-an-email" and a password and click Sign In
    Then signIn is not called
    And an "enter a valid email address" validation message is visible

  @us-04
  Scenario: Sign Up requires a password of at least 8 characters
    Given LoginScreen is in Sign Up mode
    When I submit a valid email and a 6-character password
    Then signUp is not called
    And a "password must be at least 8 characters" validation message is visible

  @us-04
  Scenario: Sign In mode does not enforce the 8-char minimum
    Given LoginScreen is in Sign In mode
    When I submit a valid email and a 4-character password
    Then signIn is called (Firebase, not the client, rejects short passwords in sign-in mode)

  @us-05
  Scenario: Firebase failure renders the mapped error copy
    Given signIn resolves with { success: false, error: "Firebase: Error (auth/wrong-password)" }
    When I submit the form
    Then the displayed error text corresponds to mapAuthError's "invalid credentials" copy

  @us-06
  Scenario: Submit button shows loading state during the request
    Given signIn returns a pending promise
    When I submit the form
    Then the button label becomes "Signing In..."
    And the button is disabled until the promise resolves

  @us-05 @us-06
  Scenario: Form re-enables after a failure
    Given signIn eventually rejects with an error
    When I submit the form and the rejection settles
    Then the button is re-enabled
    And the error is displayed
    And I can submit again without reloading

  # ---------------------------------------------------------------
  # Pure modules — /web/src/auth/validation.test.ts + error-mapping.test.ts
  # ---------------------------------------------------------------

  @real-io @us-04
  Scenario: validateFormInput rejects empty email in either mode
    When I call validateFormInput("", "password", "signIn")
    Then the result is the "enter your email" error string

  @real-io @us-04
  Scenario: validateFormInput rejects invalid email format
    When I call validateFormInput("not-an-email", "password", "signIn")
    Then the result is the "valid email address" error string

  @real-io @us-04
  Scenario: validateFormInput rejects <8 char password in sign-up mode only
    When I call validateFormInput("a@b.co", "short", "signUp")
    Then the result is the "8 characters" error string
    And the same inputs with mode "signIn" return null

  @real-io @us-04
  Scenario: validateFormInput returns null for valid sign-in inputs
    When I call validateFormInput("a@b.co", "anything", "signIn")
    Then the result is null

  @real-io @us-04
  Scenario: validateFormInput returns null for valid sign-up inputs
    When I call validateFormInput("a@b.co", "longenough", "signUp")
    Then the result is null

  @real-io @us-04
  Scenario: EMAIL_PATTERN accepts common valid addresses
    Then EMAIL_PATTERN matches "a@b.co", "x+tag@example.com", "first.last@sub.example.org"
    And EMAIL_PATTERN rejects "no-at.com", "two@@at.com", "spaces @b.co"

  @real-io @us-05
  Scenario: mapAuthError returns invalid-credentials copy on wrong-password
    When I call mapAuthError(new Error("Firebase: Error (auth/wrong-password)"), "signIn")
    Then the result mentions "invalid" or "incorrect" credentials

  @real-io @us-05
  Scenario: mapAuthError hints at Sign Up for user-not-found in Sign In mode
    When I call mapAuthError(new Error("Firebase: Error (auth/user-not-found)"), "signIn")
    Then the result hints that the user should try signing up

  @real-io @us-05
  Scenario: mapAuthError hints at Sign In on email-already-in-use during Sign Up
    When I call mapAuthError(new Error("Firebase: Error (auth/email-already-in-use)"), "signUp")
    Then the result mentions the email is already in use
    And the result hints that the user should try signing in

  @real-io @us-05
  Scenario: mapAuthError returns a generic fallback for unknown errors
    When I call mapAuthError(new Error("something weird"), "signIn")
    Then the result is a non-empty, user-readable string
    And the result does not contain the Firebase error code verbatim

  @real-io @us-05
  Scenario: mapAuthError handles non-Error values safely
    When I call mapAuthError with a plain string
    And I call mapAuthError with undefined
    Then both calls return a non-empty fallback string without throwing
