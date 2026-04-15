# Test Scenarios — web-prod-deploy

## Scenario inventory

| # | Scenario | Feature file | Story | Type | Tags |
|---|---|---|---|---|---|
| 1 | firebase.json declares public dir | walking-skeleton | US-01 | happy | @real-io @us-01 |
| 2 | firebase.json declares SPA rewrite | walking-skeleton | US-01 | happy | @real-io @us-01 |
| 3 | .firebaserc maps default project | walking-skeleton | US-01 | happy | @real-io @us-01 |
| 4 | deploy-web.yml chains off CI via workflow_run | walking-skeleton | US-02 | happy | @real-io @us-02 |
| 5 | deploy-web.yml gates on conclusion==success and branch==main | walking-skeleton | US-02 | error path | @real-io @us-02 |
| 6 | deploy-web.yml pins checkout to workflow_run.head_sha | walking-skeleton | US-02 | integrity | @real-io @us-02 |
| 7 | deploy-web.yml uses FIREBASE_SERVICE_ACCOUNT secret | walking-skeleton | US-02, US-03 | happy | @real-io @us-02 |
| 8 | deploy-web.yml runs `npm ci` + `npm run build` in /web | walking-skeleton | US-02 | happy | @real-io @us-02 |
| 9 | deploy-web.yml concurrency prevents cancel-in-progress | walking-skeleton | US-02 | integrity | @real-io @us-02 |
| 10 | ci.yml is not modified | walking-skeleton | US-02 | invariant | @real-io @us-02 |
| 11 | docs/deploy.md exists with prod URL | milestone-1-docs | US-04 | happy | @real-io @us-04 |
| 12 | docs/deploy.md documents rollback command | milestone-1-docs | US-04 | happy | @real-io @us-04 |
| 13 | docs/deploy.md documents manual fallback | milestone-1-docs | US-04 | error recovery | @real-io @us-04 |
| 14 | docs/deploy.md documents secret rotation | milestone-1-docs | US-04, US-03 | happy | @real-io @us-04 |
| 15 | README.md links to docs/deploy.md | milestone-1-docs | US-04 | happy | @real-io @us-04 |

## Error-path coverage

Error / integrity / invariant scenarios: 5 & 6 & 9 & 10 & 13 = **5 of 15 = 33 %**.

The 40 % target is a guideline; this feature's failure modes are:
- "file missing" (covered implicitly — every happy-path assertion fails if file absent),
- "wrong gating in workflow" (scenarios 5, 6, 9),
- "ci.yml accidentally modified" (scenario 10),
- "manual fallback not discoverable" (scenario 13).

Pushing to 40 % would add low-value negative scenarios ("what if firebase.json is empty JSON", "what if .firebaserc points at wrong project"). Skipped per diminishing returns; happy-path assertions on content shape already catch these.

## Coverage table (adapters)

Mandate 6: every driven adapter has a `@real-io` scenario.

| Driven adapter | @real-io scenario | Covered by |
|---|---|---|
| Filesystem reads of repo config | YES | WS scenarios 1–10, milestone scenarios 11–15 |
| YAML parser (workflow YAML) | YES | WS scenarios 4–10 |
| JSON parser (firebase.json, .firebaserc) | YES | WS scenarios 1–3 |
| Firebase CLI | NO — **by design** | Not a jest-testable adapter; validated out-of-band by K5 drill post-DELIVER |
| GitHub Actions runtime | NO — **by design** | Not a jest-testable adapter; validated by first green production push post-DELIVER |

No "NO — MISSING" rows. The two "NO — by design" rows are intentional: simulating Firebase CLI or GitHub Actions from jest would be fake integration. Real validation happens once, live, post-DELIVER.

## Traceability to KPIs

| Scenario group | KPI supported |
|---|---|
| 1–3 (firebase config) | K5 (fresh-checkout deploy) |
| 4–10 (deploy workflow) | K1 (lead time), K2 (success rate) |
| 11–15 (docs) | K3 (rollback discoverability) |

## One-at-a-time implementation order (for DELIVER)

1. Enable scenarios 1–3 (firebase.json + .firebaserc) — US-01
2. Enable scenarios 4–10 (deploy-web.yml) — US-02 (also unblocks US-03 operationally)
3. Enable scenarios 11–15 (docs) — US-04

All start `@skip` → crafter removes one tag at a time, TDD-cycles the minimal config/workflow/doc change to turn the test green.
