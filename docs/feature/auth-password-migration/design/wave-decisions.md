# Wave Decisions: auth-password-migration (DESIGN)

## Deferred Decisions from DISCUSS Wave -- Resolved

### D1: AuthService interface pruning

**Decision**: Remove `sendSignInLink` and `handleSignInLink` from the `AuthService` interface.

**Rationale**: These methods serve only the email-link flow. No other feature uses them. Keeping dead methods on the interface forces every adapter (including `createNullAuthService`) to implement unused code. Pruning keeps the interface honest and reduces maintenance burden.

**Risk**: None. No consumer calls these methods after migration. If email-link auth is ever re-needed, the methods can be re-added -- they are in git history.

### D2: Deep link handler disposition

**Decision**: Remove `useDeepLinkHandler` from `App.tsx` entirely.

**Rationale**: The current `useDeepLinkHandler` exists solely for auth email-link handling. No other feature in the app uses deep links. There is no non-auth deep link routing. If deep linking is needed in the future, it should be designed fresh for that purpose rather than keeping a dead handler.

### D3: Existing `src/components/LoginScreen.tsx` reuse

**Decision**: Do NOT reuse the older `src/components/LoginScreen.tsx`. The active `src/ui/LoginScreen.tsx` will be modified in place. The older component in `src/components/` will be removed as part of cleanup (US-04).

**Rationale**: The `src/components/LoginScreen.tsx` was an earlier prototype that takes `AuthService` directly as a prop and uses an `onLoginSuccess` callback. The active architecture uses the `useAuth` hook in `App.tsx` to manage auth state, passing individual functions to `LoginScreen`. The `src/ui/LoginScreen.tsx` is the correct location within the current architecture. The older component has a different contract (receives `AuthService` directly) that conflicts with the established pattern.

### D4: Password validation location

**Decision**: Client-side validation (minimum 8 characters) before calling AuthService. Firebase's server-side validation (minimum 6 characters) is a secondary backstop.

**Rationale**: Consistent with existing `createNullAuthService` which already validates >= 8. Prevents unnecessary network round-trips for obviously invalid passwords. The UI validates before calling the port; the port/adapter does not duplicate this validation.

### D5: Error message mapping

**Decision**: The LoginScreen component is responsible for displaying error messages as-is from AuthResult. No error mapping layer.

**Rationale**: The acceptance criteria specify exact error strings ("Incorrect password. Please try again.", etc.). These will be produced by the useAuth hook or LoginScreen based on the error codes/messages from AuthService. Firebase error codes (e.g., `auth/wrong-password`) will need mapping to user-friendly strings. This mapping belongs in the hook or screen, not in the AuthService adapter (which should pass through Firebase errors).

## Decisions Carried Forward from DISCUSS

- Single screen with mode toggle (not separate screens)
- Password minimum 8 characters
- Four stories: sign-in, sign-up, mode toggle, cleanup
- Cleanup (US-04) ships after US-01/02/03 are verified

## New Design Decisions

### N1: AsyncStorage cleanup

`EMAIL_LINK_STORAGE_KEY` usage in `createAuthService()` must be removed. The constant, the `setItem` call in `sendSignInLink`, and the `getItem`/`removeItem` calls in `handleSignInLink` all go away with the interface pruning.

### N2: Firebase imports cleanup

The following Firebase imports in `AuthService.ts` become unused after pruning: `sendSignInLinkToEmail`, `isSignInWithEmailLink`, `signInWithEmailLink`. The `AsyncStorage` import also becomes unused. These should be removed.

### N3: Test file cleanup

- `src/ui/LoginScreen.test.tsx` -- rewrite to test password auth UI
- `src/hooks/useAuth.test.ts` -- remove tests for `sendSignInLink` and `handleSignInLink`; add tests for `signIn` and `signUp` pass-through
- `src/components/LoginScreen.test.tsx` -- remove (component being removed)
- `src/auth/AuthService.test.ts` -- update if it tests email-link methods

### N4: No new packages needed

The migration uses only existing dependencies: React Native TextInput (for password field), existing Firebase Auth SDK (already supports email/password), existing testing libraries.
