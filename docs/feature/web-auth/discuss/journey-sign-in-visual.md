# Journey: Sign in to the web app with email + password

**Feature**: web-auth
**Actor**: Clemens (solo-dev + end user — same person)
**Goal**: Open `https://grocery-list-cad.web.app` on any desktop/laptop browser, sign in with the same credentials used on mobile, and see the staples dashboard.

## Narrative

Clemens opens the web app on his laptop. He sees the sign-in screen (same look-and-feel concept as the mobile `LoginScreen`). Types his email + password. Hits Sign In. The staples table appears. Next visit — browser remembers the session; goes straight to the dashboard.

The mobile app already does this. The web app is currently stuck on a deprecated email-link code path that renders only a heading.

## Mental model

- Same Firebase Auth account works across mobile + web (single Firebase project).
- Session persists in browser across tabs/reloads (Firebase default: `local` persistence).
- Sign out is available but rarely used (single user, personal device).
- Forgot-password is not in scope for initial release (Clemens knows his own password; deferrable to a follow-up).

## Happy path

| # | Step | Output | Emotion |
|---|------|--------|---------|
| 1 | Navigate to prod URL (first visit, no session) | Sign-in form with email + password fields, Sign In button, "Don't have an account? Sign Up" toggle | neutral |
| 2 | Type email + password → click Sign In | Button shows "Signing In..."; request fires | anticipation |
| 3 | Auth success | Form replaced with staples dashboard (existing `AuthenticatedApp` view) | relief, "it works now" |
| 4 | Reload tab | Goes straight to dashboard — session persisted | trust |
| 5 | (Optional) Click Sign Out | Back to sign-in screen | neutral |

## Mode: Sign Up (new account)

Same screen, toggle link flips to Sign Up mode. Password field gains minimum-8-character rule. On submit, Firebase creates the account; logged in immediately after.

## Error paths

| Failure | User-visible message | Recovery |
|---------|----------------------|----------|
| Wrong password | "Invalid credentials" (or Firebase error message) | Clemens retries |
| Non-existent email (sign-in mode) | Hint: try signing up | Toggle to Sign Up mode |
| Account already exists (sign-up mode) | "Email already in use" | Toggle to Sign In mode |
| Password < 8 chars (sign-up mode, client-side) | "Password must be at least 8 characters." | Retype |
| Empty email | "Please enter your email address" | Retype |
| Invalid email format | "Please enter a valid email address." | Retype |
| Network failure during submit | Error message from Firebase | Retry |

## Emotional arc

Trivial upward trajectory: the current state is negative ("can't use the web app") — any working sign-in is a full relief + trust gain. No subtle UX polish needed.

## Shared artifacts

- Firebase Auth session (persisted in browser localStorage by Firebase SDK default)
- `AuthUser` type (uid + email) — consumed by `AuthenticatedApp` and `useStaples(db, uid)`
- Prod URL `https://grocery-list-cad.web.app` (established by web-prod-deploy)
- Firebase Auth authorized domains list — `grocery-list-cad.web.app` must be present (usually auto-added on project creation)

## Non-goals (this feature)

- Forgot-password / password reset flow
- Multi-factor auth
- OAuth / Google / social sign-in
- Session-timeout UX
- Password-strength meter beyond "≥ 8 chars"
- "Remember me" toggle (Firebase default local persistence is always on)
- UX polish / CSS styling (explicit deferred item — see story-map)

## Integration with mobile

Same Firebase project. Signing up on web creates an account usable on mobile and vice versa. Signing in on one device does NOT create a session on the other (different browser/native auth storage) — this is expected per the publish-web journey.
