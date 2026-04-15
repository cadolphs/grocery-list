# Walking Skeleton — web-auth

## Definition

End-to-end path proving the new auth wiring works: a user enters credentials into `<LoginScreen>`, the stubbed `AuthService` returns success, `<App>` re-renders to the dashboard.

Slice crosses every new component (`AuthService`, `useAuthState`, `LoginScreen`, modified `App`) without touching live Firebase.

## Strategy

**B (Real local + fake costly):** pure modules tested directly; UI layer tested with `createNullAuthService()` double. Live Firebase never touched by vitest.

## Scenarios (see `walking-skeleton.feature`)

1. Signed-out user sees the sign-in form (not the dashboard).
2. Returning user enters correct credentials → dashboard appears.
3. Restored session (NullAuthService returns an existing user on mount) → dashboard appears immediately, no form.
4. Sign Out → form reappears.

These four scenarios traverse the full component graph exactly once.

## Why this is a valid walking skeleton

| Integration checkpoint | Proven by |
|---|---|
| `App` → `createAuthService` | Scenario 1: App mounts without crashing; no-user branch renders |
| `App` → `useAuthState` → `AuthService.onAuthStateChanged` | Scenarios 1 & 3: initial auth state respected on first render |
| `App` → `LoginScreen` prop wiring (`signIn`, `signUp`) | Scenario 2: typing + submit routes through NullAuthService.signIn |
| `AuthService` auth-state propagation → `App` re-render | Scenario 2: successful signIn flips `onAuthStateChanged` → App shows dashboard |
| `AuthenticatedApp` Sign Out button → `AuthService.signOut` → re-render | Scenario 4: SignOut returns user to form |

A `NullAuthService` misbehavior (wrong return shape, missing unsubscribe, etc.) would fail one of these scenarios — which is exactly the integrity signal we want.

## What this skeleton cannot verify

| Gap | Why vitest can't | How to verify |
|---|---|---|
| Firebase accepts the real email/password credentials | Would require live Firebase account + network | K1 drill post-DELIVER — sign in once with a real account, record time |
| Session persists in real browser localStorage across reload | jsdom localStorage is per-test; not the same thing | K2 drill post-DELIVER — reload the live prod tab after sign-in |
| Firebase error codes match `mapAuthError`'s expectations | Firebase error messages are SDK-internal strings | Manual: enter wrong password once on live site, verify mapped copy fires |
| Authorized-domains gate | Firebase setting, not code | Once-off manual: visit live URL, attempt sign-in, check console for auth-domain error if the setting was missed |

These gaps are intentionally out of vitest scope. Same rationale as `web-prod-deploy`: live Firebase is a one-shot post-DELIVER drill, not a repeatable CI case.

## Tags applied

```
@walking_skeleton @in-memory @web-auth
```

Per-story tags (`@us-01` through `@us-07`) layered on individual scenarios for drill-through.
