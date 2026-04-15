# web-prod-deploy — Evolution Artifact

**Date**: 2026-04-15
**Feature ID**: web-prod-deploy
**Wave**: DEVOPS / DELIVER (finalized)
**Status**: Complete — production live, CI-gated deploy workflow green on `main`
**Supersedes**: `docs/evolution/web-prod-deploy-evolution.md` (undated interim artifact from 2026-04-14; retained for history)

## Summary

Established a production web-deploy path for grocery-list. A push to `main` that
passes `ci.yml` triggers a CI-gated `deploy-web.yml` workflow which publishes
the Expo web export to Firebase Hosting at
[https://grocery-list-cad.web.app](https://grocery-list-cad.web.app). No
application code changed; the feature is entirely hosting config, a GitHub
Actions workflow, a runbook, and acceptance scaffolding asserting the repo-state
shape. Single-user scope: no preview channels, no staging, no custom domain, no
auto-rollback, no custom observability stack.

The prior session left an `ae5351e wip(web-prod-deploy)` commit that looked
in-flight; it is not. Execution log (schema v3) shows all three roadmap steps at
COMMIT phase with `s=EXECUTED`, `d=PASS`; all 17 acceptance tests pass; the
`deploy-web.yml` run on `main` (GH Actions run 24433411004) is green; the
production URL returns HTTP 200. This artifact formalizes finalization on
2026-04-15.

## Business Context

Prior to this feature there was no reproducible web-deploy path. Every deploy
was a manual laptop action with no CI gate and no audit trail. Firebase Hosting
was already adjacent (the project was in use for Firestore + Auth), so reusing
it avoided introducing a second provider. GitHub Actions was already the CI
platform, so no new tooling was introduced. Goal: one-push-to-deploy with
red-CI-blocks-deploy safety and a one-command rollback, sized for single-user
traffic.

## Commits on `main`

| SHA | Subject |
|---|---|
| `5f967dd` | feat(web-prod-deploy): add Firebase Hosting config (US-01) |
| `704c2ab` | feat(web-prod-deploy): add GitHub Actions deploy-web workflow (US-02, US-03) |
| `e45dec2` | docs(web-prod-deploy): add deploy runbook + README deployment section (US-04) |
| `194c8a3` | docs(web-prod-deploy): add evolution artifact + finalize DELIVER wave (interim) |
| `ae5351e` | wip(web-prod-deploy): commit in-progress nwave feature + acceptance tests |

The `wip` label on `ae5351e` is cosmetic; the underlying feature work was
complete at that point.

## User Stories Delivered

All four stories trace to journey `publish-web`:

| Story | Scope | Status |
|---|---|---|
| US-01 | `firebase.json` + `.firebaserc` checked in; SPA rewrite; `public = dist` | Delivered in `5f967dd` |
| US-02 | Push-to-main auto-deploys gated by green `ci.yml` | Delivered in `704c2ab` |
| US-03 | Firebase service account secret provisioned + least-privilege + rotation runbook | Delivered in `704c2ab` + `e45dec2` |
| US-04 | `docs/deploy.md` + README Deployment section | Delivered in `e45dec2` |

## Roadmap Steps (execution log, schema v3)

Three steps, all walking-skeleton scope; no DESIGN wave (feature type =
infrastructure; DESIGN intentionally skipped by platform architect).

| Step | Phases EXECUTED/PASS | Commit |
|---|---|---|
| 01-01 | PREPARE, RED_ACCEPTANCE, GREEN, COMMIT (RED_UNIT skipped — infrastructure-only) | `5f967dd` |
| 01-02 | PREPARE, RED_ACCEPTANCE, GREEN, COMMIT (RED_UNIT skipped — infrastructure-only) | `704c2ab` |
| 01-03 | PREPARE, RED_ACCEPTANCE, GREEN, COMMIT (RED_UNIT skipped — docs-only) | `e45dec2` |

## Key Decisions by Wave

### DISCUSS

- **[D1]** Feature type = infrastructure. No UI, no domain change.
- **[D5]** Hosting provider = Firebase Hosting (inherited from cloud-sync-and-web tech stack; not re-litigated).
- **[D6]** Deploy trigger = push to `main` after CI green. Not `workflow_dispatch`, not tag-based. Matches solo-dev single-branch workflow.
- **[D7]** Auth = GitHub Actions service-account secret `FIREBASE_SERVICE_ACCOUNT`. Rejected OIDC federation (more setup for no security gain at single-dev scale).
- **[D8]** Strict scope bounds. No preview channels, no staging, no custom domain, no auto-rollback.
- Five KPIs defined: K1 lead time, K2 success rate, K3 rollback time, K4 availability, K5 time-to-first-deploy.

### DEVOPS (DESIGN wave intentionally skipped)

- **[D3]** CI/CD platform = GitHub Actions; already owned `ci.yml` and `mutation.yml`.
- **[D4]** Extend existing CI/CD, don't modify. `ci.yml` unchanged; new `deploy-web.yml` chains via `workflow_run`. Rejected alternative: adding a deploy job to `ci.yml` (couples rerun semantics of tests and deploys).
- **[D5]** Observability = built-in only (GitHub Actions run history + Firebase console). No Grafana / Datadog / ELK / PagerDuty.
- **[D6]** Deployment strategy = atomic release swap (Firebase default). No canary or progressive rollout — single-user traffic makes them meaningless.
- **[D10]** Secret = Repository Secret `FIREBASE_SERVICE_ACCOUNT`, Firebase Hosting Admin only (no Firestore / Auth / IAM). Rotation procedure in `docs/deploy.md`.
- **[D11]** Deploy gate = `workflow_run.conclusion == 'success'` AND `branches: [main]`. PR CI runs do not deploy.
- **[D12]** Deploy pins to `workflow_run.head_sha`. Prevents race with newer push landing mid-deploy.
- **[D13]** Concurrency group `deploy-web`, `cancel-in-progress: false`. Queue in-flight deploys; never kill them.
- **[D8]** Branching = GitHub Flow. `main` + optional short-lived feature branches + PRs.
- **[D9]** Mutation testing = per-feature (project default unchanged).

### DISTILL

- **[DWD-01]** WS strategy = C (real local filesystem I/O). Tests exercise real reads against repo config files. No InMemory doubles — no ports to fake. No live deploys invoked from tests.
- **[DWD-02]** Driving ports = filesystem + YAML/JSON parsers. DESIGN wave skipped; driving ports inherited from DEVOPS artifacts.
- **[DWD-03]** No browser / no live-deploy scenarios. K3 (rollback drill) and K5 (first-deploy drill) are out-of-band manual activities, documented in the runbook.
- **[DWD-04]** Mandate 7 satisfied via file-absence RED, not module-stub RED. No production modules to scaffold.

## Quality Gates

| Gate | Result |
|---|---|
| web-prod-deploy acceptance | 17/17 GREEN (`tests/acceptance/web-prod-deploy/`) |
| Full repo jest suite | 567 passed / 22 skipped / 0 failed (pre-expo-web-unify baseline; 577 post) |
| DES integrity | All 3 steps traced PREPARE → RED_ACCEPTANCE → (RED_UNIT skipped, justified) → GREEN → COMMIT |
| `deploy-web.yml` on `main` | GH Actions run 24433411004 green |
| Production URL | HTTP 200 at `https://grocery-list-cad.web.app` |

### Mutation Testing — Skipped (justified)

Project mutation strategy is per-feature, scoped to `src/domain/**` and
`src/ports/**` (see `CLAUDE.md`). This feature touched neither:

```
git diff --name-only 5f967dd~1..e45dec2 -- 'src/domain/**' 'src/ports/**'
# (empty)
```

Roadmap `implementation_scope.source_directories` is empty for this feature.
Skipping is the correct outcome, not an exception.

## KPIs to Track Post-Finalize

Drill KPIs (one-time; record back into this doc or a follow-up note):

| ID | KPI | Target | When |
|---|---|---|---|
| K3 | Rollback wall-clock | < 120 s | Once, after a first production deploy that can be safely rolled back |
| K5 | Time-to-first-deploy from fresh checkout | < 10 min | Once, after a clean-machine bootstrap to validate runbook completeness |

Continuous KPIs (passive observation; no drill):

- **K1** deploy lead time: `gh run view --workflow=deploy-web.yml` — target p95 < 300 s.
- **K2** deploy success rate: `gh run list --workflow=deploy-web.yml` conclusion counts — target ≥ 95 % over 30 d.
- **K4** availability: Firebase Hosting inherited SLA — target ≥ 99.9 % monthly.

## Lessons Learned

- A `wip:` commit prefix is corrosive when the underlying work is actually done. Future: prefer reconciling the workspace before committing, or choose a subject line that accurately reflects state.
- Execution-log schema v3 (compact `p/s/d/sid` keys with `EXECUTED`+`PASS` pairing in lieu of `DONE`) is terse but needs decoding instructions in CLAUDE.md or the finalize skill; interpreting it cold cost a round of investigation.
- Skipping DESIGN wave for infrastructure-only features works well when the platform architect produces a sufficient DEVOPS-wave design instead. No DESIGN scaffold was missed.
- Acceptance tests that assert workflow-YAML structural shape (trigger, permissions, concurrency, step order) catch most deploy-workflow defects without needing a live-deploy test run — the right abstraction for an infra feature.

## Deferred Follow-Ups

- **Branch protection on `main`**: require `ci.yml` success before merge, require PR. Org/repo-admin config, not feature infrastructure.
- **K3 rollback drill**: execute and record once the first post-finalize deploy lands. Untested rollback is broken rollback.
- **K5 first-deploy drill**: execute once from a truly fresh checkout (clean machine or container) to validate runbook has no missing steps.
- **Secret rotation cadence**: `docs/deploy.md` documents the procedure but not a schedule. Revisit if multi-dev access is ever added.
- **Node.js 20 action-deprecation warnings**: already mitigated by `917c531` (opt JS actions into Node 24 runtime); keep an eye on further action version refreshes.

## Revisit Triggers

Any of the following should reopen DEVOPS decisions for this feature:

- Multi-user traffic (> single-user): re-evaluate D6 (atomic swap) and K4 (inherited SLA); canary or health-gated rollout becomes worth engineering.
- Multi-developer access: flip D10 (repo secret) to OIDC federation; enforce secret rotation cadence.
- Formal SLA commitment: K4 needs an external uptime monitor, not Firebase console.
- Preview / staging environments: scope bound excluded these; reopens `environments.yaml` and `deploy-web.yml` shape.

## Migrated Permanent Artifacts

- `docs/architecture/web-prod-deploy/` — platform architecture, CI/CD pipeline, infrastructure integration, observability design, monitoring/alerting, branching strategy, KPI instrumentation, environments.yaml (migrated from `docs/feature/web-prod-deploy/devops/`; no DESIGN subdir existed — DEVOPS wave took the architect role for this feature).
- `docs/scenarios/web-prod-deploy/` — test scenarios, walking skeleton (from `distill/`).
- `docs/ux/web-prod-deploy/` — publish-web journey YAML, feature file, visual map (from `discuss/`).

## Links

- Runbook: `docs/deploy.md`
- Production URL: https://grocery-list-cad.web.app
- Deploy workflow: `.github/workflows/deploy-web.yml`
- CI workflow (gate): `.github/workflows/ci.yml`
- Hosting config: `firebase.json`, `.firebaserc`
- Acceptance tests: `tests/acceptance/web-prod-deploy/`
- Interim evolution artifact (superseded): `docs/evolution/web-prod-deploy-evolution.md`
