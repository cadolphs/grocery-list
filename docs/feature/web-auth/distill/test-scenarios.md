# Test Scenarios — web-auth

## Scenario inventory

Total: **~28 scenarios** across 5 test files. All in `/web/src/**/*.test.ts(x)` — vitest, not jest.

### walking-skeleton.feature → `/web/src/App.test.tsx` (rewritten by DELIVER US-01)

| # | Scenario | Story | Type | Tags |
|---|---|---|---|---|
| 1 | Signed-out user sees LoginScreen, not dashboard | US-01, US-02 | happy | @walking_skeleton @in-memory @us-01 @us-02 |
| 2 | Successful sign-in flips App to dashboard | US-02 | happy | @walking_skeleton @in-memory @us-02 |
| 3 | Restored session bypasses the form | US-01, US-02 | happy | @walking_skeleton @in-memory @us-01 @us-02 |
| 4 | Sign Out returns to LoginScreen | US-07 | happy | @walking_skeleton @in-memory @us-07 |
| 5 | Loading state before first auth callback | US-01 | happy | @walking_skeleton @in-memory @us-01 |

### auth-service.feature → `/web/src/auth/AuthService.test.ts`

| # | Scenario | Story | Type | Tags |
|---|---|---|---|---|
| 6 | Factory exposes signIn, signUp, signOut, onAuthStateChanged, getCurrentUser | US-01 | happy | @in-memory @us-01 |
| 7 | Successful sign-in returns `{ success: true, user: { uid, email } }` | US-01 | happy | @in-memory @us-01 |
| 8 | Failed sign-in returns `{ success: false, error: <string> }` | US-01, US-05 | error | @in-memory @us-01 @us-05 |
| 9 | `onAuthStateChanged` returns an unsubscribe function | US-01 | happy | @in-memory @us-01 |
| 10 | `createNullAuthService` provides equivalent shape for tests | US-01 | invariant | @in-memory @us-01 |

### use-auth-state.feature → `/web/src/auth/useAuthState.test.ts`

| # | Scenario | Story | Type | Tags |
|---|---|---|---|---|
| 11 | Initial state: `{ user: null, loading: true }` | US-01 | happy | @in-memory @us-01 |
| 12 | First callback: `{ user, loading: false }` | US-01 | happy | @in-memory @us-01 |
| 13 | Unsubscribes on unmount | US-01 | invariant | @in-memory @us-01 |
| 14 | Re-renders on auth-state change | US-02, US-07 | happy | @in-memory @us-02 @us-07 |

### login-screen.feature → `/web/src/components/LoginScreen.test.tsx`

| # | Scenario | Story | Type | Tags |
|---|---|---|---|---|
| 15 | Renders email + password fields + Sign In button | US-02 | happy | @in-memory @us-02 |
| 16 | Submits credentials to `signIn` prop | US-02 | happy | @in-memory @us-02 |
| 17 | Toggles to Sign Up mode; button label + helper change | US-03 | happy | @in-memory @us-03 |
| 18 | Toggle preserves typed email | US-03 | happy | @in-memory @us-03 |
| 19 | Toggle clears prior error | US-03 | happy | @in-memory @us-03 |
| 20 | Sign Up submits to `signUp` prop | US-03 | happy | @in-memory @us-03 |
| 21 | Empty email shows validation error, no network call | US-04 | error | @in-memory @us-04 |
| 22 | Invalid email format shows validation error, no network call | US-04 | error | @in-memory @us-04 |
| 23 | Password < 8 chars in Sign Up mode rejected pre-network | US-04 | error | @in-memory @us-04 |
| 24 | Sign In mode does NOT enforce 8-char min | US-04 | invariant | @in-memory @us-04 |
| 25 | Firebase failure displays mapped error copy | US-05 | error | @in-memory @us-05 |
| 26 | Button disabled + label "Signing In..." during submit | US-06 | happy | @in-memory @us-06 |
| 27 | Button re-enables after error | US-05, US-06 | error recovery | @in-memory @us-05 @us-06 |

### pure-modules.feature → `/web/src/auth/validation.test.ts` + `/web/src/auth/error-mapping.test.ts`

| # | Scenario | Story | Type | Tags |
|---|---|---|---|---|
| V1 | `validateFormInput` rejects empty email | US-04 | error | @real-io @us-04 |
| V2 | `validateFormInput` rejects invalid email format | US-04 | error | @real-io @us-04 |
| V3 | `validateFormInput` rejects short password only in sign-up mode | US-04 | error | @real-io @us-04 |
| V4 | `validateFormInput` accepts valid sign-in input | US-04 | happy | @real-io @us-04 |
| V5 | `validateFormInput` accepts valid sign-up input with 8+ char password | US-04 | happy | @real-io @us-04 |
| V6 | `EMAIL_PATTERN` matches common valid addresses | US-04 | invariant | @real-io @us-04 |
| E1 | `mapAuthError` → invalid-credentials message on wrong-password error | US-05 | error | @real-io @us-05 |
| E2 | `mapAuthError` → "try signing up" hint on user-not-found in sign-in mode | US-05 | error | @real-io @us-05 |
| E3 | `mapAuthError` → "email already in use" + "try signing in" in sign-up mode | US-05 | error | @real-io @us-05 |
| E4 | `mapAuthError` → generic fallback for unknown error | US-05 | error | @real-io @us-05 |
| E5 | `mapAuthError` handles non-Error values safely (string, unknown) | US-05 | invariant | @real-io @us-05 |

## Story → scenario coverage

| Story | Scenarios |
|---|---|
| US-01 | 1, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13 (11 scenarios) |
| US-02 | 1, 2, 3, 14, 15, 16 (6) |
| US-03 | 17, 18, 19, 20 (4) |
| US-04 | 21, 22, 23, 24, V1-V6 (10) |
| US-05 | 8, 25, 27, E1-E5 (8) |
| US-06 | 26, 27 (2) |
| US-07 | 4, 14 (2) |

Every story ≥ 2 scenarios. Every AC in `user-stories.md` has a matching scenario.

## Error-path scenarios

Error / invariant / error-recovery scenarios: 8 (scenarios 8, 21, 22, 23, 24, 25, 27, plus V1-V3 and E1-E5) = **~17 of 38 = 45 %**. Exceeds 40 % guideline.

## Adapter coverage (Mandate 6)

See `wave-decisions.md` DWD-08. All driven ports have either `@real-io` (pure modules) or `@in-memory` (NullAuthService) coverage. No `MISSING` rows.

## One-at-a-time implementation order (for DELIVER)

The roadmap will collapse these to 7 steps (one per story):

1. **US-01** — scaffolds → real AuthService + useAuthState + NullAuthService; rewrite App.test.tsx; delete hooks/useAuth.ts. Greens scenarios 1, 3, 5, 6-14.
2. **US-02** — wire LoginScreen minimal sign-in path + App routing. Greens scenarios 2, 15, 16.
3. **US-03** — mode toggle. Greens 17-20.
4. **US-04** — wire validation.ts + LoginScreen pre-submit guards. Greens 21-24, V1-V6.
5. **US-05** — wire error-mapping.ts + LoginScreen error display. Greens 25, 27, E1-E5.
6. **US-06** — loading state. Greens 26.
7. **US-07** — Sign Out button in AuthenticatedApp. Greens 4.
