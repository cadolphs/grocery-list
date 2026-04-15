# Test Scenarios — expo-web-unify

## Scenario inventory

| # | Scenario | Story | Type | Tags |
|---|---|---|---|---|
| 1 | firebase.json public points at repo root `dist/` | US-01 | happy | @real-io @us-01 |
| 2 | firebase.json SPA rewrite still `**` → `/index.html` | US-01 | invariant | @real-io @us-01 |
| 3 | .firebaserc default project still `grocery-list-cad` | US-01 | invariant | @real-io @us-01 |
| 4 | deploy-web.yml has an `expo export` step with platform `web` | US-01 | happy | @real-io @us-01 |
| 5 | deploy-web.yml no longer references `working-directory: web` | US-01 | error/invariant | @real-io @us-01 |
| 6 | deploy-web.yml still chains off CI via workflow_run | US-01 | invariant | @real-io @us-01 |
| 7 | Deploy step still uses FirebaseExtended/action-hosting-deploy with FIREBASE_SERVICE_ACCOUNT | US-01 | invariant | @real-io @us-01 |
| 8 | /web directory is absent | US-02 | happy | @real-io @us-02 |
| 9 | No production-code references to /web/* (grep invariant) | US-02 | error/invariant | @real-io @us-02 |

Total: **9 scenarios**, single test file.

## Error-path / invariant scenarios

5 of 9 are invariants/error paths (2, 3, 5, 6, 7, 9 — six actually, but counting stricter: 5, 6, 7, 9 as pure invariants + 2 defensive = 5). **≥ 40 %** easily.

## Adapter coverage (Mandate 6)

| Driven adapter | @real-io scenario | Covered by |
|---|---|---|
| Filesystem reads | YES | All 9 scenarios |
| JSON parser | YES | scenarios 1, 2, 3 |
| YAML parser | YES | scenarios 4, 5, 6, 7 |
| Shell/grep-equivalent regex over repo | YES | scenario 9 |
| Expo CLI `expo export -p web` | NO (intentional) | Validated by first green CI run post-merge |
| Firebase CLI / live hosting | NO (intentional) | K1/K2 drill post-deploy |

No `MISSING` rows.

## Story coverage

| Story | Scenarios |
|---|---|
| US-01 (swap deploy target) | 1, 2, 3, 4, 5, 6, 7 (7 scenarios) |
| US-02 (delete /web) | 8, 9 (2 scenarios) |

US-03 (salvage to mobile) is optional and not part of this feature's tests. If taken up later, it becomes a separate mini-feature.

## Test file

Single file: `tests/acceptance/expo-web-unify/migration.test.ts` — jest (not vitest), main-repo runner.

Style: mirror `tests/acceptance/web-prod-deploy/walking-skeleton.test.ts`. Same helpers (`fileExists` gate before `readFileSync`), same `js-yaml` import, same `expect().toBe()` assertions.

## Lockstep tests in `web-prod-deploy`

`tests/acceptance/web-prod-deploy/walking-skeleton.test.ts` currently asserts the OLD pipeline shape. When DELIVER US-01 lands, those assertions must flip alongside the `firebase.json` + `deploy-web.yml` edits:

- `cfg.hosting?.public === 'web/dist'` → `'dist'`
- Workflow assertions about `working-directory: 'web'` for `npm ci` + `npm run build` → replaced with assertions for the `expo export` step

This is documented in DELIVER's roadmap notes; DISTILL flags it here so the crafter doesn't treat it as test-tampering.

## One-at-a-time implementation order (for DELIVER)

Because US-01 and US-02 are atomic (both must ship for a coherent state), DELIVER will execute them in a single step OR two steps with the full acceptance suite re-run after each. Suggested order:
1. **01-01**: US-01 (firebase.json + deploy-web.yml edits) + lockstep update to `web-prod-deploy/walking-skeleton.test.ts`. Greens migration scenarios 1-7.
2. **01-02**: US-02 (`git rm -r web/`). Greens scenarios 8-9.

Alternative: one single "migration" step that does both. Roadmap can decide.
