# DISTILL Decisions — expo-web-unify

## Key Decisions

- **[DWD-01] WS strategy = C (Real local).** Tests are filesystem-state assertions on the repo itself. No doubles — real `fs.readFileSync` + `js-yaml` + `JSON.parse`. Live URL / Expo web bundle content validated manually post-deploy (analogous to `web-prod-deploy` K1/K2 drills).
- **[DWD-02] Test runner = main-repo jest.** Tests live in `tests/acceptance/expo-web-unify/` (jest-expo preset). Unlike `web-auth`, this feature does NOT use vitest — `/web/` is deleted by this feature, so a vitest suite under `/web/` would disappear along with it. Main-repo jest's `testPathIgnorePatterns: ["/web/"]` naturally excludes the deleted directory.
- **[DWD-03] Driving ports**: repo filesystem + YAML/JSON parsers. Same shape as `web-prod-deploy`. Tests are fundamentally "assert the deploy pipeline and repo layout look right after migration".
- **[DWD-04] No production modules introduced → no Mandate 7 scaffolds needed.** Implementation is config edits + directory deletion; zero new TS/JS modules. Tests gate file reads on `fs.existsSync` so absent files produce jest `expect().toBe()` assertions (RED), not `ENOENT` throws (BROKEN). Same pattern as `web-prod-deploy`.
- **[DWD-05] Tag convention**: `@real-io`, `@walking_skeleton`, `@us-01`, `@us-02`. Optional US-03 (salvage validation to mobile) is not in this feature's test file; if Clemens picks it up later, it's a separate feature.
- **[DWD-06] No environment matrix parametrization.** Single environment (repo checkout). Live-URL drill is out-of-jest-scope (post-deploy manual).
- **[DWD-07] Error-path coverage**: this feature's error paths are structural invariants — "web/ must not exist", "ci.yml must not be modified", "deploy-web.yml must not still reference /web". Roughly 40 % of the scenario set are invariants/error paths (3 of ~8).
- **[DWD-08] Adapter coverage table**: filesystem + JSON parser + YAML parser → all `@real-io` via direct `fs.readFileSync` + `JSON.parse` + `js-yaml.load`. Same as `web-prod-deploy`. No MISSING rows.
- **[DWD-09] Transitional test coexistence**: during DISTILL, these new tests fail RED (firebase.json still has `"web/dist"`, deploy-web.yml still has `cd web`, /web still exists). Existing `tests/acceptance/web-prod-deploy/` tests are either still GREEN or their invariants are about to flip — specifically the `firebase.json public: "web/dist"` assertion and the `deploy-web.yml` build-step checks in `web-prod-deploy`'s walking-skeleton.test.ts. DELIVER must update those web-prod-deploy tests in lockstep with the migration (US-01 covers this) OR move/rewrite the affected assertions. The cleanest approach: when `firebase.json` is edited in DELIVER, also update the corresponding assertions in `tests/acceptance/web-prod-deploy/walking-skeleton.test.ts`. Document this as part of the DELIVER roadmap; DISTILL flags it here.

## Reconciliation result

- Prior-wave files read: 4 of 9 (DESIGN + DEVOPS absent by design; kpi-contracts.yaml not maintained; distill/ files TBD — this one)
- Contradictions found: **0**

## Transitional-test lockstep (important for DELIVER)

`web-prod-deploy`'s walking-skeleton.test.ts has assertions that become FALSE after this feature ships:

- `firebase.json hosting.public === "web/dist"` → becomes `"dist"`
- `deploy-web.yml` has "one step runs 'npm ci' with working-directory 'web'" → that step is replaced by `npx expo export -p web` at root
- `deploy-web.yml` has "one step runs 'npm run build' with working-directory 'web'" → replaced by `expo export`

DELIVER's US-01 step MUST update those assertions in `tests/acceptance/web-prod-deploy/walking-skeleton.test.ts` alongside the `firebase.json` + `deploy-web.yml` edits. This is a legitimate test update (reflecting a superseded decision), NOT test-tampering.

A cleaner framing: the `web-prod-deploy` tests codify a specific pipeline shape. `expo-web-unify` replaces that shape with a new one. The updated assertions in `web-prod-deploy`'s test file reflect the new pipeline.

## Container preference

None.

## Self-review

- [x] WS strategy declared (DWD-01)
- [x] WS scenarios tagged `@walking_skeleton @real-io`
- [x] Every driven port has a @real-io scenario (DWD-08)
- [x] Doubles: none used
- [x] Container: none
- [x] Mandate 7: no production modules → no scaffolds → file-absence-gated tests produce jest RED. Same proven pattern as `web-prod-deploy`.
- [x] Tests will be RED on first run (verified by running `npx jest tests/acceptance/expo-web-unify/` after creation)
