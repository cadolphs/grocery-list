# DISTILL Decisions — web-auth

## Key Decisions

- **[DWD-01] WS strategy = B (Real local + fake costly).** Pure-module tests (`validation`, `error-mapping`, `AuthService` shape) use real code directly. React component tests (`LoginScreen`, `App`, `useAuthState`) inject `createNullAuthService()` as in-memory double. Live Firebase Auth never invoked from the test suite — validated once post-DELIVER via manual K1/K2 drill (same pattern as `web-prod-deploy` K3/K5).
- **[DWD-02] Test runner = vitest + RTL + jsdom.** Matches existing `/web` tooling (`web/package.json` + `web/src/test-setup.ts`). Main-repo jest does NOT run `/web` tests (jest config excludes `/web/`).
- **[DWD-03] Driving ports**:
  - `AuthService` factory surface (`signIn`, `signUp`, `signOut`, `onAuthStateChanged`) — exercised by `useAuthState` hook tests + LoginScreen tests via `NullAuthService` injection.
  - `LoginScreen` component props (`signIn`, `signUp`) — exercised via RTL render + user events.
  - `App` component — top-level driving port for sign-in-to-dashboard acceptance scenarios.
  - `validateFormInput` and `mapAuthError` pure functions — tested directly as their own ports (they are the adapters for "user input validation" and "Firebase error copy").
- **[DWD-04] Mandate 7 = real scaffold stubs.** Unlike `web-prod-deploy` (config-only), this feature imports production TS modules. Create RED-ready stubs in `/web/src/auth/` and `/web/src/components/` with `export const __SCAFFOLD__ = true` and methods that `throw new Error("Not yet implemented — RED scaffold")`. Tests will see throws (RED) not `ImportError`/`ModuleNotFoundError` (BROKEN).
- **[DWD-05] Existing `App.test.tsx` will be rewritten in DELIVER**, not in DISTILL. The current test mocks the stale `./hooks/useAuth` module which this feature deletes — keeping the old test RED throughout DISTILL is acceptable (it's the regression signal for US-01 cleanup). DELIVER US-01 replaces the test content as part of the same step that deletes `/web/src/hooks/useAuth.ts`.
- **[DWD-06] No Gherkin runner.** `.feature` files are human documentation only; executable tests are vitest `describe`/`it`. Scenario names in vitest mirror the Gherkin names 1:1 so traceability is mechanical.
- **[DWD-07] Tag convention** (applied to Gherkin + vitest describe tags):
  - `@real-io` — pure-module tests (validation + error-mapping direct tests)
  - `@in-memory` — tests using `NullAuthService` double
  - `@walking_skeleton` — end-to-end sign-in via App + LoginScreen + NullAuthService
  - `@us-01..@us-07` — story trace
  - No `@skip` tags: feature is small enough (~3 h) to deliver all stories in a single cycle.
- **[DWD-08] Coverage table — driving adapters and their `@real-io` scenarios**:

  | Adapter / port | `@real-io` / `@in-memory` | Covered by |
  |---|---|---|
  | `validateFormInput` (pure) | `@real-io` | Direct unit tests in `validation.test.ts` |
  | `mapAuthError` (pure) | `@real-io` | Direct unit tests in `error-mapping.test.ts` |
  | `AuthService` factory surface | `@in-memory` (via `NullAuthService`) | `useAuthState.test.ts` + `LoginScreen.test.tsx` |
  | `useAuthState` hook | `@in-memory` | `useAuthState.test.ts` |
  | `LoginScreen` component | `@in-memory` | `LoginScreen.test.tsx` |
  | `App` component | `@in-memory` | `App.test.tsx` (rewritten by DELIVER US-01) |
  | Firebase Auth live SDK | — (intentional gap) | K1/K2 manual drill post-DELIVER, documented in `docs/deploy.md` |

  No "MISSING" rows. Firebase Auth as a live adapter is intentionally out of the vitest scope — same rationale as the `web-prod-deploy` K3/K5 drills.

- **[DWD-09] Error-path coverage**: ~50 % of scenarios exercise error/edge paths (validation failures, Firebase rejections, mode transitions, loading state). Exceeds the 40 % guideline because US-04 (validation) and US-05 (error mapping) are each almost entirely error-path stories.

## Reconciliation result

- Prior-wave files read: 8 of 9 (DEVOPS absent by design)
- Contradictions found: **0**
- Soft-gate files missing: `docs/product/kpi-contracts.yaml` (not maintained)

## DEVOPS-skip justification

Per DESIGN handoff note and DISCUSS `outcome-kpis.md`: no infra change, no new deployments, no dashboards. The only ops-surface change is enabling the Email/Password provider in the Firebase console (D12) — a one-time manual action documented for the user at push time. Standard DEVOPS artifacts (CI pipeline, environment matrix, observability) would all be no-ops; running `/nw-devops web-auth` would produce boilerplate with no substantive content.

## Container preference

None (same as existing `/web` test suite).

## Self-review checklist

- [x] WS strategy declared (DWD-01)
- [x] WS scenarios tagged per strategy (`@walking_skeleton @in-memory`)
- [x] Every driven port has a @real-io or @in-memory scenario (DWD-08)
- [x] InMemory double documented: `createNullAuthService` cannot model Firebase's internal token refresh, session restore from real localStorage, or network timeouts — those gaps are intentionally covered by the K1/K2 post-DELIVER drill
- [x] Container preference: none
- [x] Mandate 7: scaffolds at `/web/src/auth/*.ts` + `/web/src/components/LoginScreen.tsx` (DWD-04)
- [x] Mandate 7: all scaffolds include `__SCAFFOLD__ = true`
- [x] Mandate 7: scaffold methods `throw new Error("... RED scaffold")` — vitest classifies thrown Error as test failure (RED)
- [x] Tests will be RED (not BROKEN) on first run — verified in `acceptance-review.md` after running `cd web && npm test`
