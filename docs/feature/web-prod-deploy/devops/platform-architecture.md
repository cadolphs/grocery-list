# Platform Architecture — web-prod-deploy

## Overview

Single-user static web app hosted on Firebase Hosting (managed, serverless CDN). No containers, no pods, no VMs. CI/CD runs in GitHub Actions. No runtime backend to deploy — Firebase Auth + Firestore are pre-existing managed services.

```
Developer laptop ──push──► GitHub (origin/main)
                                │
                                ▼
                       ┌─────────────────────┐
                       │ GitHub Actions      │
                       │  ci.yml (gate)      │
                       │       │             │
                       │       ▼ (green)     │
                       │  deploy-web.yml     │
                       │  - npm ci           │
                       │  - npm run build    │
                       │  - firebase deploy  │
                       └──────────┬──────────┘
                                  │ auth: FIREBASE_SERVICE_ACCOUNT
                                  ▼
                       ┌─────────────────────┐
                       │ Firebase Hosting    │
                       │ project: grocery-   │
                       │  list-cad           │
                       │ atomic release swap │
                       │ CDN + auto-SSL      │
                       └──────────┬──────────┘
                                  │
                                  ▼
                 https://grocery-list-cad.web.app  (user browser)
```

## Components

| Component | Technology | Hosted where | License | Cost |
|---|---|---|---|---|
| Web build | Vite 6 + tsc | GitHub Actions `ubuntu-latest` runner | OSS | Included (GitHub free tier, public or private repo on personal plan) |
| Static hosting | Firebase Hosting | Google Cloud managed CDN | Proprietary managed | Free tier (Spark plan): 10 GB storage, 360 MB/day egress — far above single-user usage |
| Deploy auth | Service account JSON in GitHub Actions secret | GitHub Secrets Manager | N/A | Free |
| Rollback | `firebase hosting:rollback` from laptop | Firebase CLI | Apache 2.0 | Free |
| CI gate | Existing `.github/workflows/ci.yml` | GitHub Actions | N/A | Free tier |

## Deployment Strategy

**Atomic release swap** (Firebase Hosting default).

- Firebase Hosting deploys are atomic: the CDN serves the old release until the new release is fully uploaded, then flips the pointer. No in-flight request sees a half-uploaded build.
- This satisfies "zero-downtime" without explicit blue-green or canary engineering.
- **Rollback**: `firebase hosting:rollback` re-activates the prior release in <2 min (K3 target).
- **No canary / progressive rollout**: single-user traffic makes gradual rollout meaningless.

## Environments

Only one: **production**. No staging, no preview channels (explicit DISCUSS scope bound).

Future extension path (NOT in this feature):
- Preview channels via `firebase hosting:channel:deploy` per PR
- Custom domain via Firebase Hosting console

## Security Posture

| Concern | Control |
|---|---|
| Deploy credential leak | Service account JSON in GitHub Secret `FIREBASE_SERVICE_ACCOUNT` — encrypted at rest, not printed to logs by the official action |
| Least privilege | Service account granted only "Firebase Hosting Admin" (cannot touch Firestore, Auth, project IAM) |
| Credential rotation | Documented in `docs/deploy.md` (US-04): revoke old key, create new, update secret |
| Public client config | Firebase web SDK config (apiKey etc.) is intentionally client-public; no action needed |
| Supply chain | `npm audit --audit-level=high` already in ci.yml; pinned action versions in deploy workflow |
| Branch protection | `main` receives pushes only; add branch protection as follow-up (see `branching-strategy.md`) |

## Scalability Ceiling

Firebase Hosting free tier: 10 GB stored, 360 MB/day egress. At ~2 MB bundle size and ~10 page loads/day, budget is >1000× current usage. No scaling concerns.

## Disaster Recovery

- Firebase Hosting retains the last 10 releases by default — rollback covers any single bad deploy.
- Source of truth = git; a full re-deploy from `main` is always possible: `cd web && npm run build && firebase deploy --only hosting`.
- Firestore/Auth are separate and unaffected by hosting changes.

## What Is NOT Built (per DISCUSS scope)

- Dedicated observability stack (Grafana/Datadog/ELK)
- Synthetic uptime monitor
- Auto-rollback on health-check failure
- Deploy approval gate
- Multi-region or multi-cloud redundancy
- Feature flags, A/B testing, canary analysis

Revisit only if user count >1 or SLA expectations tighten.
