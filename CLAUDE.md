# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React Native mobile app built with Expo SDK 54, targeting iOS, Android, and web platforms. The app uses TypeScript with strict mode enabled and React Native's New Architecture.

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
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm test -- path/to/file.test.ts   # Run a single test file
```

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

This project follows the **functional programming** paradigm. Use @nw-functional-software-crafter for implementation. Factory functions, pure domain functions, hooks — no classes.

## Architecture

- **Pattern**: Ports-and-adapters (hexagonal) with functional TypeScript
- **Entry point**: `index.ts` registers the root component via Expo
- **Root component**: `App.tsx` is the main application component
- **Configuration**: `app.json` contains Expo configuration, `eas.json` contains EAS Build profiles
- **TypeScript**: Extends `expo/tsconfig.base` with strict mode

## Mutation Testing Strategy

- **Strategy**: Per-feature (scoped to modified files in `src/domain/` and `src/ports/`)
- **Tool**: Stryker (`@stryker-mutator/core` + `@stryker-mutator/jest-runner`)
- **Kill rate threshold**: >= 80%
- **Scope**: Domain logic and port interfaces only. UI components and adapters excluded (low mutation testing value).
- **Trigger**: On push to `main` when `src/domain/**` or `src/ports/**` files change
- **Duration target**: 5-15 minutes per delivery
- **Config file**: `stryker.config.mjs`
- **CI workflow**: `.github/workflows/mutation.yml`
