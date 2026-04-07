# Prioritization: auth-password-migration

## Release Priority

| Priority | Release | Target Outcome | KPI | Rationale |
|----------|---------|---------------|-----|-----------|
| 1 | Walking Skeleton (Sign In) | Returning users can authenticate | Login success rate | Validates core flow; unblocks everything else |
| 2 | R1: Core Auth (Sign Up + Errors) | New users can create accounts; errors guide recovery | Sign-up completion rate | Completes the auth story for all user types |
| 3 | R2: Cleanup | No dead code from email-link flow | N/A (code hygiene) | Removes confusion, reduces bundle size, eliminates deprecated dependency |

## Backlog Suggestions

| Story | Release | Priority | Outcome Link | Dependencies |
|-------|---------|----------|-------------|--------------|
| Sign in with email/password | WS | P1 | Login success rate | None |
| Sign up with email/password | R1 | P1 | Sign-up completion rate | None (parallel with sign-in) |
| Toggle Sign In / Sign Up mode | R1 | P1 | Login success rate | Sign-in + Sign-up stories |
| Error handling (wrong password, account exists, weak password) | R1 | P1 | Error recovery rate | Sign-in + Sign-up stories |
| Remove email-link UI | R2 | P2 | Code hygiene | R1 complete |
| Remove deep link auth handler | R2 | P2 | Code hygiene | R1 complete |
| Input validation (empty/invalid email) | R1 | P2 | Login success rate | Sign-in story |

> **Note**: Story IDs (US-01, etc.) assigned in user-stories.md after Requirements Crafting.

## Prioritization Rationale

- **Urgency is HIGH (5/5)**: Firebase Dynamic Links deprecation is imminent. Email-link auth will break.
- **Value is HIGH (5/5)**: Without working auth, the entire app is inaccessible.
- **Effort is LOW (2/5)**: Backend methods already exist. This is primarily a UI migration.
- **Risk**: LOW -- email/password is a well-understood pattern, and the service layer is already implemented.

The riskiest assumption is already validated: `AuthService.signIn()` and `AuthService.signUp()` exist and work. The migration is purely about wiring the UI to call these methods instead of the email-link methods.
