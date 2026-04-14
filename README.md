# grocery-list

A React Native / Expo app for managing grocery lists across iOS, Android, and
the web. Solo-dev project; functional-programming paradigm with a ports-and-
adapters architecture.

## Development

```bash
npm start       # Expo dev server (QR code for Expo Go)
npm run ios     # iOS simulator
npm run android # Android emulator
npm run web     # Web browser
```

## Testing

```bash
npm test              # run all tests
npm run test:watch    # watch mode
npm test -- path/to/file.test.ts   # single test file
```

Acceptance tests live in `tests/acceptance/`. Mutation testing (Stryker) is
scoped to `src/domain/**` and `src/ports/**`; see `stryker.config.mjs`.

## Deployment

The web build deploys automatically to
[https://grocery-list-cad.web.app](https://grocery-list-cad.web.app) on every
push to `main` via `.github/workflows/deploy-web.yml`. For the full runbook —
rollback, manual fallback, and service-account rotation — see
[docs/deploy.md](docs/deploy.md).

Android ships via EAS Build (`eas build --profile production`) and is out of
scope for the web deploy runbook.

## Architecture

Ports-and-adapters (hexagonal) with functional TypeScript. Factory functions,
pure domain functions, hooks — no classes. See `CLAUDE.md` for the full
project conventions.
