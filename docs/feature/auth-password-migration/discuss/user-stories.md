<!-- markdownlint-disable MD024 -->

## US-01: Sign In with Email and Password

### Problem

Maria Santos is a returning grocery list user who relies on the app for weekly shopping. She finds it impossible to sign in because the email-link flow depends on Firebase Dynamic Links, which is being deprecated. She needs a way to authenticate that actually works.

### Who

- Returning user | Has existing account | Wants quick access to grocery lists

### Solution

Replace the "Send Sign-In Link" flow with an email and password form that calls the existing AuthService.signIn() method.

### Domain Examples

#### 1: Happy Path -- Maria signs in successfully

Maria Santos (maria.santos@email.com) opens the app, sees the login screen with email and password fields, enters her credentials, taps "Sign In", and is taken to her grocery list within 2 seconds.

#### 2: Wrong Password -- Maria misremembers her password

Maria Santos enters "maria.santos@email.com" and "OldPassword1" (incorrect). She sees "Incorrect password. Please try again." She re-enters the correct password and signs in successfully.

#### 3: Network Error -- Maria is on spotty Wi-Fi

Maria Santos enters valid credentials and taps "Sign In" but has no network connectivity. She sees "Unable to connect. Please check your internet connection and try again." She moves to better Wi-Fi and retries.

### UAT Scenarios (BDD)

#### Scenario: Successful sign in

Given Maria Santos (maria.santos@email.com) has an existing account
And Maria is on the login screen in "Sign In" mode
When Maria enters "maria.santos@email.com" as email and "SecureGrocery42!" as password
And Maria taps "Sign In"
Then Maria sees a loading indicator
And Maria is taken to the grocery list screen

#### Scenario: Wrong password

Given Carlos Rivera (carlos.rivera@email.com) has an existing account
And Carlos is on the login screen in "Sign In" mode
When Carlos enters "carlos.rivera@email.com" as email and "WrongPassword99" as password
And Carlos taps "Sign In"
Then Carlos sees "Incorrect password. Please try again."
And Carlos remains on the login screen

#### Scenario: Non-existent account

Given no account exists for "new.person@email.com"
When the user enters "new.person@email.com" and "SomePassword1!" and taps "Sign In"
Then the user sees "No account found with this email. Try signing up instead."

### Acceptance Criteria

- [ ] Login screen displays email and password fields with "Sign In" button
- [ ] Successful sign-in navigates to the grocery list screen
- [ ] Wrong password shows actionable error message without navigating away
- [ ] Non-existent account suggests switching to Sign Up

### Outcome KPIs

- **Who**: Returning users with existing accounts
- **Does what**: Sign in successfully on first attempt
- **By how much**: >= 90% first-attempt success rate
- **Measured by**: Firebase Auth sign-in events
- **Baseline**: 0% (email-link flow is breaking)

### Technical Notes

- AuthService.signIn(email, password) already implemented -- wire to UI
- useAuth hook needs to expose signIn method
- LoginScreen props change from sendSignInLink to signIn/signUp

---

## US-02: Sign Up with Email and Password

### Problem

Ana Kowalski is a new user who heard about the grocery list app from a friend. She finds there is no way to create an account because the email-link flow is broken. She needs a straightforward sign-up experience.

### Who

- New user | No existing account | Wants to start using the app

### Solution

Add a "Sign Up" mode to the login screen that calls AuthService.signUp() with email and password.

### Domain Examples

#### 1: Happy Path -- Ana creates an account

Ana Kowalski (ana.kowalski@email.com) opens the app, switches to "Sign Up" mode, enters her email and a strong password "FreshVeggies2024!", taps "Sign Up", and is taken to an empty grocery list.

#### 2: Weak Password -- Ana tries a short password

Ana enters "ana.kowalski@email.com" and "short". She sees "Password must be at least 8 characters." She enters a longer password and succeeds.

#### 3: Account Already Exists -- Ana's friend already signed up with that email

Ana enters "maria.santos@email.com" (already registered). She sees "An account with this email already exists. Try signing in instead." She switches to Sign In mode.

### UAT Scenarios (BDD)

#### Scenario: Successful sign up

Given no account exists for "ana.kowalski@email.com"
And Ana Kowalski is on the login screen in "Sign Up" mode
When Ana enters "ana.kowalski@email.com" as email and "FreshVeggies2024!" as password
And Ana taps "Sign Up"
Then Ana sees a loading indicator
And Ana is taken to the grocery list screen
And a new account exists for "ana.kowalski@email.com"

#### Scenario: Weak password

Given Tomoko Hayashi is on the login screen in "Sign Up" mode
When Tomoko enters "tomoko.hayashi@email.com" and "short" and taps "Sign Up"
Then Tomoko sees "Password must be at least 8 characters."
And Tomoko remains on the login screen

#### Scenario: Email already in use

Given Maria Santos (maria.santos@email.com) has an existing account
When a user enters "maria.santos@email.com" and "AnotherPassword1!" and taps "Sign Up"
Then the user sees "An account with this email already exists. Try signing in instead."

### Acceptance Criteria

- [ ] Sign Up mode displays email and password fields with "Sign Up" button
- [ ] Successful sign-up creates account and navigates to grocery list
- [ ] Weak password shows minimum length requirement
- [ ] Existing email suggests switching to Sign In

### Outcome KPIs

- **Who**: New users creating accounts
- **Does what**: Complete sign-up without abandoning
- **By how much**: >= 80% completion rate
- **Measured by**: Firebase Auth createUser events
- **Baseline**: N/A (new flow)

### Technical Notes

- AuthService.signUp(email, password) already implemented -- wire to UI
- Firebase enforces minimum 6-char password; app validates >= 8 for UX consistency with NullAuthService
- Sign Up mode shares the same screen component as Sign In (mode toggle)

---

## US-03: Toggle Between Sign In and Sign Up

### Problem

Carlos Rivera opens the app and sees "Sign In" but he is a new user who needs to sign up. He finds it confusing if there is no obvious way to switch modes. He needs a clear path from Sign In to Sign Up and back.

### Who

- Any user | On login screen | Needs to switch between modes

### Solution

Add a text link below the form: "Don't have an account? Sign Up" / "Already have an account? Sign In" that toggles the screen mode.

### Domain Examples

#### 1: New user finds Sign Up

Carlos Rivera opens the app, sees the Sign In form, taps "Don't have an account? Sign Up", and the form switches to Sign Up mode with the button reading "Sign Up".

#### 2: Existing user switches back to Sign In

Carlos accidentally tapped Sign Up, then taps "Already have an account? Sign In" to go back.

#### 3: Error clears on mode switch

Carlos had a "Wrong password" error showing in Sign In mode. He switches to Sign Up mode and the error message clears.

### UAT Scenarios (BDD)

#### Scenario: Switch to Sign Up

Given the user is on the login screen in "Sign In" mode
When the user taps "Don't have an account? Sign Up"
Then the screen switches to "Sign Up" mode
And the submit button reads "Sign Up"

#### Scenario: Switch to Sign In

Given the user is on the login screen in "Sign Up" mode
When the user taps "Already have an account? Sign In"
Then the screen switches to "Sign In" mode
And the submit button reads "Sign In"

#### Scenario: Error clears on mode switch

Given the user sees an error message on the login screen
When the user toggles between Sign In and Sign Up
Then the error message is cleared

### Acceptance Criteria

- [ ] Toggle link visible below the form in both modes
- [ ] Switching mode changes button label and form behavior
- [ ] Switching mode clears any displayed error

### Outcome KPIs

- **Who**: Users who initially land on the wrong mode
- **Does what**: Find and use the correct auth mode
- **By how much**: 100% discoverability (toggle always visible)
- **Measured by**: No users stuck on wrong mode (absence of repeated wrong-mode errors)
- **Baseline**: N/A

### Technical Notes

- Single component with mode state, not two separate screens
- Email field value should persist across mode switches (user already typed it)

---

## US-04: Remove Email-Link Auth Flow

### Problem

The codebase still contains email-link authentication UI elements, deep link handlers, and hook methods that reference Firebase Dynamic Links. This dead code confuses developers, increases bundle size, and could mislead users if any remnant UI appears.

### Who

- Developer | Maintaining the codebase | Needs clean, non-confusing code
- User | Should never see broken email-link UI elements

### Solution

Remove all email-link-specific UI, hook exposure, and deep link handling for auth from LoginScreen, useAuth, and App.tsx.

### Domain Examples

#### 1: LoginScreen has no email-link references

A developer opens LoginScreen.tsx and finds no "Send Sign-In Link" button, no "sending" state, no "Check your email" success message.

#### 2: App.tsx has no auth deep link handler

A developer opens App.tsx and finds no useDeepLinkHandler hook, no Linking.getInitialURL for auth, no Linking.addEventListener for auth URLs.

#### 3: useAuth exposes password methods, not link methods

A developer inspects useAuth return type and finds signIn, signUp, signOut -- but not sendSignInLink or handleSignInLink.

### UAT Scenarios (BDD)

#### Scenario: No email-link UI visible

Given the user is on the login screen
Then the user does not see a "Send Sign-In Link" button
And the user does not see mention of "magic link" or "sign-in link"

#### Scenario: Deep link does not trigger auth

Given the user is signed out
When the app receives a deep link URL containing a sign-in link
Then the app does not attempt email-link authentication

#### Scenario: useAuth hook exposes password methods

Given a developer inspects the useAuth hook return type
Then it includes signIn, signUp, and signOut
And it does not include sendSignInLink or handleSignInLink

### Acceptance Criteria

- [ ] LoginScreen has no email-link UI elements
- [ ] App.tsx has no useDeepLinkHandler for auth
- [ ] useAuth exposes signIn and signUp, not sendSignInLink/handleSignInLink
- [ ] EMAIL_LINK_STORAGE_KEY AsyncStorage usage removed from active code paths

### Outcome KPIs

- **Who**: All users
- **Does what**: Experience zero email-link auth attempts
- **By how much**: 100% elimination
- **Measured by**: Absence of sendSignInLinkToEmail calls in production code
- **Baseline**: 100% of auth currently uses email-link

### Technical Notes

- AuthService interface may retain sendSignInLink/handleSignInLink for backward compat -- DESIGN wave decides
- If deep linking is used for non-auth purposes, the Linking handlers should be scoped, not removed entirely
- ACTION_CODE_SETTINGS constant in AuthService.ts may be removed if no other feature uses it
- Dependency: US-01 and US-02 must be complete before removing old flow
