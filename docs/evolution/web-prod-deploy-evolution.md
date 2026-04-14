# Evolution: web-prod-deploy

**Date**: 2026-04-14
**Feature**: Production web deployment pipeline for the grocery-list Expo web bundle
**Status**: DELIVERED (local commits on `main`, not yet pushed)

## Feature Summary

Established a production deployment path for the Expo web build to Firebase Hosting, driven by a CI-gated GitHub Actions workflow. No application code changed; all additions are infrastructure, workflow, or documentation. The feature delivers: `firebase.json` + `.firebaserc` hosting config, a `deploy-web.yml` workflow chained off the existing `ci.yml` via `workflow_run`, and a `docs/deploy.md` runbook plus a README deployment section.

## Business Context

The app had no reproducible way to publish the web build; any deploy was a manual laptop action with no audit trail and no CI gating. Firebase Hosting was already implicit (Firestore auth in the same project), so reusing it avoided introducing a second provider. GitHub Actions was already the CI platform, so no new tooling was introduced. The goal was a one-push-to-deploy path with red-CI-blocks-deploy safety and a rollback procedure, sized for single-user traffic.

## Commits (local, on `main`)

| SHA | Subject |
|---|---|
| `5f967dd` | feat(web-prod-deploy): add Firebase Hosting config |
| `704c2ab` | feat(web-prod-deploy): add GitHub Actions deploy-web workflow |
| `e45dec2` | docs(web-prod-deploy): add deploy runbook + README deployment section |

All three commits carry DES Step-ID markers and passed adversarial review with zero defects. A finalization commit (this evolution doc) follows as an orchestrator-only artifact.

## Files Added

- `firebase.json`, `.firebaserc` — Hosting config, public = `dist/`, SPA rewrite, no Functions/Firestore coupling
- `.github/workflows/deploy-web.yml` — `workflow_run`-triggered, pinned to CI-validated SHA, concurrency group prevents parallel deploys
- `docs/deploy.md` — runbook: first-time setup, routine deploy, rollback, secret rotation, manual laptop fallback
- `README.md` — deployment section linking into `docs/deploy.md`
- `tests/acceptance/web-prod-deploy/walking-skeleton.test.ts` — 17 repo-state + workflow-shape assertions

## Key Decisions by Wave

### DISCUSS

- Scope-bound to single-user traffic — no preview env, no staging, no custom domain, no synthetic uptime monitor
- Firebase Hosting chosen (already adjacent via Firestore); rejected Vercel/Netlify to avoid second provider
- Five KPIs defined: K1 lead time, K2 success rate, K3 rollback time, K4 availability, K5 time-to-first-deploy

### DESIGN (DEVOPS-wave)

- D4: extend CI/CD by chaining `deploy-web.yml` off `ci.yml` via `workflow_run`; rejected adding a deploy job to `ci.yml` (couples test reruns to deploys)
- D6: atomic release swap (Firebase default) — no canary/progressive, meaningless at single-user scale
- D10: Repository Secret `FIREBASE_SERVICE_ACCOUNT` — rejected OIDC federation (setup cost without security gain at this scale)
- D11: deploy gate = `workflow_run.conclusion == 'success'` AND `branches: [main]` — prevents PR CI runs from deploying
- D12: deploy pins to `workflow_run.head_sha` — prevents race with newer pushes mid-deploy
- D13: concurrency group `deploy-web`, `cancel-in-progress: false` — queue, never kill, in-flight deploys
- Observability = built-in only (GitHub Actions history + Firebase console); no Grafana/Datadog/PagerDuty

### DISTILL

- Acceptance shape = repo-state assertions + workflow-YAML structural assertions; no browser E2E (infrastructure feature, browser would assert nothing meaningful)
- Jest + yaml parser; 17 scenarios covering hosting config, workflow triggers/permissions/steps, runbook presence

### DELIVER

- Three steps, all walking-skeleton: 01-01 Hosting config, 01-02 Deploy workflow, 01-03 Runbook + README
- RED_UNIT skipped on all three with justification `NOT_APPLICABLE: infrastructure-only feature`
- All acceptance tests GREEN at each step (incremental 5 -> 11 -> 17 of 17)

## Quality Gates

- Acceptance: 17/17 GREEN for this feature
- Full repo test suite: 567 passed / 22 skipped / 0 failed
- DES integrity: all 3 steps have complete PREPARE -> RED_ACCEPTANCE -> RED_UNIT -> GREEN -> COMMIT traces
- Adversarial review: APPROVED, no defects
- Mutation testing: **SKIPPED by policy**. Per-feature strategy scopes mutations to `src/domain/**` and `src/ports/**`; this feature touched neither (verified: `git diff 5f967dd~1..e45dec2 --name-only` lists only `.firebaserc`, `.github/workflows/deploy-web.yml`, `README.md`, `docs/deploy.md`, `firebase.json`, and the acceptance test file).

## KPIs to Track Post-Merge

Two KPIs require one-shot drills post-merge; record results back into this doc or a follow-up note.

| ID | KPI | Target | When | How |
|---|---|---|---|---|
| K3 | Rollback wall-clock time | < 120 s | Once, after first successful production deploy | Stopwatch `firebase hosting:rollback`; verify prior build serves; record elapsed |
| K5 | Time-to-first-deploy from fresh checkout | < 10 min | Once, after push to main enables the workflow | Stopwatch fresh clone -> secret set -> successful deploy; validates runbook completeness |

Continuous KPIs (no drill required) — observe passively:

- **K1** lead time: `gh run view --workflow=deploy-web.yml` timing, target p95 < 300 s
- **K2** success rate: `gh run list --workflow=deploy-web.yml` conclusion counts, target >= 95 % / 30 d
- **K4** availability: Firebase Hosting SLA (inherited), target >= 99.9 % monthly

## Deferred Follow-Ups

- **Branch protection on `main`**: Require `ci.yml` success before merge, require PR. Not in scope of this feature (org-level config, not feature infrastructure). Owner: repo admin, next chore.
- **K3 rollback drill**: Execute and record once the first deploy has landed. Do not defer indefinitely; rollback untested is rollback broken.
- **K5 first-deploy drill**: Execute once from a truly fresh checkout on a clean machine (or container) to validate the runbook has no missing steps.
- **Secret rotation cadence**: `docs/deploy.md` documents procedure but not schedule. Revisit if multi-dev access is ever added.

## Revisit Triggers

Any of the following should reopen DEVOPS decisions:

- Multi-user traffic (> single-user) — D6 (atomic swap) and K4 (inherited SLA) both need re-evaluation; canary or health-gated rollout becomes worth engineering
- Multi-developer access — D10 (repo secret) should flip to OIDC federation; secret rotation cadence needs enforcement
- Formal SLA commitment — K4 needs an external uptime monitor, not just Firebase console
- Adding preview / staging environments — scope bound explicitly excluded these; reopens environments.yaml and deploy-web.yml shape

## Session Artifacts (cleaned up at finalize)

- `.nwave/des/deliver-session.json` — removed
- `.nwave/des/des-task-active` — removed
- `docs/feature/web-prod-deploy/` — left in place (not migrated); full-workspace migration not requested for this feature

## Links

- Runbook: `docs/deploy.md`
- Journey (permanent): `docs/product/journeys/publish-web.yaml` (already migrated pre-finalize)
- Hosting config: `firebase.json`, `.firebaserc`
- Deploy workflow: `.github/workflows/deploy-web.yml`
- Acceptance tests: `tests/acceptance/web-prod-deploy/walking-skeleton.test.ts`
