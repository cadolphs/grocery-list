# DEVOPS Wave Decisions: Grocery Smart List

**Feature ID**: grocery-smart-list
**Wave**: DESIGN (Platform/DEVOPS)
**Date**: 2026-03-17
**Decision**: GO -- platform design complete, ready for peer review and DISTILL handoff

---

## Wave Summary

The DEVOPS platform design produces a lightweight, right-sized CI/CD infrastructure for a personal React Native/Expo mobile app. Zero new infrastructure services. Zero monthly cost. Four quality gate layers (pre-commit, pre-push, CI, mutation testing) catch issues at progressively later stages.

---

## Key Platform Decisions

| # | Decision | Rationale | Alternative Rejected |
|---|----------|-----------|---------------------|
| 1 | GitHub Actions for CI | Free tier sufficient. Already hosting repo on GitHub. No self-hosted runners needed. | CircleCI, Travis CI -- adds another service for no benefit |
| 2 | Trunk-based development | Solo developer, continuous delivery. No branch coordination overhead. | GitHub Flow (PR review friction), GitFlow (massive overhead) |
| 3 | Recreate deployment strategy | App store distribution is inherently recreate. No server traffic to canary or blue-green. | Canary/blue-green -- not applicable to mobile app store distribution |
| 4 | Husky + lint-staged for local hooks | Standard JS/TS tooling. Fast pre-commit on staged files only. | lefthook (less JS ecosystem integration), raw git hooks (no management) |
| 5 | Stryker for mutation testing | Per-feature strategy, scoped to domain/ports. 80% kill rate threshold. | PIT (Java only), mutmut (Python only) |
| 6 | No observability infrastructure | No server, no backend, no API. All KPIs measured by app data model and Trip Summary screen. | Sentry, Datadog, etc. -- over-engineered for single-user personal app |
| 7 | Manual EAS Build trigger | Release cadence (weekly to bi-weekly) does not justify automated release pipeline yet. | Automated release on tag -- deferred until cadence warrants |
| 8 | KPI instrumentation via Trip Summary screen | App's own UI serves as the KPI dashboard. Zero external analytics services. | Mixpanel, Amplitude, custom analytics -- all over-engineered for single user |
| 9 | Mutation testing: per-feature strategy | Under 50k LOC project. 5-15 min per delivery. Scoped to domain/ports for high signal. | Nightly-delta (unnecessary delay), pre-release (too slow for story cadence) |

---

## New Dependencies Required

### devDependencies (tooling only, zero runtime impact)

| Dependency | Purpose | Phase |
|-----------|---------|-------|
| `husky` | Git hook management | Local quality gates |
| `lint-staged` | Run checks on staged files only | Pre-commit performance |
| `prettier` | Code formatting | Consistency |
| `eslint` | Linting | Code quality |
| `@stryker-mutator/core` | Mutation testing framework | Mutation stage |
| `@stryker-mutator/jest-runner` | Jest integration for Stryker | Mutation stage |
| `@stryker-mutator/typescript-checker` | TypeScript support for Stryker | Mutation stage |
| `dependency-cruiser` | Architecture enforcement | Already planned in DESIGN wave |

Total: 8 new devDependencies. Zero new runtime dependencies.

---

## Quality Gate Summary

| Layer | Gate | Threshold | Blocking? |
|-------|------|-----------|-----------|
| Pre-commit | Formatting (Prettier) | Zero violations | Yes (local) |
| Pre-commit | Linting (ESLint) | Zero warnings | Yes (local) |
| Pre-push | TypeScript compilation | Zero errors | Yes (local) |
| Pre-push | Unit tests (Jest) | 100% pass | Yes (local) |
| Pre-push | Architecture (dep-cruiser) | Zero violations | Yes (local) |
| CI | TypeScript compilation | Zero errors | Yes (pipeline) |
| CI | Linting (ESLint) | Zero warnings | Yes (pipeline) |
| CI | Unit tests (Jest) | 100% pass | Yes (pipeline) |
| CI | Coverage | >= 80% lines | Yes (pipeline) |
| CI | Architecture (dep-cruiser) | Zero violations | Yes (pipeline) |
| CI | Security (npm audit) | Zero high/critical | Yes (pipeline) |
| Mutation | Kill rate (Stryker) | >= 80% on domain/ports | Yes (pipeline) |

---

## Artifacts Produced

| Artifact | File | Status |
|----------|------|--------|
| Platform Architecture | `docs/feature/grocery-smart-list/devops/platform-architecture.md` | Complete |
| CI/CD Pipeline Design | `docs/feature/grocery-smart-list/devops/ci-cd-pipeline.md` | Complete |
| Branching Strategy | `docs/feature/grocery-smart-list/devops/branching-strategy.md` | Complete |
| KPI Instrumentation | `docs/feature/grocery-smart-list/devops/kpi-instrumentation.md` | Complete |
| Wave Decisions | `docs/feature/grocery-smart-list/devops/wave-decisions.md` | Complete |
| CI Workflow | `.github/workflows/ci.yml` | Complete |
| Mutation Workflow | `.github/workflows/mutation.yml` | Complete |
| CLAUDE.md update | `CLAUDE.md` (mutation testing strategy section) | Complete |

---

## Artifacts Intentionally Skipped

| Artifact | Reason |
|----------|--------|
| observability-design.md | No server-side infrastructure. KPIs measured by app data model. |
| monitoring-alerting.md | No server, no backend, no metrics pipeline. |
| infrastructure-integration.md | All infrastructure is managed services (GitHub Actions, EAS). No custom integration needed. |
| continuous-learning.md | Not selected for this project. |
| deployment-strategy.md (separate) | Covered in platform-architecture.md. Recreate strategy is simple enough to not warrant its own document. |

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Stryker mutation testing exceeds 15 min timeout | Low | Low | Scoped to domain/ports only. Increase timeout if needed. Reduce concurrency. |
| ESLint/Prettier config conflicts with existing code | Medium | Low | Configure incrementally. Use `--fix` for initial formatting pass. |
| GitHub Actions free tier minutes exceeded | Very Low | Low | Solo developer, < 10 CI runs/day. Well within 2000 min/month. |
| Husky hooks slow down developer flow | Low | Medium | Pre-commit < 10s (staged files only). Pre-push < 2 min. `--no-verify` escape hatch for emergencies. |

---

## Handoff Notes

### For Software Crafter (BUILD wave)
1. Install devDependencies listed above before starting story implementation
2. Configure ESLint and Prettier before first commit (ensures consistent formatting from day 1)
3. Set up Husky hooks via `npx husky init` after installing
4. dependency-cruiser config (`.dependency-cruiser.cjs`) should be created when the `src/domain/` directory structure is established
5. Stryker config (`stryker.config.mjs`) can wait until first domain logic is written

### For Acceptance Designer (DISTILL wave)
1. CI pipeline runs acceptance tests in the commit stage (same Jest runner)
2. Architecture enforcement (dependency-cruiser) validates boundary compliance automatically
3. KPI instrumentation is embedded in the domain model -- acceptance tests can verify KPI data collection by testing Trip Summary output
