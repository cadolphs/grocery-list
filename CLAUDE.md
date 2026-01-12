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

## Architecture

- **Entry point**: `index.ts` registers the root component via Expo
- **Root component**: `App.tsx` is the main application component
- **Configuration**: `app.json` contains Expo configuration, `eas.json` contains EAS Build profiles
- **TypeScript**: Extends `expo/tsconfig.base` with strict mode
