# Evolution: auth-password-migration

**Date**: 2026-04-10
**Feature**: Migrate authentication from email-link (magic link) to email/password
**Driver**: Firebase Dynamic Links deprecation (external)

## Feature Summary

Migrated the grocery list app's authentication from email-link (magic link) flow to email/password authentication. This involved rewriting the LoginScreen to accept password-based signIn/signUp props, adding client-side validation, implementing a mode toggle between Sign In and Sign Up, adding error display and loading states, removing legacy email-link code (deep link handler, old LoginScreen prototype), and pruning the AuthService interface.

## Business Context

Firebase Dynamic Links, which powered the email-link authentication flow, was deprecated. Without migration, users would lose the ability to authenticate. Email/password is a standard, well-understood auth pattern that removes the external dependency on Dynamic Links and improves user experience (no context-switching to email client).

## Key Decisions by Wave

### DISCUSS Wave

- **Single screen with mode toggle** over separate Sign In / Sign Up screens -- minimizes navigation complexity, matches existing architecture
- **Four stories** (sign-in, sign-up, mode toggle, cleanup) for right-sized incremental delivery
- **Cleanup as separate story (US-04)** -- different risk profile, allows verifying new auth before removing old code
- **Password minimum 8 characters** (not Firebase's 6) -- consistent with NullAuthService, widely accepted minimum
- **AuthService interface changes deferred to DESIGN** -- architectural decision

### DESIGN Wave

- **Prune AuthService interface** -- remove sendSignInLink/handleSignInLink (dead methods, no consumers after migration)
- **Remove useDeepLinkHandler entirely** -- exists solely for auth email-link, no other deep link uses
- **Do not reuse src/components/LoginScreen.tsx** -- older prototype with incompatible contract; modify src/ui/LoginScreen.tsx in place
- **Client-side validation before AuthService calls** -- prevents unnecessary network round-trips
- **No error mapping layer** -- LoginScreen displays AuthResult errors as-is

### DISTILL Wave

- **Jest with @testing-library/react-native** -- matches existing project patterns
- **NullAuthService for happy paths, jest.fn() for error scenarios** -- NullAuthService validates but cannot simulate specific error conditions
- **Tests render LoginScreen directly** -- exercises full UI contract without full App tree
- **4 test files by milestone** (walking skeleton, sign-up, errors, cleanup) -- matches implementation sequence
- **Skip strategy** -- one test at a time, TDD feedback loop

## Steps Completed

### Phase 01: Walking Skeleton (3 steps)

| Step | Description | Result |
|------|-------------|--------|
| 01-01 | Returning user signs in with email and password | PASS |
| 01-02 | New user signs up with email and password | PASS |
| 01-03 | Login screen displays password fields, not email-link | PASS |

### Phase 02: Sign Up and Mode Toggle (6 steps)

| Step | Description | Result |
|------|-------------|--------|
| 02-01 | New user creates account successfully | PASS |
| 02-02 | Switch from Sign In to Sign Up mode | PASS |
| 02-03 | Switch from Sign Up to Sign In mode | PASS |
| 02-04 | Email persists across mode switches | PASS |
| 02-05 | Error clears when switching modes | PASS |
| 02-06 | Loading indicator during sign-up | PASS |

### Phase 03: Error Handling (8 steps)

| Step | Description | Result |
|------|-------------|--------|
| 03-01 | Wrong password error | PASS |
| 03-02 | Non-existent account suggests signing up | PASS |
| 03-03 | Weak password rejected | PASS |
| 03-04 | Existing email rejected on sign-up | PASS |
| 03-05 | Empty email validation on sign-in | PASS |
| 03-06 | Empty email validation on sign-up | PASS |
| 03-07 | Invalid email format validation | PASS |
| 03-08 | Sign In button disabled during auth | PASS |

### Phase 04: Cleanup (3 steps)

| Step | Description | Result |
|------|-------------|--------|
| 04-01 | No email-link UI on login screen | PASS |
| 04-02 | useAuth exposes password auth methods only | PASS |
| 04-03 | App does not handle auth deep links | PASS |

**Total**: 20/20 steps passed across 4 phases.

## Lessons Learned

1. **Incremental migration reduces risk**: Separating cleanup (US-04) from new functionality allowed verifying the new auth flow before removing old code. Several cleanup steps passed immediately because the walking skeleton and feature steps had already established the correct architecture.

2. **Walking skeleton validated architecture early**: The 3-step walking skeleton (sign in, sign up, verify UI) confirmed the prop-based LoginScreen approach worked before investing in mode toggle and error handling details.

3. **Many tests passed without new production code**: Steps 01-03, 02-03, 02-04, 02-05 (partial), 03-01, 03-02, 03-04, 03-05, 03-06, 03-08, 04-01 all passed immediately after removing `.skip` -- the prior implementation steps had already built the necessary behavior. This is a sign of good incremental design where each step builds naturally on the previous.

4. **Thin UI components benefit from acceptance-level testing**: Unit tests were correctly skipped for most steps (NOT_APPLICABLE) because the acceptance tests at the LoginScreen render level provided the right abstraction. No unit decomposition was needed for a component that delegates to injected functions.

## Migrated Artifacts

| Artifact | Location |
|----------|----------|
| ADR | `docs/adrs/ADR-007-email-password-auth-migration.md` |
| Architecture design | `docs/architecture/auth-password-migration/architecture-design.md` |
| Component boundaries | `docs/architecture/auth-password-migration/component-boundaries.md` |
| Test scenarios | `docs/scenarios/auth-password-migration/test-scenarios.md` |
| Walking skeleton | `docs/scenarios/auth-password-migration/walking-skeleton.md` |
| Journey schema | `docs/ux/auth-password-migration/journey-auth-login.yaml` |
| Journey visual | `docs/ux/auth-password-migration/journey-auth-login-visual.md` |
| Gherkin scenarios | `docs/ux/auth-password-migration/journey-auth-login.feature` |
| Acceptance tests | `tests/acceptance/auth-password-migration/` |
