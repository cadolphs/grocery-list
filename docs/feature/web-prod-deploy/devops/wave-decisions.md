# DEVOPS Decisions — web-prod-deploy

## Key Decisions

- **[D1] Deployment target = Firebase Hosting (cloud-native, managed).** Inherited from DISCUSS. Zero backend, free tier covers single-user indefinitely. (see: platform-architecture.md)
- **[D2] Container orchestration = none (serverless managed hosting).** No Docker, no Kubernetes. Static bundle on CDN. (see: platform-architecture.md)
- **[D3] CI/CD platform = GitHub Actions.** Already in use for `ci.yml` and `mutation.yml`. No second tool introduced. (see: ci-cd-pipeline.md)
- **[D4] Existing CI/CD integration = extend, don't modify.** `ci.yml` stays as-is; new `deploy-web.yml` chains via `workflow_run`. Rejected alternative: adding a deploy job to `ci.yml` (couples reruns of tests + deploys). (see: ci-cd-pipeline.md, infrastructure-integration.md)
- **[D5] Observability = built-in only (GitHub Actions + Firebase console).** Explicit DISCUSS constraint: no Grafana/Datadog/ELK. Four observability surfaces, zero custom infrastructure. (see: observability-design.md, kpi-instrumentation.md)
- **[D6] Deployment strategy = atomic release swap (Firebase default).** Zero-downtime without engineering effort. No canary, no progressive rollout — single-user traffic makes them meaningless. (see: platform-architecture.md)
- **[D7] Continuous learning capabilities = none.** No A/B testing, feature flags, or canary analysis. Single-user app has no population to experiment on. (see: wave-decisions.md)
- **[D8] Git branching = GitHub Flow.** `main` + optional short-lived feature branches + PRs. Matches existing ci.yml triggers. (see: branching-strategy.md)
- **[D9] Mutation testing = per-feature.** Already configured in CLAUDE.md; confirmed as correct strategy for this project's size and cadence. No change. (see: CLAUDE.md)
- **[D10] Secret management = GitHub Actions Repository Secret `FIREBASE_SERVICE_ACCOUNT`.** Not OIDC federation (more setup for no security gain at single-dev scale). Rotation procedure documented in `docs/deploy.md`. (see: ci-cd-pipeline.md)
- **[D11] Gate between CI and deploy = `workflow_run` with `conclusion == 'success'` + `branches: [main]`.** Ensures PR CI runs don't trigger deploys; ensures red CI blocks deploy. (see: ci-cd-pipeline.md)
- **[D12] Deploy pins to CI-validated SHA.** `workflow_run.head_sha` used in checkout; prevents race with newer push during deploy. (see: ci-cd-pipeline.md)
- **[D13] Concurrency: `deploy-web` group, cancel-in-progress = false.** Never cancel an in-flight deploy; queue instead. (see: ci-cd-pipeline.md)

## Infrastructure Summary

- **Deployment**: Firebase Hosting (managed CDN) + atomic release swap
- **CI/CD**: GitHub Actions, GitHub Flow, two workflows (`ci.yml` existing + `deploy-web.yml` new), chained via `workflow_run`
- **Observability**: GitHub Actions run history + Firebase console only (no custom stack)
- **Mutation testing**: per-feature (CLAUDE.md, unchanged)

## Constraints Established

- `ci.yml` is unmodified — contract preserved for other uses and for mutation.yml parallelism.
- No new runtime infrastructure — no VMs, no containers, no serverless functions.
- No new external tools — no Datadog, no Grafana, no PagerDuty.
- Secret rotation is a documented manual procedure, not an automated one (single-dev scale does not justify secret-rotation automation).
- Manual laptop fallback (`firebase deploy --only hosting`) MUST produce identical output to CI — enforced by committing `firebase.json` + `.firebaserc` + using `npm ci` (not `install`).
- Service account least privilege: Firebase Hosting Admin only; cannot touch Firestore, Auth, or IAM.

## Upstream Changes

None. DISCUSS assumptions all hold:
- Hosting provider (Firebase) — unchanged
- Trigger (push to main) — unchanged
- Auth mechanism (service account secret) — unchanged
- Scope bounds (no preview/staging/custom domain) — unchanged
- KPI targets — all achievable with designed instrumentation

No `upstream-changes.md` file needed.

## Handoff

- **To**: nw-acceptance-designer (DISTILL wave)
- **Primary inputs for DISTILL**:
  - `user-stories.md` (from DISCUSS) — source of scenarios
  - `environments.yaml` (this wave) — target environments for Mandate 4
  - `ci-cd-pipeline.md` (this wave) — workflow shape to validate in scenarios
  - `platform-architecture.md` (this wave) — architectural invariants
- **Acceptance-test shape hint**: scenarios should target (a) repo-state assertions (`firebase.json` content, workflow file presence), (b) CI runner simulation / replay (can the workflow run to success?), and (c) hosting outcome (what URL serves after deploy). Browser-level E2E is out of scope.
