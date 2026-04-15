# Acceptance Review — web-prod-deploy

## RED-gate snapshot

Executed: `npx jest tests/acceptance/web-prod-deploy --no-coverage`

Result: **17 tests, 16 RED, 1 GREEN** — pre-DELIVER state as expected.

| Suite | RED | GREEN | BROKEN |
|---|---|---|---|
| walking-skeleton.test.ts (10 tests) | 9 | 1 | 0 |
| milestone-1-docs.test.ts (7 tests) | 7 | 0 | 0 |
| **Total** | **16** | **1** | **0** |

The single GREEN test is the intentional invariant `ci.yml is untouched` (asserts the existing CI workflow still has exactly `["commit-stage"]` job and triggers on push/PR to main). It should stay GREEN throughout DELIVER — if it ever goes RED, DELIVER has accidentally modified the existing CI pipeline.

**Zero BROKEN**: every failing test fails via `expect(...).toBe(...)` / `expect(...).toContain(...)` assertion, not via Node `ENOENT` or `ImportError`. Mandate 7 spirit preserved — no production modules imported, no `__SCAFFOLD__` files needed.

## Failure-mode sample (verifying RED classification)

Example failure for scenario "firebase.json declares public dir":
```
expect(received).toBe(expected) // Object.is equality
Expected: true
Received: false
  at Object.readFile (…walking-skeleton.test.ts:38:27)
```
Jest `expect().toBe()` failure = RED. Correct.

## Coverage review

- All 4 user stories (US-01 … US-04) have ≥1 scenario.
- US-03 partial: secret *reference* in workflow is asserted; actual service-account functionality requires live Firebase and is validated once post-DELIVER via K5 drill (documented in `docs/deploy.md`).
- Integration checkpoints: ci.yml↔deploy-web.yml (scenarios 4 & 10), repo↔firebase CLI (scenarios 1–3), repo↔GitHub runner (scenarios 5–9), prod-URL↔human (scenarios 11–15).
- Error / invariant / integrity scenarios: 5 of 15 = 33% (see `test-scenarios.md` for rationale on 40 % guideline).

## Adapter coverage (Mandate 6)

| Adapter | @real-io scenario | Status |
|---|---|---|
| Filesystem reads | WS 1–10, M1 11–15 | COVERED |
| YAML parser | WS 4–10 | COVERED |
| JSON parser | WS 1–3 | COVERED |
| Firebase CLI | (out of jest scope, K5 drill) | INTENTIONAL GAP |
| GitHub Actions runtime | (out of jest scope, first green push) | INTENTIONAL GAP |

No "MISSING" rows. Two "INTENTIONAL GAP" rows are live-system validations out of jest scope — validated post-DELIVER.

## Self-review

- [x] WS strategy declared: C (Real local)
- [x] WS scenarios tagged `@real-io @walking_skeleton`
- [x] Every driven adapter has a `@real-io` scenario
- [x] InMemory doubles: none (documented in wave-decisions DWD-01)
- [x] Container preference: none (documented)
- [x] Mandate 7 via file-absence RED (documented in DWD-04)
- [x] Tests are RED (not BROKEN) on first run — verified above
- [x] Business language in feature files: yes (no "database/API/endpoint" jargon)
- [x] Error path coverage: 33% (rationale documented)
- [x] One-at-a-time DELIVER order documented in `test-scenarios.md`

## Sign-off prerequisites

- [x] All 16 RED tests classify cleanly via jest assertion (verified).
- [x] 1 GREEN invariant is stable (ci.yml unchanged).
- [x] No `@skip` tags used — DELIVER can work the stories in the documented order without removing tags (all tests already enabled; removing an assertion failure is the act of implementation).

## Handoff to DELIVER

**Primary inputs**:
- `tests/acceptance/web-prod-deploy/walking-skeleton.{feature,test.ts}` — US-01 + US-02
- `tests/acceptance/web-prod-deploy/milestone-1-docs.{feature,test.ts}` — US-04 (+ US-03 doc portion)
- `docs/feature/web-prod-deploy/devops/ci-cd-pipeline.md` — workflow template to implement verbatim for US-02
- `docs/feature/web-prod-deploy/devops/environments.yaml` — environment preconditions

**Implementation order** (per `test-scenarios.md`):
1. Create `firebase.json` + `.firebaserc` — greens WS scenarios 1–3
2. Create `.github/workflows/deploy-web.yml` — greens WS scenarios 4–10
3. Create `docs/deploy.md` + update `README.md` — greens milestone-1 scenarios 11–15
4. Post-merge (out of jest): provision service account, set GitHub secret, observe first green deploy, run K3 + K5 drills, record times in `docs/deploy.md`.
