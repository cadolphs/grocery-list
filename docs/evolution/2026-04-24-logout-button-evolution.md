# Evolution: logout-button

Date: 2026-04-24
Type: Feature (nwave: /nw-discuss -> /nw-design -> /nw-distill -> /nw-deliver)
Branch merged to: main

## Feature Summary

Add a visible "Sign out" control to the authenticated app shell so that a signed-in user can end their session and return to the `LoginScreen`. The `AuthService.signOut()` port method and its exposure via `useAuth()` already existed — the gap was purely UI wiring. This feature closes that gap on both web and native via a single presentational component (`SignOutButton`) plus a one-prop extension to `AppShell` and a three-line wiring change in `App.tsx`.

## Business Context

Before this feature, a signed-in user had no UI path to end their session. On shared devices (the primary pain, embodied by the Maria persona on a household iPad), the only recourse was to force-quit the app and clear data — a workflow users experienced as both clunky and uncertain. For QA and account-switching flows (the Alex persona on web), it blocked efficient multi-account testing. The backing capability (`signOut` through the `AuthService` port, Firebase `browserLocalPersistence` teardown, `onAuthStateChanged` driving the route switch back to `LoginScreen`) was already proven end-to-end by the `web-auth` feature (evolution dated 2026-04-14). This feature adds the user-visible entry point that makes that capability reachable.

## Key Decisions

Extracted from DISCUSS, DESIGN, and DISTILL wave artifacts and carried through DELIVER:

**Option A — prop-drilled `signOut` via `AppShell`, not a new AuthContext.** DESIGN rejected Option B (`SignOutButton` reads from React Context) as premature: one consumer does not justify introducing an app-wide auth context, and the "should all auth state be context-served?" debate that would follow is not one this feature needs to resolve. One additional prop on `AppShell` is the shallowest prop chain possible (`App.tsx` → `AppShell` → `SignOutButton`). Option C (`SignOutButton` imports `firebase/auth` directly) was rejected as a critical ports-and-adapters violation.

**Lifecycle invariant captured in ADR-008.** The unsubscribe of the four Firestore listeners (staples, areas, section order, trip) on sign-out is an emergent consequence of React effect-cleanup running when `authUser` transitions to `null`, not a manual call from the sign-out handler. ADR-008 documents this so future contributors don't add redundant manual teardown (and so the invariant is trace-tagged in UAT-3).

**Walking skeleton strategy A (full InMemory).** Acceptance tests use `createNullAuthService` + null adapter factories with unsubscribe-tracking spies. A real-Firebase walking skeleton (Strategy C) would only exercise the same React state transition more slowly — no additional wiring bug class is caught. Integration coverage for the four Firestore adapters lives in pre-existing adapter tests.

**UAT-4 (network-error UI) deferred as @pending.** The error-surface banner + retry affordance is v1.1 work. US-01's Elevator Pitch and AC cover the happy path and the double-tap edge case; the network-failure UX needs its own copy/design pass that would expand the feature beyond "add the entry point."

**Mutation testing skipped by scope.** Per CLAUDE.md, Stryker's mutation scope is `src/domain/**` + `src/ports/**`. This feature touches only `src/ui/` and one line in `src/hooks/useAuth.ts` destructuring — no in-scope production code changed. Skipping is on-policy, not a gap.

**Review notes (approved-with-notes) preserved, not re-litigated.** Peer review raised two medium issues that were accepted as documented trade-offs rather than blockers:

- **M1** — `AppShell.signOut` prop relaxed from required to optional so pre-existing regression tests that render `<AppShell />` without auth wiring continue to compile. Documented inline on the prop declaration with the rationale (test-harness backward-compat; production path in `App.tsx` always supplies it).
- **M2** — the acceptance-test `TestAppRoot` harness's `useAppInitialization` argument mapping diverges slightly from production (`App.tsx`) in how the `factories` object is constructed. The divergence is documented inline; the production path remains the SSOT and is exercised by proxy through the shared component tree.

## Steps Completed

From `deliver/execution-log.json` and `deliver/roadmap.json`:

| Step  | Name                                                          | Status               |
|-------|----------------------------------------------------------------|----------------------|
| WS-1  | Walking skeleton — wire `SignOutButton` into `AppShell`        | PASS — 5 phases      |
| UAT-1 | Accessibility (label, size/focus via a11y queries)             | PASS — test activation + GREEN |
| UAT-2 | Session-end transition: tap Sign out → LoginScreen visible     | PASS — test activation + GREEN |
| UAT-3 | Listener-cleanup invariant (ADR-008) via spy factories         | PASS — test activation + GREEN |
| UAT-5 | Rapid double-tap coalesces into a single `signOut()` call      | PASS — driving disable/guard |

UAT-4 (network-error banner) remains `@pending` per the DISCUSS + DISTILL decision. An RPP L1–L4 refactor pass (commit `dbd8fb4`) was applied after UAT-5 GREEN.

RED_UNIT was `NOT_APPLICABLE` on every step — the feature is pure UI wiring with no new pure logic to extract; behavior is exercised at the composition root through acceptance tests. This is on-policy for `src/ui/**` work.

## Lessons Learned

1. **Pure-UI wiring is the clean case for Strategy A walking skeletons.** When every capability already exists behind a port and the only gap is a UI entry point, the `createNullAuthService` + null-adapter-factory stack exercises exactly the production React state-transition path. Adding a real-Firebase walking skeleton on top buys nothing beyond latency. Strategy A is not a compromise here; it is the proportional choice.

2. **Sidecar ADRs for cross-feature invariants pay off cheaply.** ADR-008 exists because UAT-3 needed a named, grep-able anchor for the "listener teardown is emergent from effect cleanup, not manual" invariant. The ADR took ~20 minutes to write and will save the next contributor from adding a manual `unsubscribeAll()` call inside the sign-out handler because "that seems safer." Lifecycle invariants deserve ADRs even when they come from framework semantics.

3. **Optional-prop backward-compat is a documented trade-off, not a smell.** The review's M1 (relaxing `AppShell.signOut` from required to optional so regression tests compile) was initially flagged as a correctness gap. In practice, making the prop optional with an inline comment and a production-path assertion in `App.tsx` is the right call for a codebase with pre-existing `AppShell` test harnesses that pre-date the auth feature. Tightening the prop would force either a wider refactor (all test harnesses must thread `signOut`) or a parallel `AuthenticatedAppShell` component — both are out of proportion to the actual risk.

4. **Mutation-scope policy is load-bearing for velocity.** Knowing up front (via CLAUDE.md) that this feature is outside Stryker's mutation scope meant DELIVER didn't have to carry a phantom mutation phase or justify a skip. The one-line policy ("UI components and adapters excluded — low mutation testing value") is cheap to write and saves every subsequent `src/ui/` feature from re-arguing the case.

## Mutation Gate

Skipped by policy. Feature touches only `src/ui/SignOutButton.tsx`, `src/ui/AppShell.tsx`, `App.tsx`, and `src/hooks/useAuth.ts` (destructure only) — all outside the Stryker scope (`src/domain/**` + `src/ports/**`) declared in `CLAUDE.md § Mutation Testing Strategy`.

## Test Suite State

- Full suite: **604 passed, 23 skipped**.
- TypeScript strict-mode: clean.
- ADR-008 lifecycle invariant: preserved (asserted by UAT-3 via spy factories on all four storage ports).
- Integrity verification: PASSED.

## Related Files

Production:

- `src/ui/SignOutButton.tsx` (new — presentational component)
- `src/ui/AppShell.tsx` (extended — optional `signOut` prop + button render)
- `App.tsx` (wiring — destructure `signOut` from `useAuth`, pass to `AppShell`)

Tests:

- `tests/acceptance/logout-button/logout-button.feature`
- `tests/acceptance/logout-button/logout-button.test.tsx`

Architecture / Decisions:

- `docs/adrs/ADR-008-signout-listener-lifecycle.md` (new — ADR for the emergent-teardown invariant)

Commits:

- `909dfee` — `feat(logout-button): wire SignOutButton into AppShell (WS-1 GREEN)`
- `50db8c7` — `test(logout-button): activate UAT-1 accessibility scenario (GREEN)`
- `f8f362f` — `test(logout-button): activate UAT-2 session-end acceptance`
- `783b044` — `test(logout-button): activate UAT-3 listener cleanup invariant (ADR-008)`
- `b7bc8f8` — `feat(logout-button): coalesce rapid double-tap into single sign-out`
- `dbd8fb4` — `refactor(logout-button): L1-L4 pass`
