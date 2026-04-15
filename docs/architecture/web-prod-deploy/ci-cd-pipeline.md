# CI/CD Pipeline Design — web-prod-deploy

## Pipeline overview

Two workflows, separate files, one gate between them.

| Workflow | Trigger | Purpose | Status |
|---|---|---|---|
| `.github/workflows/ci.yml` | push to `main`, PR to `main` | Quality gate: tsc, eslint, jest, npm audit | EXISTS — untouched |
| `.github/workflows/deploy-web.yml` | `workflow_run` on `ci.yml` completion (branch=main, conclusion=success) | Build `/web` + deploy to Firebase Hosting | NEW — to be created in DELIVER |

## Trigger model: `workflow_run` (chained) vs. `needs` (job in same workflow)

**Chosen: `workflow_run`** — separate workflow file, separate file on disk, separate concerns.

Rationale:
- Keeps `ci.yml` focused on quality gates; keeps `deploy-web.yml` focused on delivery.
- Deploy can be rerun independently (e.g., after transient Firebase auth failure) without rerunning CI.
- Matches existing separation pattern in repo (mutation.yml is already its own file).
- Alternative (adding a deploy job to ci.yml with `needs: [commit-stage]`) was considered and rejected: rerunning deploy would also rerun tests.

## Pipeline stages

### Stage 1: CI (existing, unchanged)

```
on: push to main, pull_request to main
jobs:
  commit-stage:
    - checkout
    - setup-node 20, cache npm
    - npm ci
    - tsc --noEmit
    - eslint --max-warnings 0
    - jest --ci --coverage --bail
    - npm audit --audit-level=high || true
```

No changes. This workflow is the quality gate for `main`.

### Stage 2: Deploy (new)

```yaml
# .github/workflows/deploy-web.yml  (design spec — file to be authored in DELIVER)
name: Deploy Web

on:
  workflow_run:
    workflows: ["CI"]        # matches name: CI in ci.yml
    types: [completed]
    branches: [main]

concurrency:
  group: deploy-web
  cancel-in-progress: false   # never cancel an in-flight prod deploy

permissions:
  contents: read

jobs:
  deploy:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.workflow_run.head_sha }}   # deploy the exact commit CI ran on

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: web/package-lock.json

      - name: Install web deps
        working-directory: web
        run: npm ci

      - name: Build web
        working-directory: web
        run: npm run build       # tsc && vite build -> web/dist

      - name: Deploy to Firebase Hosting
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          projectId: grocery-list-cad
          channelId: live
```

Notes:
- `workflow_run` only fires for the default workflow-run context (push/PR on main). It does NOT run deploy for PR-only CI runs — exactly what we want.
- `ref: ${{ github.event.workflow_run.head_sha }}` pins deploy to the SHA that passed CI (guards against race with a newer push).
- `channelId: live` = the production channel (default). If we ever add preview channels, they use different IDs.
- `concurrency: cancel-in-progress: false` — critical. Never cancel a deploy mid-upload; queue instead.
- `timeout-minutes: 10` — well above K1 target (p95 < 5 min) to absorb cold cache.

## Gate behavior

| Situation | deploy-web.yml runs? | Prod result |
|---|---|---|
| Push to main, ci.yml green | ✅ yes | New release live |
| Push to main, ci.yml red | ❌ no (`if: conclusion == 'success'`) | Prior release stays live |
| PR to main, ci.yml runs on PR branch | ❌ no (`workflow_run.branches: [main]`) | N/A |
| Push to main, ci.yml green, deploy step fails (Firebase auth/quota/network) | Run starts then fails — Actions red | Prior release stays live; Clemens gets email on failure |
| Two rapid pushes to main | Both CIs run; both deploys queue sequentially (concurrency group) | Latest push wins, but neither deploy is interrupted |

## Manual fallback

Documented in `docs/deploy.md`. From any logged-in Firebase CLI laptop:

```bash
cd web && npm run build
firebase deploy --only hosting
```

Uses `firebase.json` and `.firebaserc` from repo root — identical output to CI.

## Rollback

```bash
firebase hosting:rollback
# or via Firebase console → Hosting → Release history → Rollback
```

No workflow needed. Rollback is a manual, rare, wall-clock-bounded operation (K3: <2 min).

## Secret: FIREBASE_SERVICE_ACCOUNT

- Stored: GitHub repo Settings → Secrets and variables → Actions → Repository secrets
- Value: JSON key of a service account with role "Firebase Hosting Admin" on project `grocery-list-cad`
- Rotation: see `docs/deploy.md` (US-04 AC: documented procedure)
- Action used (`FirebaseExtended/action-hosting-deploy@v0`) handles masking so the secret is not printed

## Caching strategy

- `setup-node` caches npm for `web/package-lock.json` — saves ~30-60 s per run
- Vite build output not cached across runs (cheap: ~20 s); caching would risk stale artifacts

## Pipeline KPI alignment

| KPI | How pipeline supports it |
|---|---|
| K1 lead time p95 < 300 s | Single job, cached npm, small bundle. Expected runtime: 60-120 s typical |
| K2 success rate ≥ 95 % | Pinned action versions; retry via rerun button; no flaky steps |
| K3 rollback < 120 s | Manual, out of pipeline; pipeline just doesn't block it |
| K5 fresh-checkout first deploy < 10 min | Config is fully declarative (`firebase.json`, `.firebaserc`); no hidden state |

## Files created / modified

| File | Change | Story |
|---|---|---|
| `.github/workflows/deploy-web.yml` | NEW | US-02 |
| `.github/workflows/ci.yml` | untouched | — |
| `firebase.json` | NEW (repo root) | US-01 |
| `.firebaserc` | NEW (repo root) | US-01 |
| `docs/deploy.md` | NEW | US-04 |
| `README.md` | add Deployment section linking to deploy.md | US-04 |

## Build reproducibility

- Node 20 pinned in both workflows
- `npm ci` (not `npm install`) — respects `package-lock.json`
- Vite build is deterministic for same source + deps
- Running deploy twice on the same commit produces byte-identical `web/dist` content (modulo timestamps inside bundled metadata, which Firebase Hosting handles via content-hash)
