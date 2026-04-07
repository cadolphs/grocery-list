# Requirements: auth-password-migration

## Business Context

Firebase Dynamic Links is being deprecated, which will break the app's only login method (email-link / magic link authentication). Users will be unable to sign in, making the entire app inaccessible. This migration replaces the broken flow with email/password authentication, for which the backend (AuthService) already has working implementations.

## Functional Requirements

### FR-01: Email/Password Sign In

The login screen must allow users with existing accounts to sign in using their email address and password. On success, the app navigates to the grocery list. On failure, an actionable error message is displayed.

### FR-02: Email/Password Sign Up

The login screen must allow new users to create an account using their email address and a password of at least 8 characters. On success, the app navigates to the grocery list with the new account. On failure, an actionable error message is displayed.

### FR-03: Mode Toggle (Sign In / Sign Up)

The login screen must provide a visible toggle allowing users to switch between Sign In and Sign Up modes. The toggle must be discoverable without scrolling.

### FR-04: Error Display

Authentication errors must be displayed inline on the login screen with actionable guidance. Errors include: wrong password, account already exists, weak password, no account found, invalid email, empty email, and network errors.

### FR-05: Email-Link Flow Removal

All email-link-specific UI elements, deep link auth handlers, and hook method exposures must be removed from active code paths. The AuthService interface methods may be retained at the service layer (DESIGN wave decision).

## Non-Functional Requirements

### NFR-01: Auth Latency

Authentication (sign in or sign up) must complete within 3 seconds under normal network conditions.

### NFR-02: No Regression

App crash rate must not increase after migration. Existing authenticated sessions must not be invalidated.

### NFR-03: Accessibility

Email and password fields must be accessible to screen readers. Button labels must clearly indicate their action.

## Business Rules

### BR-01: Password Minimum Length

Passwords must be at least 8 characters. This is enforced at the UI level before calling AuthService.

### BR-02: One Account Per Email

Each email address can have at most one account. Attempting to sign up with an existing email shows an error guiding the user to sign in instead.

### BR-03: Session Persistence

Authenticated sessions persist across app restarts (Firebase Auth default behavior). Users should not need to sign in every time they open the app.

## Domain Glossary

| Term | Definition |
|------|-----------|
| Sign In | Authenticate with an existing account using email and password |
| Sign Up | Create a new account using email and password |
| Email-link auth | Deprecated method where a magic link is sent to the user's email (being removed) |
| Deep link | URL that opens the app directly to a specific screen; previously used for email-link auth completion |
| AuthService | Service layer providing signIn, signUp, signOut, and auth state observation |
| AuthResult | Return type from auth operations: { success, user?, error? } |

## Dependencies

| Dependency | Status | Impact |
|-----------|--------|--------|
| AuthService.signIn() | Implemented | Ready to wire to UI |
| AuthService.signUp() | Implemented | Ready to wire to UI |
| Firebase Auth (email/password provider) | Enabled | Must be enabled in Firebase Console |
| useAuth hook | Needs modification | Must expose signIn/signUp instead of email-link methods |

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Existing email-link users lose access | Medium | High | Email-link users already have Firebase accounts; email/password sign-in works with same email if password is set, otherwise they need to sign up again or use password reset |
| Firebase password provider not enabled | Low | High | Verify in Firebase Console before development |
| Deep link removal breaks non-auth features | Low | Medium | DESIGN wave assesses whether deep links serve other purposes |
