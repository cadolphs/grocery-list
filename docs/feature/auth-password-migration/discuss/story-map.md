# Story Map: auth-password-migration

## User: Grocery list user (existing or new)

## Goal: Sign in or create account using email and password, replacing deprecated email-link flow

## Backbone

| Open App | View Login Form | Enter Credentials | Submit & Authenticate | Use App |
|----------|----------------|-------------------|----------------------|---------|
| App detects no auth | See email + password fields | Type email and password | Tap Sign In / Sign Up | Grocery list loads |
| | Toggle Sign In / Sign Up | Validate input locally | Handle auth result | |
| | | | Show error if failed | |
| | No email-link UI present | | | Deep link auth removed |

---

### Walking Skeleton

The thinnest end-to-end slice: a returning user signs in with email and password.

1. **Open App**: App detects user is not authenticated
2. **View Login Form**: LoginScreen renders with email field, password field, and "Sign In" button
3. **Enter Credentials**: User types email and password
4. **Submit & Authenticate**: User taps "Sign In", AuthService.signIn() is called, success sets user state
5. **Use App**: App.tsx renders AppShell with grocery list

### Release 1: Core Auth Migration (Walking Skeleton + Sign Up)

**Target outcome**: Users can authenticate with email/password instead of broken email links.

Stories:
- Sign in with email and password (happy path)
- Sign up with email and password (happy path)
- Toggle between Sign In and Sign Up modes
- Basic error display (wrong password, account exists, weak password)

### Release 2: Cleanup and Polish

**Target outcome**: No dead code from email-link flow; clean error handling.

Stories:
- Remove email-link UI from LoginScreen
- Remove deep link auth handler from App.tsx
- Remove email-link methods from useAuth hook exposure
- Input validation (empty email, invalid format)

## Scope Assessment: PASS -- 6 stories, 1 bounded context (auth), estimated 3-4 days

Release 2 stories are small cleanup tasks (hours each). Total scope is right-sized for a single delivery cycle.
