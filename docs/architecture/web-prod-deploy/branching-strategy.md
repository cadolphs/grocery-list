# Branching Strategy — web-prod-deploy

## Chosen: GitHub Flow

- Single long-lived branch: `main`.
- Short-lived feature branches off `main` (optional for solo dev — direct commits to `main` also acceptable given the CI gate).
- PRs into `main` trigger `ci.yml`; push to `main` triggers both `ci.yml` and (via `workflow_run`) `deploy-web.yml`.

Rationale:
- Matches existing `ci.yml` trigger config (`on: push: main` + `on: pull_request: main`).
- Solo dev + two-device single-user app = no release calendar to coordinate.
- Simpler than GitFlow; still allows per-PR CI validation when desired.

## Rejected alternatives

| Strategy | Rejected because |
|---|---|
| Trunk-based (commits direct to `main` only, no branches) | Loses PR-based CI preview for experimental changes. GitHub Flow is a superset — solo dev can still commit direct when appropriate. |
| GitFlow (develop + main + release/* + hotfix/*) | Overhead without benefit. No release cadence, no multi-version support, single deploy target. |
| Release branching | Same reason as GitFlow. No past releases to maintain. |

## CI/CD trigger alignment

| Event | ci.yml | deploy-web.yml |
|---|---|---|
| Push to `main` | ✅ runs | ✅ runs (chained on `ci.yml` success) |
| PR opened/updated to `main` | ✅ runs | ❌ does not run (workflow_run filters branches to `main`) |
| Push to any other branch | ❌ | ❌ |
| Tag push | ❌ | ❌ (no tag-triggered workflow) |

## Branch protection (recommended, NOT in scope of this feature)

Follow-up to add via GitHub repo settings → Branches → Branch protection rules on `main`:
- Require status check: `commit-stage` (from ci.yml)
- Require linear history (no merge commits from accidental `git pull`)
- Prevent force-push
- PR review: NOT required (solo dev); revisit if collaborators join

These are settings, not code, so they are provisioned by Clemens in the GitHub UI and noted in `docs/deploy.md`.

## Commit / merge conventions

No change from current. Existing commit history shows Conventional Commits style (`feat(scope):`, `fix(scope):`, `docs(scope):`). Keep doing that.

## Release cadence

Implicit. Every green push to `main` is a release. No tags, no changelogs, no GitHub Releases — the git log IS the changelog for a solo-dev project.

## When to revisit

- If a second developer joins: add PR-review requirement.
- If the app gains a paying customer tier: introduce a staging environment and a `release/*` or tag-based deploy trigger.
- If features need feature flags or gradual rollout: re-open with a GitFlow or trunk+release-train model.
