# Deploy runbook — grocery-list web

Operational runbook for the public web build. Scope: single-user, solo-dev
project. The goal is that a cold operator (future-me after six months) can
deploy, verify, and roll back without reading source code.

## Production URL

- https://grocery-list-cad.web.app

That is the only public endpoint for the web build. Android continues to ship
via EAS and is out of scope for this runbook.

## Deploy trigger (happy path)

Deploys are automatic. A **push to main** runs
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml); on green, GitHub
Actions chains [`.github/workflows/deploy-web.yml`](../.github/workflows/deploy-web.yml)
via `workflow_run` and publishes to Firebase Hosting.

Flow:

```
git push origin main
      ->  ci.yml           (tsc, eslint, jest --ci, npm audit)
      ->  deploy-web.yml   (npm ci, web build, firebase deploy --only hosting)
      ->  https://grocery-list-cad.web.app
```

Nothing else triggers a deploy. There is no manual "deploy" button in the repo
by design — the CI pipeline is the only sanctioned path while it is green.

### Health check

```bash
curl -I https://grocery-list-cad.web.app
# expect: HTTP/2 200
```

Quick look at the last 10 deploy runs:

```bash
gh run list --workflow=deploy-web.yml --limit 10
```

## Rollback

If a bad version is live, roll back to the previous Firebase Hosting release.
Target recovery time: **<= 2 minutes** from decision to green curl.

```bash
firebase hosting:rollback
```

This restores the previously deployed version from Firebase's release history.
No repo commit or CI run is required — the rollback is entirely on the hosting
side. Re-run the health check above to confirm.

After rollback, open a follow-up commit to fix the regression on `main`; the
next push will redeploy through the normal pipeline.

### K5 rollback drill (stopwatch)

Quarterly: time a dry-run rollback end-to-end.

1. Start stopwatch.
2. `firebase hosting:rollback`
3. `curl -I https://grocery-list-cad.web.app` until 200.
4. Stop stopwatch. Target: under 2 minutes.

## Manual fallback (CI down)

When GitHub Actions is unavailable, or `deploy-web.yml` is broken and the fix
is urgent, deploy from a laptop:

```bash
cd web
npm ci
npm run build
firebase deploy --only hosting
```

Prerequisites:

- `firebase-tools` installed (`npm i -g firebase-tools`) and authenticated
  (`firebase login`) against an account with Firebase Hosting Admin on the
  `grocery-list-cad` project.
- `web/dist/` freshly built from the commit that is currently on `main`.

This path deliberately bypasses the CI quality gate. Use it sparingly and
open a follow-up issue to restore the CI pipeline.

### K3 deploy-lead-time drill (stopwatch)

Quarterly, from a clean `main`:

1. Make a trivial commit (bump a version string in `web/package.json`).
2. Start stopwatch on `git push`.
3. Stop when `curl -I https://grocery-list-cad.web.app` reflects the change
   (or when the `deploy-web.yml` run shows success).
4. Target p95: under 5 minutes (see `devops/kpi-instrumentation.md`).

## Secrets — `FIREBASE_SERVICE_ACCOUNT`

The deploy workflow authenticates to Firebase using a service-account JSON key
stored in the GitHub Actions secret **`FIREBASE_SERVICE_ACCOUNT`** on this
repository.

- Service account:
  `github-actions-deploy@grocery-list-cad.iam.gserviceaccount.com`
- Granted role: `Firebase Hosting Admin` (and only that).
- Consumed by `.github/workflows/deploy-web.yml`.

### Key rotation procedure

Rotate the key annually, and immediately on any suspected compromise (e.g. the
JSON ever appears in a log, screenshot, or paste).

1. **Firebase / GCP console** -> project `grocery-list-cad` -> **IAM &
   Admin** -> **Service Accounts** -> select
   `github-actions-deploy@...`.
2. **Keys** tab -> **Add Key** -> **Create new key** -> JSON -> download.
3. GitHub -> repo **Settings** -> **Secrets and variables** -> **Actions** ->
   **`FIREBASE_SERVICE_ACCOUNT`** -> **Update** -> paste the full JSON.
4. Trigger a test run: `gh workflow run deploy-web.yml` (or push a trivial
   commit) and confirm success.
5. Back in the console, **revoke / delete the old key** from the same Keys
   tab. Do this last so a failed rotation does not lock out deploys.

If you need to **replace** the service account entirely (not just rotate its
key) — for example because its permissions drifted — create a new account,
grant it Firebase Hosting Admin, then follow the same rotation steps with the
new account's JSON, and finally disable the old account.

## Known operational risks

- **CI workflow rename.** `deploy-web.yml` triggers off `workflow_run` with
  `workflows: ["CI"]` (the `name:` of `ci.yml`). If someone renames
  `ci.yml`'s `name:` field, deploys will silently stop firing. If you rename
  the CI workflow, also update `deploy-web.yml`'s `workflow_run.workflows`
  list in the same commit.
- **Firebase free-tier quota.** The site is hosted on Firebase Hosting's
  Spark (free) plan. Hitting the egress quota returns 429 and there is no
  paging; configure a Firebase console email alert as a one-time setup.
- **Stale laptop Firebase CLI.** The manual fallback depends on
  `firebase-tools` being current enough to speak the server's API. If it
  fails in an emergency, `npm i -g firebase-tools@latest` first.
