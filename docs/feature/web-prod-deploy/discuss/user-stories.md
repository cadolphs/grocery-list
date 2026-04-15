# User Stories — web-prod-deploy

All stories trace to journey `publish-web` (JTBD skipped — single-user infra feature).

---

## US-01: Hosting config checked in

**As** Clemens (solo dev)
**I want** `firebase.json` and `.firebaserc` committed at the repo root
**So that** `firebase deploy --only hosting` from any clean checkout produces an identical production deploy, and CI has no implicit per-machine state.

**Journey steps**: prerequisite for s3, s4.

### Acceptance Criteria

```gherkin
Scenario: Local deploy from clean checkout
  Given a fresh clone of the repo on a machine with firebase CLI logged in
  And /web/dist has been built via `cd web && npm run build`
  When I run `firebase deploy --only hosting` at repo root
  Then the deploy succeeds
  And the content served at https://grocery-list-cad.web.app matches /web/dist/index.html

Scenario: SPA rewrite serves index.html for unknown routes
  Given a successful deploy
  When I GET https://grocery-list-cad.web.app/any/unknown/path
  Then the response is 200
  And the body is the contents of index.html (SPA fallback)

Scenario: Config is declarative
  Given firebase.json at repo root
  Then it declares `hosting.public = "web/dist"`
  And it declares a rewrite mapping `**` to `/index.html`
  And `.firebaserc` sets `projects.default = "grocery-list-cad"`
```

---

## US-02: Push-to-main auto-deploys

**As** Clemens
**I want** every push to `main` to trigger a web deploy after CI passes
**So that** I never type `firebase deploy` by hand for a routine change.

**Journey steps**: s2 → s3 → s4.

### Acceptance Criteria

```gherkin
Scenario: Green push ships to prod
  Given ci.yml is green for a commit on main
  When .github/workflows/deploy-web.yml runs for that commit
  Then the workflow runs `npm ci && npm run build` inside /web
  And it publishes /web/dist via FirebaseExtended/action-hosting-deploy@v0 (or equivalent)
  And the workflow completes in under 5 minutes (p95)
  And the new release is visible at https://grocery-list-cad.web.app

Scenario: Red CI blocks deploy
  Given ci.yml fails for a commit on main
  Then deploy-web.yml does not publish to Firebase Hosting for that commit
  And the prior hosting release remains active

Scenario: Deploy auth via service account
  Given the GitHub secret FIREBASE_SERVICE_ACCOUNT is set
  When deploy-web.yml runs
  Then authentication uses that secret (no interactive login, no user token)
  And the secret value is not printed to logs
```

---

## US-03: CI service account provisioned + documented

**As** Clemens
**I want** a Firebase service account with hosting-deploy permissions, stored as a GitHub Actions secret, with a one-page "how to rotate" runbook
**So that** CI auth survives laptop changes and future-me can recover when the credential expires or leaks.

**Journey steps**: prerequisite for s4.

### Acceptance Criteria

```gherkin
Scenario: Secret exists and works
  Given the GitHub repo has secret "FIREBASE_SERVICE_ACCOUNT" set with a valid service account JSON
  When deploy-web.yml runs using this secret
  Then firebase CLI authenticates successfully
  And `firebase deploy --only hosting` succeeds

Scenario: Provisioning documented
  Given docs/deploy.md exists
  Then it includes step-by-step: create service account in Firebase console, grant "Firebase Hosting Admin" role, download JSON, paste into GitHub secret
  And it includes a rotation procedure: revoke old key, create new, update secret

Scenario: Least privilege
  Given the service account used by CI
  Then it has only "Firebase Hosting Admin" role (or the minimum that action-hosting-deploy requires)
  And it does not have Firestore admin, Auth admin, or project owner roles
```

---

## US-04: Deploy docs

**As** Clemens
**I want** a single page `docs/deploy.md` that states prod URL, trigger, rollback command, and secret rotation
**So that** future-me (after a 6-month gap) can operate the deploy without re-deriving it.

**Journey steps**: enables s5 and error-path recovery.

### Acceptance Criteria

```gherkin
Scenario: Single page answers all four questions
  Given docs/deploy.md exists
  Then it states the prod URL: https://grocery-list-cad.web.app
  And it states the deploy trigger: "push to main" with link to .github/workflows/deploy-web.yml
  And it states the rollback command: `firebase hosting:rollback`
  And it states the manual-deploy fallback: `cd web && npm run build && firebase deploy --only hosting`
  And it states service-account rotation steps

Scenario: README links to deploy docs
  Given README.md
  Then it contains a link to docs/deploy.md under a "Deployment" heading
```

---

## Traceability

| Story | Journey steps | KPI tied |
|---|---|---|
| US-01 | s3, s4 (prereq) | deploy_success_rate, rollback_time |
| US-02 | s2 → s3 → s4 | deploy_lead_time_p95, deploy_success_rate |
| US-03 | s4 (prereq) | deploy_success_rate |
| US-04 | s5, error recovery | rollback_time (discoverability) |
