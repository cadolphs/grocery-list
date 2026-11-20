# ADR-010: No direct pushes to main

Status: accepted Date: 2026-11-02

## Decision

Agents never push to `main`. Every change goes on a branch, opens a PR using
`.github/pull_request_template.md`, passes `npm run verify` in CI, and follows
the `ship-pr` skill. Branch protection must require both the CI "Commit Stage"
check and the "PR hygiene" check (PR template and risk tier, a separate
workflow since #73); the maintainer keeps an admin bypass for emergencies.

## Why

A push to `main` deploys the web app and Firestore rules straight to
production. The PR is where risk tier, proof, and review happen.

## Revisit if

The project gains a staging environment that every `main` commit hits first,
or the maintainer drops the agent workflow.
