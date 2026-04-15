# Acceptance Review — expo-web-unify

## Red-gate snapshot

Executed: `npx jest tests/acceptance/expo-web-unify --no-coverage`

```
Test Suites: 1 failed, 1 total
Tests:       6 failed, 4 passed, 10 total
```

| Scenario | State | Why |
|---|---|---|
| 1. hosting.public = "dist" | RED | still "web/dist" |
| 2. SPA rewrite preserved | GREEN | invariant — unchanged |
| 3. .firebaserc unchanged | GREEN | invariant — unchanged |
| 4. `expo export` step present | RED | current workflow builds /web |
| 5. no steps rooted in /web | RED | current workflow has `working-directory: web` |
| 6. no `npm ci`/`npm run build` in /web | RED | current workflow has both |
| 7. workflow_run gating still correct | GREEN | invariant — preserved |
| 8. Firebase deploy action still wired | GREEN | invariant — preserved |
| 9. /web absent | RED | still present |
| 10. no production refs to /web/* | RED | firebase.json + deploy-web.yml currently reference `web/dist` and `working-directory: web` |

Note: 10 test counted (one describe has 2 assertions; the discrepancy vs the 9 "scenarios" in `test-scenarios.md` is because the "firebase.json SPA rewrite" scenario split into one jest test, and the "no forbidden working-directory" assertion became its own test alongside the `expo export` positive-case test).

**Zero BROKEN**: every failure is `expect(X).toBe(Y)` or `expect(...).toEqual([])` — jest assertion failures, not import errors. Same file-absence-gated pattern proven in `web-prod-deploy`.

## Coverage review

- Both user stories (US-01 swap target, US-02 delete /web) exercised.
- Invariants from `web-prod-deploy` (SPA rewrite, .firebaserc, workflow_run gating, Firebase action) preserved and re-asserted here.
- Error-path coverage: 4+ of 10 scenarios are invariants / negative assertions → ≥ 40 %.

## Adapter coverage (Mandate 6)

| Adapter | @real-io scenario | Covered by |
|---|---|---|
| Filesystem reads | YES | all 10 tests |
| JSON parser | YES | tests 1-3 |
| YAML parser | YES | tests 4-8 |
| Tree walker (grep-equivalent) | YES | test 10 |
| Expo CLI `expo export -p web` | NO — intentional gap | validated post-deploy by first green CI run |
| Firebase CLI / live hosting | NO — intentional gap | K1/K2 live-URL drill post-deploy |

No MISSING rows. The two "intentional" gaps match the web-prod-deploy precedent (live system validation belongs in post-DELIVER drills, not jest).

## Lockstep-test flag for DELIVER

When DELIVER US-01 edits `firebase.json` and `deploy-web.yml`, it MUST also update the assertions in `tests/acceptance/web-prod-deploy/walking-skeleton.test.ts` that encode the OLD pipeline shape:

- `cfg.hosting?.public === 'web/dist'` → update to `'dist'`
- Two assertions about `working-directory: 'web'` and `npm ci` / `npm run build` inside /web → replace with assertions mirroring the `expo export` step (OR delete those assertions from web-prod-deploy and rely on expo-web-unify's tests to cover the new pipeline shape)

**Recommendation**: UPDATE the web-prod-deploy tests in-place (flip the literal `'web/dist'` to `'dist'`; update the working-directory + command assertions). This keeps the web-prod-deploy suite as "the deployed pipeline looks like X" and expo-web-unify's suite as "the migration away from Vite is complete". After DELIVER, both suites should be green together.

## Self-review

- [x] WS strategy declared (C — Real local)
- [x] WS scenarios tagged `@walking_skeleton @real-io`
- [x] Every driven port has a @real-io scenario
- [x] No InMemory doubles used
- [x] Container: none
- [x] Mandate 7: no production modules → no scaffolds; file-absence gated for RED-not-BROKEN
- [x] Tests RED on first run — verified above
- [x] Business language in feature file
- [x] Port-to-port principle respected (driving ports: filesystem + parsers)

## Handoff to DELIVER

**Primary inputs**:
- `tests/acceptance/expo-web-unify/migration.test.ts` — 10 tests, 6 currently RED
- `tests/acceptance/web-prod-deploy/walking-skeleton.test.ts` — must be updated in lockstep with the DELIVER migration (see above)
- `docs/feature/expo-web-unify/discuss/user-stories.md` — US-01 + US-02
- `docs/feature/expo-web-unify/distill/wave-decisions.md` — DWD-09 flags the lockstep work

**Implementation order** (recommended):
1. **01-01** — edit `firebase.json` (`"web/dist"` → `"dist"`), edit `.github/workflows/deploy-web.yml` (replace /web build steps with `npx expo export -p web` at repo root), update `tests/acceptance/web-prod-deploy/walking-skeleton.test.ts` lockstep assertions. Greens migration scenarios 1, 4, 5, 6; web-prod-deploy test suite stays green.
2. **01-02** — `git rm -r web/`. Greens migration scenarios 9, 10.

Could compress to a single step if the crafter prefers — both stories touch overlapping assertions and shipping them together is the right end-state.

**Post-DELIVER drills** (documented in `docs/deploy.md`):
- K1: open `https://grocery-list-cad.web.app` after the deploy completes; expect the full RN UI (not the Vite stripped-down form).
- K2: sign in with existing credentials; expect dashboard with real staples, sweep, etc.
- K3: hard-refresh; session persists via Firebase Auth localStorage (unchanged from prior setup).
