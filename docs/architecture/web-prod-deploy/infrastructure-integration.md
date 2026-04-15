# Infrastructure Integration — web-prod-deploy

Existing CI/CD to integrate with. Infrastructure (Firebase Hosting) is greenfield but provider-managed.

## Existing CI/CD

### `.github/workflows/ci.yml`

Status: in-production, green on `main`.

| Attribute | Value |
|---|---|
| Trigger | push to `main`, PR to `main` |
| Jobs | `commit-stage` (single job) |
| Steps | checkout → setup-node@v4 (node 20, npm cache) → `npm ci` → `tsc --noEmit` → `eslint` → `jest --ci --coverage --bail` → `npm audit --audit-level=high \|\| true` |
| Timeout | 10 min |
| Concurrency | `ci-${{ github.ref }}`, cancel-in-progress |

**Integration plan**: DO NOT MODIFY this file. `deploy-web.yml` chains off it via `workflow_run`. This keeps concerns separate and preserves the existing quality-gate contract.

### `.github/workflows/mutation.yml`

Status: runs on push to `main` when `src/domain/**` or `src/ports/**` changes.

**Integration plan**: unrelated to deploy. No interaction. Both workflows may run in parallel after a push; deploy does not wait on mutation testing.

## Existing infrastructure

### Firebase project `grocery-list-cad`

| Service | Status | Use |
|---|---|---|
| Firebase Auth | Active | User auth (existing; unrelated to deploy) |
| Cloud Firestore | Active | App data (existing; unrelated) |
| Firebase Hosting | **Inactive — to be initialized** | Target of this feature |
| IAM / service accounts | 0 CI-dedicated accounts | **To be provisioned** (US-03) |

**Integration steps** (manual, one-time, documented in `docs/deploy.md`):
1. Firebase console → project `grocery-list-cad` → Hosting → Get started → accept defaults
2. Firebase console → IAM → Service Accounts → create `github-actions-deploy@grocery-list-cad.iam.gserviceaccount.com`
3. Grant role: `Firebase Hosting Admin` (and only that)
4. Create JSON key → download → paste full JSON into GitHub repo secret `FIREBASE_SERVICE_ACCOUNT`

No existing resource is mutated. Firestore and Auth are untouched.

## Repo layout touchpoints

| Path | Role in this feature | Owner |
|---|---|---|
| `/web/package.json` | Defines `build` script; unchanged | — |
| `/web/dist/` | Build output, consumed by deploy | `.gitignore`'d; produced fresh in CI |
| `firebase.json` (repo root, NEW) | Hosting config | this feature (US-01) |
| `.firebaserc` (repo root, NEW) | Project alias | this feature (US-01) |
| `.github/workflows/ci.yml` | Quality gate, unchanged | existing |
| `.github/workflows/deploy-web.yml` (NEW) | Deploy | this feature (US-02) |
| `.github/workflows/mutation.yml` | Unrelated, unchanged | existing |
| `docs/deploy.md` (NEW) | Runbook | this feature (US-04) |
| `README.md` | Add "Deployment" section link | this feature (US-04) |

## Non-changes (explicit)

- Root `package.json` — no new scripts. Deploy command lives in the workflow, not in package.json, to avoid the illusion that `npm run deploy` is safe from an arbitrary laptop.
- EAS config — untouched. Android deploys still go through `eas build`.
- Firestore security rules — untouched.
- Firebase web SDK config in `/web/src/firebase-config.ts` — untouched (client-public by design).

## Risk: ci.yml workflow rename

If someone renames the `ci.yml` workflow's `name:` (currently `CI`), `deploy-web.yml`'s `workflow_run.workflows: ["CI"]` selector will no longer match and deploys will silently stop triggering.

Mitigation (added as a note in `docs/deploy.md`): "If you rename the CI workflow, also update `deploy-web.yml`'s `workflow_run.workflows` list."

## Branch protection (recommended follow-up)

Not strictly required for this feature (single-dev repo), but recommended:
- Require `ci.yml / commit-stage` status to pass before merge to `main`
- Require PR review (self-approval acceptable for solo dev)
- Prevent force-push to `main`

Flagged in `branching-strategy.md` as a follow-up rather than in-scope for this feature.
