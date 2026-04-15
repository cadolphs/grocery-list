# Journey: Publish Web to Production

**Feature**: web-prod-deploy
**Actor**: Clemens (solo dev + end user)
**Goal**: A commit on `main` becomes a live version at a stable public URL without manual intervention.

## Narrative

Clemens finishes a change on his laptop, pushes `main`, and closes the lid. Five minutes later he opens the app on his phone browser. The change is there. No `firebase deploy` typed by hand, no "which branch did I push", no SSH into a server.

## Mental Model

- `git push origin main` is the deploy trigger — there is no separate "release" step.
- The prod URL is stable and memorable (`https://grocery-list-cad.web.app`).
- If CI is red, nothing ships — previous build stays live.
- If the deploy step itself fails, prior build stays live and Actions shows red.

## Happy Path

| # | Step | Expected Output | Emotion |
|---|------|-----------------|---------|
| 1 | `git push origin main` | push accepted | neutral (routine) |
| 2 | GitHub Actions `ci.yml` runs (tsc, eslint, jest) | green | mild relief |
| 3 | GitHub Actions `deploy-web.yml` runs: `npm ci && npm run build` in `/web` | `web/dist/` built | neutral |
| 4 | Same workflow runs `firebase-hosting-deploy` action with service account | deploy URL printed in logs | anticipation |
| 5 | Open `https://grocery-list-cad.web.app` on phone | latest change visible | confident ("it's live") |

## Error Paths

| Failure | Detection | Recovery |
|---------|-----------|----------|
| `ci.yml` fails (test/lint/type) | Actions red on push | Fix locally, push again. Deploy never started — prior build stays live. |
| Build step fails in deploy workflow | Actions red on `deploy-web.yml` | Fix build error locally, push again. Prior build stays live. |
| Firebase deploy fails (auth expired, quota, network) | Actions red on deploy step | Manual fallback: `cd web && npm run build && firebase deploy --only hosting` from laptop. Rotate service account if auth. |
| Bad code reaches prod | User opens site, sees bug | `firebase hosting:rollback` or revert commit + push. |

## Shared Artifacts (see `shared-artifacts-registry.md`)

- `/web/dist/` — build output consumed by deploy step
- `firebase.json` — hosting config (public dir, rewrites)
- `.firebaserc` — project alias
- `FIREBASE_SERVICE_ACCOUNT` GitHub Actions secret — deploy credential
- Prod URL — published in `docs/deploy.md`

## Non-Goals

- Preview deploys per PR
- Staging environment
- Custom domain
- Rollback UI beyond `firebase hosting:rollback`
