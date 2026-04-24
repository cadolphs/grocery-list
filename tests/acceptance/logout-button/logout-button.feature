Feature: Sign Out from the Authenticated App Shell
  As Maria, an authenticated user on a shared device
  I want a visible Sign Out control
  So that I can end my session and return to the login screen with confidence

  Background:
    Given Maria Santos (maria.santos@email.com) is signed in to the grocery list app
    And Maria is viewing the authenticated app shell

  # --- WS-1: Walking skeleton — Maria signs out and lands on the login screen ---

  @walking_skeleton @driving_port @US-01
  Scenario: Maria signs out and returns to the login screen
    Given a labeled "Sign out" control is visible to Maria in the app shell
    When Maria taps "Sign out"
    Then Maria sees the login screen with empty email and password fields
    And no authenticated content (trip, staples, view toggle) remains visible to Maria

  # --- UAT-1: Visibility and accessibility of the Sign Out control ---

  @US-01 @accessibility
  Scenario: Authenticated user sees an accessible Sign Out control
    When the app shell is presented to Maria
    Then Maria sees a control labeled "Sign out" in the app shell
    And the control exposes the accessibility label "Sign out"
    And the control is reachable as an interactive element

  # --- UAT-2: Tapping Sign Out ends the session (happy path behavior) ---

  @US-01 @driving_port
  Scenario: Tapping Sign Out ends Maria's session
    When Maria taps "Sign out"
    Then Maria is no longer recognised as a signed-in user by the app
    And the app surfaces the login screen to Maria

  # --- UAT-3: Listener cleanup invariant (ADR-008) ---

  @US-01 @listener-lifecycle @ADR-008
  Scenario: Signing out releases all per-user data subscriptions
    Given the authenticated shell has opened data subscriptions for staples, areas, section order, and trip
    When Maria taps "Sign out"
    Then each of the four data subscriptions is released exactly once
    And no stale data subscription remains active for Maria's prior session

  # --- UAT-4: Network-failure error path (documented but deferred for v1) ---
  # NOTE: The DESIGN wave (AppShell prop) deliberately does NOT own error UI in v1.
  # The null auth service does not reject signOut, so this scenario is marked pending
  # to be revisited once the error-surface component is added.

  @US-01 @error-path @pending
  Scenario: Sign Out fails due to a network error and Maria can retry
    Given Maria is signed in on a flaky network
    When Maria taps "Sign out"
    And the auth service reports a network failure
    Then Maria remains on the authenticated shell
    And Maria sees a dismissible message reading "Could not sign out. Check your connection and try again."
    And the Sign out control remains available so Maria can try again
    And no raw error code or stack trace is shown to Maria

  # --- UAT-5: Rapid double-tap is coalesced into a single sign-out ---

  @US-01 @edge-case
  Scenario: Rapid double-tap does not produce duplicate sign-out calls
    When Maria taps "Sign out" twice within 200 milliseconds
    Then the auth service receives the sign-out request at most once
    And Maria reaches the login screen within the normal time
