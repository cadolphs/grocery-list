# Platform Architecture: Grocery Smart List

**Feature ID**: grocery-smart-list
**Wave**: DESIGN (Platform)
**Date**: 2026-03-17
**Architect**: Apex (Platform Architect)

---

## Platform Context

This is a personal React Native/Expo mobile app with zero server-side infrastructure. The platform architecture is intentionally minimal: a GitHub Actions CI pipeline, EAS Build for app distribution, and local quality gates for developer feedback.

### Constraints

| Constraint | Source | Impact |
|-----------|--------|--------|
| No backend/server | Architecture decision | No observability, monitoring, or alerting infrastructure needed |
| Solo developer | Team context | No PR review gates, no multi-team coordination |
| Expo/EAS managed builds | Technology stack | Build infrastructure is fully managed -- no self-hosted runners or build servers |
| Offline-first, local-only data | Architecture decision | No database infrastructure, no API gateway, no CDN |

---

## Infrastructure Components

### Rejected Simpler Alternatives

#### Alternative 1: No CI -- manual local testing only
- **What**: Run `npm test` locally before each commit. No automated pipeline.
- **Expected Impact**: Meets 70% of needs (catches test failures before deploy).
- **Why Insufficient**: No automated architecture enforcement (dependency-cruiser). No automated type checking. Risk of pushing broken builds to EAS. Mutation testing would be forgotten without automation.

#### Alternative 2: GitHub Actions with only test step
- **What**: Single workflow job that runs `npm test` on push.
- **Expected Impact**: Meets 85% of needs (catches test and build failures).
- **Why Insufficient**: Misses TypeScript type checking (Jest does not enforce strict TS), architecture enforcement (dependency-cruiser), and mutation testing. These are distinct quality signals worth automating.

### Selected Architecture: GitHub Actions CI + EAS Build

| Component | Purpose | Managed By |
|-----------|---------|-----------|
| GitHub Actions | CI pipeline: lint, typecheck, test, architecture enforcement, mutation testing | GitHub (hosted runners) |
| EAS Build | App builds for development, preview, production | Expo (cloud service) |
| EAS Submit | App store submission | Expo (cloud service) |
| Husky | Local pre-commit and pre-push hooks | Local developer machine |

Total components: 4. All managed services or local tooling. Zero self-hosted infrastructure.

---

## Deployment Topology

```
Developer Machine
  |
  |-- pre-commit hook: format check, lint, secrets scan
  |-- pre-push hook: typecheck, unit tests, architecture check
  |
  v
GitHub (main branch)
  |
  |-- GitHub Actions CI: full pipeline (lint, typecheck, test, dep-cruiser, mutation)
  |
  v
EAS Build (triggered manually or via CI)
  |
  |-- development profile --> Expo Go / dev client
  |-- preview profile --> internal testing (TestFlight / internal track)
  |-- production profile --> App Store / Google Play
```

---

## Deployment Strategy: Recreate (App Store Update)

**Selected**: Recreate -- each EAS production build replaces the previous version via app store update.

**Justification**: Mobile app store distribution is inherently a recreate strategy. There is no server-side traffic to split, no canary to run, no blue-green environment to switch. Users update via the app store at their own pace.

**Rollback procedure**: Submit a new EAS Build with the previous working commit. EAS Build supports building from any git ref. For critical issues, Expo OTA updates (expo-updates) could provide faster rollback without a full app store review cycle, but this is out of scope for initial release.

---

## DORA Metrics Targets

For a solo developer on a personal project, targeting "High" performance:

| Metric | Target | How |
|--------|--------|-----|
| Deployment frequency | Weekly to bi-weekly | Align with shopping trip cadence. Ship after each story batch. |
| Lead time for changes | < 1 day | Trunk-based development, short-lived branches, CI runs in < 10 min |
| Change failure rate | < 15% | Quality gates catch issues before EAS Build |
| Time to restore | < 1 hour | Revert commit + new EAS Build, or OTA update if configured |

---

## Security Considerations

Security scanning is lightweight given the project context (no backend, no sensitive data, no PII):

| Concern | Approach |
|---------|----------|
| Secrets in code | GitHub secret scanning (enabled by default on public repos) + local pre-commit check |
| Dependency vulnerabilities | `npm audit` in CI pipeline |
| Supply chain | No SBOM generation needed for personal app. Revisit if open-sourced. |
| SAST/DAST | Not applicable -- no server endpoints, no user input processing beyond local grocery items |

---

## Cost

| Component | Cost |
|-----------|------|
| GitHub Actions | Free tier (2,000 min/month for private repos, unlimited for public) |
| EAS Build | Free tier (30 builds/month) sufficient for solo developer |
| EAS Submit | Free tier included |

Total monthly cost: $0 (within free tiers).
