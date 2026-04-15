# Shared Artifacts Registry — web-prod-deploy

Single source of truth for every artifact shared between steps/actors.

| Artifact | Path / Identifier | Source (single owner) | Consumers |
|---|---|---|---|
| Web build output | `web/dist/` | `deploy-web.yml` build step (runs `npm run build` in `/web`) | `deploy-web.yml` deploy step |
| Hosting config | `firebase.json` (repo root) | committed in US-01 | `firebase` CLI (local + CI) |
| Project alias | `.firebaserc` (repo root) | committed in US-01 | `firebase` CLI (local + CI) |
| Deploy credential | GitHub secret `FIREBASE_SERVICE_ACCOUNT` (JSON key) | Firebase console → service account → manual upload to GitHub Settings → Secrets | `deploy-web.yml` (auth to Firebase Hosting API) |
| Prod URL | `https://grocery-list-cad.web.app` | Firebase Hosting default domain for project `grocery-list-cad` | Clemens (browser), `docs/deploy.md` |
| CI status | GitHub Actions run on `ci.yml` | existing `.github/workflows/ci.yml` | `deploy-web.yml` (gate: runs only after ci.yml green, via `workflow_run` or `needs`) |
| Rollback command | `firebase hosting:rollback` | Firebase CLI (local laptop) | Clemens during incident |

No artifact has two writers. No consumer reads without a declared source.
