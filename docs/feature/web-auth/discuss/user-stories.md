# User Stories — web-auth

All stories trace to journey `web-sign-in` (JTBD skipped — motivation self-evident; mobile already did this migration).

---

## US-01: Port AuthService to the web app

**As** Clemens
**I want** an `AuthService` in `/web/src/auth/` offering `signIn`, `signUp`, `signOut`, `getCurrentUser`, `onAuthStateChanged` over Firebase email+password
**So that** the web UI has a clean API to sign me in and remove the stale email-link hook

**Journey steps**: s3, s4, s5, s6 (everything that touches Firebase Auth)

**Traceability**: Mirrors `src/auth/AuthService.ts` from mobile (introduced 2026-04-10 auth-password-migration).

### Acceptance Criteria

```gherkin
Scenario: AuthService has the expected contract
  Given the AuthService module in /web/src/auth/AuthService.ts
  Then it exports: signIn, signUp, signOut, getCurrentUser, onAuthStateChanged
  And signIn(email, password) resolves to { success: boolean, user?, error? }
  And signUp(email, password) resolves to { success: boolean, user?, error? }
  And onAuthStateChanged(cb) returns an unsubscribe function

Scenario: Stale email-link hook is removed
  Given the web codebase after this feature
  Then /web/src/hooks/useAuth.ts no longer references sendSignInLinkToEmail or signInWithEmailLink
  And no import of firebase/auth link methods remains in /web

Scenario: Successful sign-in returns an AuthUser
  Given a valid Firebase account for test@example.com
  When I call AuthService.signIn("test@example.com", "correct-password")
  Then the result is { success: true, user: { uid, email: "test@example.com" } }

Scenario: Failed sign-in returns an error
  Given no account for nobody@example.com
  When I call AuthService.signIn("nobody@example.com", "whatever")
  Then the result is { success: false, error: <non-empty string> }
```

---

## US-02: Sign-in screen with wired form

**As** Clemens
**I want** a sign-in screen with email + password fields and a Sign In button
**So that** I can authenticate on the web app for the first time

**Journey steps**: s1, s2, s3, s4

### Acceptance Criteria

```gherkin
Scenario: Sign-in screen renders when signed out
  Given no active session
  When I open https://grocery-list-cad.web.app
  Then I see an email input, a password input (masked), and a Sign In button

Scenario: Returning user signs in and sees the dashboard
  Given a Firebase account exists for "clemens@example.com"
  When I enter my email + password and click Sign In
  Then AuthService.signIn is called
  And on success the staples dashboard replaces the form
  And the welcome message shows my email

Scenario: Session persists across reload
  Given I have signed in successfully
  When I reload the tab
  Then the dashboard is shown without the sign-in form reappearing
```

---

## US-03: Sign-up mode on the same screen

**As** Clemens (or any new account)
**I want** to toggle the screen into Sign Up mode
**So that** I can create my account without a separate navigation path

**Journey steps**: s1, s2, s3, s4 under `mode: sign-up`

### Acceptance Criteria

```gherkin
Scenario: Toggle into Sign Up mode
  Given I am on the sign-in screen
  When I click the toggle link "Don't have an account? Sign Up"
  Then the button label becomes "Sign Up"
  And the toggle link becomes "Already have an account? Sign In"

Scenario: Toggle preserves typed email
  Given I have typed "clemens@example.com" in the email field
  When I toggle between Sign In and Sign Up
  Then the email field still contains "clemens@example.com"

Scenario: Toggle clears any prior error
  Given a prior error message is displayed
  When I toggle mode
  Then the error message is cleared

Scenario: New user signs up and lands on the dashboard
  When I toggle to Sign Up and submit a new email + password (>= 8 chars)
  Then AuthService.signUp is called
  And on success the staples dashboard appears
```

---

## US-04: Client-side validation (minimum fields + format + length)

**As** Clemens
**I want** obvious form errors surfaced before a network call
**So that** I don't wait on a Firebase round-trip to learn the email is empty

**Journey step**: s2 (pre-submit)

**Traceability**: Reuses `validateFormInput` logic from mobile `src/ui/LoginScreen.tsx` — same EMAIL_PATTERN, same 8-char min rule for sign-up.

### Acceptance Criteria

```gherkin
Scenario: Empty email
  When I click Sign In with an empty email field
  Then I see "Please enter your email address"
  And no network request is made

Scenario: Invalid email format
  When I enter "not-an-email" and click Sign In
  Then I see "Please enter a valid email address."
  And no network request is made

Scenario: Password too short in sign-up mode
  Given I am in Sign Up mode
  When I enter a valid email and a 6-character password and click Sign Up
  Then I see "Password must be at least 8 characters."
  And no network request is made

Scenario: Sign-in mode does NOT enforce 8-char minimum
  Given I am in Sign In mode
  When I enter a valid email and a 4-character password and click Sign In
  Then AuthService.signIn IS called (Firebase will reject; that path is covered by US-05)
```

---

## US-05: Firebase error mapping

**As** Clemens
**I want** actionable error messages when auth fails server-side
**So that** a wrong password or missing account tells me exactly what to do next

**Journey step**: s3 (on failure)

### Acceptance Criteria

```gherkin
Scenario: Wrong password
  Given a valid account
  When I enter the correct email and a wrong password and click Sign In
  Then I see an error message that clearly indicates invalid credentials

Scenario: Account does not exist (sign-in mode)
  When I enter an email with no Firebase account and click Sign In
  Then the error message hints at toggling to Sign Up

Scenario: Email already in use (sign-up mode)
  Given I am in Sign Up mode
  When I enter an email that already has an account
  Then the error message explains the email is already in use
  And it hints at toggling to Sign In

Scenario: Form re-enables after error
  Given any of the above errors
  Then the Sign In button is re-enabled so I can retry without reloading
```

---

## US-06: Loading state

**As** Clemens
**I want** the Sign In button to show "Signing In..." and disable while the request is in flight
**So that** I don't double-submit and I know the app heard me

**Journey step**: s2 → s3 transition

### Acceptance Criteria

```gherkin
Scenario: Button label during request
  When I click Sign In with valid credentials
  Then the button label changes to "Signing In..."
  And it is disabled until the response returns

Scenario: Sign-up button label
  Given I am in Sign Up mode
  When I click Sign Up
  Then the button label changes to "Signing Up..."
  And it is disabled until the response returns
```

---

## US-07: Sign out

**As** Clemens
**I want** a Sign Out button on the dashboard
**So that** I can end the session explicitly (useful for debugging or shared devices)

**Journey step**: s6

### Acceptance Criteria

```gherkin
Scenario: Sign Out button ends the session
  Given I am on the staples dashboard
  When I click Sign Out
  Then AuthService.signOut is called
  And the sign-in screen replaces the dashboard

Scenario: Signed-out state persists across reload
  Given I have just signed out
  When I reload the tab
  Then I see the sign-in screen (no automatic re-sign-in)
```

---

## Traceability

| Story | Journey steps | Mobile analogue | Effort |
|---|---|---|---|
| US-01 | s3, s4, s5, s6 | `src/auth/AuthService.ts` | ~30 min |
| US-02 | s1, s2, s3, s4 | `src/ui/LoginScreen.tsx` sign-in path | ~1 h |
| US-03 | s1, s2, s3, s4 (sign-up mode) | mobile LoginScreen mode toggle | ~20 min |
| US-04 | s2 (pre-submit) | mobile `validateFormInput` | ~15 min |
| US-05 | s3 failure branch | mobile Firebase error handling | ~30 min |
| US-06 | s2→s3 | mobile `submitLabel` + disabled state | ~15 min |
| US-07 | s6 | mobile `AuthService.signOut` | ~15 min |

Total rough effort: ~3 hours of focused work. Small feature.
