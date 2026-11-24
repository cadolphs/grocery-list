# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Start with [AGENTS.md](AGENTS.md)**: the agent map, risk tiers, the single
`npm run verify` gate, and links to decisions, primitives, and the ship loop.

## Project Overview

This is a React Native mobile app built with Expo SDK 58, targeting iOS, Android, and web platforms. The app uses TypeScript with strict mode enabled and React Native's New Architecture.

## Development Commands

```bash
# Start development server (opens QR code for Expo Go)
npm start

# Platform-specific development
npm run ios      # iOS simulator
npm run android  # Android emulator
npm run web      # Web browser
```

## Testing

```bash
npm run verify        # Full local gate, same as CI
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm test -- path/to/file.test.ts   # Run a single test file
npm run test:scripts  # Unit tests for scripts/*.mjs (node --test)
npm run mutation      # Stryker on changed src/domain + src/ports files (local only)
```

Upgrading a dependency: follow **Dependency upgrades** in [AGENTS.md](AGENTS.md) (`npm install -D` for dev-only packages, `npx expo install` only for runtime Expo/React Native packages).

## Build & Deploy (EAS)

```bash
# Development build (for testing native features)
eas build --profile development

# Preview build (internal testing)
eas build --profile preview

# Production build
eas build --profile production
```

## Development Paradigm

This project follows the **functional programming** paradigm. Factory functions, pure domain functions, hooks — no classes.

## Architecture

- **Pattern**: Ports-and-adapters (hexagonal) with functional TypeScript
- **Entry point**: `index.ts` registers the root component via Expo
- **Root component**: `App.tsx` is the main application component
- **Configuration**: `app.json` contains Expo configuration, `eas.json` contains EAS Build profiles
- **TypeScript**: Extends `expo/tsconfig.base` with strict mode

## Mutation Testing Strategy

- **Strategy**: Per-feature (scoped to modified files in `src/domain/` and `src/ports/`)
- **Command**: `npm run mutation` (files changed versus `origin/main`, including uncommitted work; fetch first); `npm run mutation -- --all` for the whole scope
- **Tool**: Stryker (`@stryker-mutator/core` + `@stryker-mutator/jest-runner`)
- **Kill rate threshold**: >= 80%
- **Scope**: Domain logic and port interfaces only. UI components and adapters excluded (low mutation testing value).
- **Trigger**: Run locally before opening a PR that changes `src/domain/**` or `src/ports/**`, and put the kill rate under **Testing**. Not in CI and not in `npm run verify`: a full run is too slow for either
- **Duration target**: 5-15 minutes per delivery
- **Config file**: `stryker.config.mjs`; runner `scripts/mutation.mjs`

## Agent skills

### Issue tracker

GitHub issues on `cadolphs/grocery-list` via `gh`; product ideas and specs live on the planning board, not in issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), alongside the existing `P0`..`P3` and `needs-decision`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` at the root (created lazily) and ADRs in `docs/adrs/`, written to the repo template (ADR-009 shape, ends with **Revisit if**), not the skill's `ADR-FORMAT.md`. See `docs/agents/domain.md`.

### PR bodies and review

PR bodies always use `.github/pull_request_template.md` (CI checks it); the `pr` skill's diagrams go under **System recap** and its before/after evidence under **Testing**. The pre-merge review is the `pr-review` subagent; the `code-review` skill is optional on top. See `docs/agents/pr-and-review.md`.
