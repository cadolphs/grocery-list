# Branching Strategy: Grocery Smart List

**Feature ID**: grocery-smart-list
**Wave**: DESIGN (Platform)
**Date**: 2026-03-17

---

## Selected Strategy: Trunk-Based Development

**Rationale**: Solo developer, single deployment target, continuous delivery mindset. No need for long-lived branches, release branches, or complex merge choreography.

### Rejected Alternatives

| Alternative | Why Rejected |
|------------|-------------|
| GitHub Flow | PR-based review adds friction for solo developer. Self-review on PRs provides marginal value vs. local quality gates + CI. |
| GitFlow | Designed for teams with scheduled releases and multiple supported versions. Massive overhead for solo developer. |
| Release Branching | Only one version in production (latest app store build). No need for parallel release support. |

---

## Workflow

### Daily Development

```
main (always releasable)
  |
  +-- feature/US-01-add-staple (< 1 day, ideally < 4 hours)
  |     |
  |     +-- commit, commit, commit
  |     |
  |     +-- push (pre-push hooks run)
  |     |
  |     +-- merge to main (fast-forward or squash)
  |
  +-- feature/US-02-preloaded-staples
  |     ...
```

### Rules

1. **Main is always releasable**: Every commit on `main` passes CI. If it does not, fix immediately.
2. **Short-lived feature branches**: One branch per user story. Merge within 1 day. Delete after merge.
3. **No long-lived branches**: No `develop`, no `release/*`, no `hotfix/*`.
4. **Direct commits to main allowed**: For trivial fixes (typos, config tweaks). Quality gates still run.
5. **Feature flags for incomplete work**: If a story takes more than 1 day, use a feature flag to merge incomplete work behind a toggle. This keeps main releasable.

---

## Branch Naming Convention

```
feature/US-{nn}-{short-description}    # Story implementation
fix/{short-description}                 # Bug fixes
chore/{short-description}               # Tooling, config, docs
```

Examples:
- `feature/US-01-add-staple-item`
- `fix/async-storage-serialization`
- `chore/add-eslint-config`

---

## Pipeline Triggers

| Event | Trigger | Pipeline |
|-------|---------|----------|
| Push to `main` | Automatic | Full CI (commit stage + mutation testing) |
| Push to `feature/*` | Automatic | Commit stage only |
| Tag `v*` | Manual (developer creates tag) | CI + EAS Build production |

---

## Branch Protection (GitHub)

Minimal protection appropriate for solo developer:

| Rule | Setting | Rationale |
|------|---------|-----------|
| Require status checks | Yes (commit-stage job) | Prevent broken code on main |
| Require branches up to date | Yes | Ensure CI ran on latest main |
| Require PR reviews | No | Solo developer -- self-review via local hooks + CI |
| Require signed commits | No | Personal project, not required |
| Restrict force pushes | Yes | Protect commit history |
| Restrict deletions | Yes | Protect main branch |

---

## Release Workflow

### Versioning: Semantic Versioning

```
v{MAJOR}.{MINOR}.{PATCH}

MAJOR: Breaking changes to data schema (requires migration)
MINOR: New user stories completed (new features)
PATCH: Bug fixes, performance improvements
```

### Release Process

1. All stories for the release merged to `main` and passing CI
2. Update version in `app.json` and `package.json`
3. Create git tag: `git tag v1.1.0`
4. Push tag: `git push origin v1.1.0`
5. Trigger EAS Build: `eas build --profile production`
6. Submit to stores: `eas submit --platform all`

### Future Enhancement

Automate steps 4-6 via a GitHub Actions release workflow triggered by version tags. Deferred until release cadence warrants the investment.
