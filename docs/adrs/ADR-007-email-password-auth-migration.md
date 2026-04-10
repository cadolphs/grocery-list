# ADR-007: Migrate from Email-Link to Email/Password Authentication

## Status

Proposed (supersedes ADR-003-email-link-auth)

## Context

Firebase Dynamic Links, which powers the email-link (magic link) authentication flow, is deprecated and will stop working. This is the app's only authentication method, meaning all users will lose access once Dynamic Links shuts down.

The existing `AuthService` interface already includes `signIn(email, password)` and `signUp(email, password)` methods with working Firebase and Null implementations. The migration is primarily a UI and hook-layer change.

The app is maintained by a solo developer with an urgent timeline. The existing architecture (ports-and-adapters with functional TypeScript) is well-established and should not change.

## Decision

Replace email-link authentication with email/password authentication across the entire auth flow:

1. **Remove** `sendSignInLink` and `handleSignInLink` from the `AuthService` interface and all implementations
2. **Remove** `useDeepLinkHandler` from `App.tsx` (auth-only deep link handler)
3. **Modify** `useAuth` hook to expose `signIn` and `signUp` instead of email-link methods
4. **Rewrite** `LoginScreen` to present email + password form with sign-in/sign-up mode toggle
5. **Remove** `EMAIL_LINK_STORAGE_KEY` AsyncStorage usage and `ACTION_CODE_SETTINGS` constant
6. **Remove** dead `src/components/LoginScreen.tsx` prototype and its tests
7. **Enforce** minimum 8-character password at the UI level (consistent with NullAuthService)

## Alternatives Considered

### Keep email-link auth and migrate to a non-Dynamic-Links deep link provider

- **Pro**: No UX change for existing users; passwordless remains simpler
- **Con**: Requires finding and integrating a replacement deep link service (e.g., Branch, custom domain with Universal Links/App Links). Significant infrastructure work. No guarantee of long-term stability of replacement.
- **Rejected because**: Disproportionate effort for a solo developer. Email/password is universally supported by Firebase Auth with zero additional infrastructure.

### Add email/password as a second auth method alongside email-link

- **Pro**: Gradual migration; existing users keep working flow until it breaks
- **Con**: Two auth flows to maintain. Email-link will break regardless. Doubles testing surface for no lasting benefit.
- **Rejected because**: Email-link is already broken (Dynamic Links deprecated). Maintaining two flows adds complexity with no user benefit.

### Use Google Sign-In or other OAuth provider

- **Pro**: One-click sign-in, no password management
- **Con**: Requires OAuth consent screen setup, platform-specific native modules (Google Sign-In SDK), and Firebase Console configuration. More moving parts than email/password.
- **Rejected because**: Higher setup complexity. Can be added later as an enhancement. Email/password solves the immediate access crisis.

## Consequences

### Positive

- Users regain access to the app immediately (no dependency on Dynamic Links)
- Simpler auth flow: no email round-trip, no deep link handling, no AsyncStorage for pending email
- Reduced codebase: ~60 lines of dead code removed (email-link implementations, deep link handler, constants)
- `AuthService` interface becomes cleaner (5 methods instead of 7)
- Testing surface reduced: no need to test deep link handling or email-link flow

### Negative

- Existing email-link-only users who never set a password will need to use Firebase's password reset flow or re-register. This affects users who authenticated via magic link only.
- Users must remember a password (increased friction vs. passwordless)
- No password reset flow in this migration scope -- users who forget passwords have no in-app recovery (future enhancement)

### Neutral

- Firebase Auth session persistence is unaffected -- already-signed-in users remain signed in
- The `AuthUser` and `AuthResult` types are unchanged
- No database schema changes
- No new dependencies added
