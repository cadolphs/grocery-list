# ADR-008: Sign-Out Listener Lifecycle Invariant

- **Status**: Accepted
- **Date**: 2026-04-23
- **Decision driver**: Feature `logout-button` (DESIGN wave)
- **Supersedes**: —
- **Superseded by**: —

---

## Context

The app maintains four live Firestore `onSnapshot` listeners (staples, areas, section order, trip) for the signed-in user. These are created inside the async `initializeApp` function invoked from `useAppInitialization`'s `useEffect`. The effect's cleanup function calls `unsubscribeAll()` to release all four listeners.

We are introducing a sign-out button. Naive implementations risk one of two bugs:

1. **Callback-during-unsubscribe**: if `signOut` is awaited from inside a Firestore `onSnapshot` callback (via some intermediary hook), the Firebase SDK can deliver a final snapshot after Firestore's security rules have already revoked the caller's token, producing a `permission-denied` error that surfaces as an unhandled rejection.

2. **Listener leak**: if `signOut` is called without going through the auth-state-driven re-render path, the `useAppInitialization` effect does not re-run, its cleanup does not execute, and the four Firestore listeners remain subscribed. On a subsequent sign-in as a different user, the old listeners either throw permission-denied or (worse) deliver stale data into the new user's session.

The existing architecture already solves this problem **by accident of good design**: `useAuth`'s `onAuthStateChanged` subscription converts Firebase's auth transitions into React state changes; `useAppInitialization` declares `authUser` in its effect's dependency array; React's effect-cleanup ordering guarantees unsubscribe runs when `authUser` transitions to `null`. This ADR **documents and locks that invariant** so future changes do not quietly break it.

## Decision

**The Firestore listener lifecycle is driven exclusively by the auth-state transition observable in `App.tsx`. Specifically:**

1. `signOut` is invoked from UI event handlers (e.g., `SignOutButton.onPress`) — never from inside a `useEffect`, `onSnapshot` callback, or storage-port callback.
2. `signOut` triggers Firebase Auth's `onAuthStateChanged` to emit `null`, which propagates through `useAuth` → `App.tsx` state → re-render with `authUser === null`.
3. The `useAppInitialization` effect, whose dependencies include `authUser`, re-runs; its cleanup function fires and calls `unsubscribeAll()`.
4. **Neither `useAppInitialization` nor any hook it transitively uses may call `signOut`.** Unsubscription must remain a *consequence* of the auth transition, never a cause.

This is enforced by convention + code review. A lightweight lint/archunit-style check (grep rule: `signOut` call sites must reside in files under `src/ui/` or `App.tsx`, never under `src/hooks/useAppInitialization` or `src/adapters/**`) is recommended as a follow-up.

## Consequences

### Positive

- **Single source of truth for lifecycle**: the React effect model, driven by the auth observable, is the only mechanism that tears down listeners. No parallel path, no race window.
- **Testability preserved**: `createNullAuthService` emits auth transitions synchronously to listeners; acceptance tests for logout exercise the exact same code path as production.
- **Existing invariant is strengthened, not changed**: the sign-out button adds no new lifecycle code; it only adds a UI trigger for a transition the system already handles.
- **Failure mode is loud, not silent**: if a future contributor violates the rule (e.g., calls `signOut` from inside an effect on the authenticated path), they will observe either a double-unsubscribe error or a stale-listener leak — both detectable in acceptance tests with spy factories.

### Negative

- **Convention-enforced, not type-enforced**: TypeScript cannot prove "`signOut` is only called from event handlers." Relies on reviewer vigilance. Mitigation: add a grep-based CI check as follow-up.
- **No synchronous feedback on sign-out completion**: the UI transition to `<LoginScreen />` is mediated by Firebase's auth listener, not by awaiting the `signOut` promise. In practice this is fast (<100ms); if a spinner becomes necessary, it must derive from `useAuth`'s `loading` flag, not from local button state.

### Neutral

- Does not preclude adding a future feature that requires programmatic sign-out (e.g., auto-logout on session expiry). Such a feature would invoke `signOut` from a dedicated "session expiry watcher" hook — still outside the storage-port effect chain, still resolving via the same auth-transition path.

## Alternatives Considered

### Alternative 1 — Explicit unsubscribe in `SignOutButton.onPress` before calling `signOut`

```ts
onPress: async () => {
  unsubscribeAll();    // call first
  await signOut();
}
```

**Rejected.** Requires plumbing `unsubscribeAll` from `useAppInitialization` through `App.tsx` → `AppShell` → `SignOutButton`. Creates **two** unsubscribe paths (manual + effect cleanup), which must be kept idempotent forever. Violates the principle that lifecycle should be driven by a single observable. Adds surface area without benefit — the React effect cleanup already runs on the exact same transition.

### Alternative 2 — Call `signOut` from inside `useAppInitialization`'s effect on some trigger

**Rejected (critical).** This is the specific anti-pattern this ADR forbids. `useAppInitialization`'s effect is responsible for *reacting to* auth state, not *driving* it. Calling `signOut` from within that effect creates a retrigger loop and inverts the direction of the data flow that the rest of the architecture depends on.

### Alternative 3 — Introduce an `AuthContext` and let `SignOutButton` consume it directly

**Rejected.** No behavioral benefit for this feature (see wave-decisions.md §2, Option B rejection). Adds abstraction overhead for a single consumer. Revisit if ≥3 consumers emerge.

### Alternative 4 — Collapse `useAuth` and `useAppInitialization` into a single hook

**Rejected.** They have legitimately distinct concerns: `useAuth` owns identity state; `useAppInitialization` owns user-scoped service construction. Conflating them would make this ADR's invariant *harder* to enforce, not easier, because the unsubscribe cleanup would then live next to the `signOut` call site, inviting the exact bug we are preventing.

## Enforcement (Recommended Follow-up)

- CI grep rule: `rg 'signOut\(' src/hooks/useAppInitialization.ts src/adapters/` must return zero matches.
- Reviewer checklist entry: "Does this PR call `signOut` from anywhere other than a UI event handler?"
- Acceptance test AC-3 (logout.acceptance.test.tsx) asserts `unsubscribe` spies are called exactly once on sign-out — a listener leak or double-unsubscribe would fail this test.

## References

- `src/hooks/useAppInitialization.ts` lines 297–327 (effect with cleanup)
- `src/hooks/useAuth.ts` lines 16–22 (`onAuthStateChanged` subscription)
- `src/auth/AuthService.ts` lines 63–65 (`signOut` adapter)
- `App.tsx` lines 13–62 (composition root)
- Feature DESIGN: `docs/feature/logout-button/design/wave-decisions.md`
