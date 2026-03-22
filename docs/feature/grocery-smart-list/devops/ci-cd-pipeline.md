# CI/CD Pipeline Design: Grocery Smart List

**Feature ID**: grocery-smart-list
**Wave**: DESIGN (Platform)
**Date**: 2026-03-17

---

## Pipeline Overview

Two-tier quality gate system: local hooks for fast developer feedback, GitHub Actions for authoritative CI.

```
LOCAL (developer machine)              REMOTE (GitHub Actions)
================================       ================================
pre-commit (< 10s)                     Commit Stage (< 5 min)
  - format check (prettier)              - install dependencies
  - lint (eslint)                        - typecheck (tsc --noEmit)
  - secrets scan (grep patterns)         - lint (eslint)
                                         - unit tests (jest)
pre-push (< 2 min)                       - architecture check (dep-cruiser)
  - typecheck (tsc --noEmit)             - npm audit
  - unit tests (jest)
  - architecture check (dep-cruiser)   Mutation Stage (< 15 min, per-feature)
                                         - stryker on modified files
                                         - kill rate >= 80% gate
```

---

## Local Quality Gates

### Pre-commit Hook (target: < 10 seconds)

| Check | Tool | Gate Type |
|-------|------|-----------|
| Code formatting | Prettier (via lint-staged) | Blocking |
| Linting | ESLint (via lint-staged, staged files only) | Blocking |
| Secrets scan | grep for common patterns (API keys, tokens) | Blocking |

### Pre-push Hook (target: < 2 minutes)

| Check | Tool | Gate Type |
|-------|------|-----------|
| Type checking | `tsc --noEmit` | Blocking |
| Unit tests | `jest --bail` | Blocking |
| Architecture enforcement | `dependency-cruiser --validate` | Blocking |

### Implementation: Husky + lint-staged

Husky is the standard git hooks manager for JS/TS projects. lint-staged runs checks only on staged files for pre-commit speed.

**New devDependencies needed**:
- `husky` -- git hook manager
- `lint-staged` -- run linters on staged files
- `prettier` -- code formatter
- `eslint` -- linter (with `@expo/eslint-config` or similar)

**package.json additions**:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["prettier --check", "eslint --max-warnings 0"],
    "*.{json,md}": ["prettier --check"]
  },
  "scripts": {
    "prepare": "husky",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "tsc --noEmit",
    "arch:check": "depcruise --validate .dependency-cruiser.cjs src/",
    "test:mutation": "stryker run"
  }
}
```

---

## GitHub Actions Workflow: Commit Stage

**Trigger**: Push to `main`, pull requests to `main`.

**Target duration**: < 5 minutes.

### Quality Gates

| Gate | Threshold | Type |
|------|-----------|------|
| TypeScript compilation | Zero errors | Blocking |
| ESLint | Zero warnings (--max-warnings 0) | Blocking |
| Jest unit tests | 100% pass rate | Blocking |
| Jest coverage | >= 80% lines | Blocking |
| dependency-cruiser | Zero violations | Blocking |
| npm audit | Zero high/critical vulnerabilities | Blocking |

### Workflow File: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  commit-stage:
    name: Commit Stage
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Lint
        run: npx eslint . --ext .ts,.tsx --max-warnings 0

      - name: Unit tests
        run: npx jest --ci --coverage --bail

      - name: Coverage gate
        run: |
          COVERAGE=$(npx jest --ci --coverage --coverageReporters=json-summary 2>/dev/null | tail -1 || true)
          # Jest outputs coverage summary; the --bail in previous step ensures tests pass
          # Coverage threshold is configured in jest config (see below)

      - name: Architecture enforcement
        run: npx depcruise --validate .dependency-cruiser.cjs src/

      - name: Security audit
        run: npm audit --audit-level=high
```

### Jest Coverage Threshold (add to package.json jest config)

```json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "lines": 80,
        "branches": 75,
        "functions": 80,
        "statements": 80
      }
    }
  }
}
```

---

## GitHub Actions Workflow: Mutation Testing Stage

**Trigger**: Push to `main` only (not on PRs to keep PR feedback fast).

**Target duration**: < 15 minutes (per-feature, scoped to modified files).

**Strategy**: Per-feature mutation testing using Stryker. Runs on modified `src/domain/` and `src/ports/` files only -- these contain the business logic worth mutation testing. UI components and adapters are excluded (low value, high cost).

### Quality Gate

| Gate | Threshold | Type |
|------|-----------|------|
| Mutation kill rate | >= 80% on domain/ports files | Blocking |

### Workflow File: `.github/workflows/mutation.yml`

```yaml
name: Mutation Testing

on:
  push:
    branches: [main]
    paths:
      - 'src/domain/**'
      - 'src/ports/**'

jobs:
  mutation:
    name: Mutation Testing (Per-Feature)
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run Stryker (scoped to domain and ports)
        run: npx stryker run

      - name: Upload mutation report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: mutation-report
          path: reports/mutation/
          retention-days: 7
```

### Stryker Configuration (`stryker.config.mjs`)

```javascript
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  mutate: [
    'src/domain/**/*.ts',
    'src/ports/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  testRunner: 'jest',
  jest: {
    configFile: 'package.json',
  },
  reporters: ['html', 'clear-text', 'progress'],
  htmlReporter: {
    fileName: 'reports/mutation/index.html',
  },
  thresholds: {
    high: 90,
    low: 80,
    break: 80,
  },
  timeoutMS: 10000,
  concurrency: 2,
};
```

**New devDependencies needed**:
- `@stryker-mutator/core`
- `@stryker-mutator/jest-runner`
- `@stryker-mutator/typescript-checker`

---

## EAS Build Integration

EAS Build is triggered manually (not from CI) for this project. The CI pipeline ensures code quality; the developer triggers builds when ready to ship.

```bash
# After CI passes on main:
eas build --profile preview    # Internal testing
eas build --profile production # App store submission
eas submit --platform ios      # Submit to App Store
eas submit --platform android  # Submit to Google Play
```

Future enhancement: Add a `deploy` workflow that triggers EAS Build via `eas-cli` after the commit stage passes on tagged releases. This is deferred until the release cadence warrants automation.

---

## Caching Strategy

| Cache | Key | Path |
|-------|-----|------|
| npm dependencies | `runner.os-npm-hash(package-lock.json)` | `~/.npm` |
| Jest cache | Managed by jest-expo preset | `.jest-cache/` |

The `actions/setup-node@v4` with `cache: npm` handles dependency caching automatically.

---

## Pipeline Diagram

```
push to main
  |
  v
[Commit Stage] -----> FAIL --> Block
  |                            (fix locally, push again)
  | PASS
  v
[Mutation Stage] ---> FAIL --> Block (advisory initially, blocking after baseline)
  |
  | PASS
  v
Ready for EAS Build (manual trigger)
  |
  v
[EAS Build: preview] --> Internal testing
  |
  v
[EAS Build: production] --> App store submission
```
