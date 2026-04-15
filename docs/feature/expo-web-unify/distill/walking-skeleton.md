# Walking Skeleton — expo-web-unify

## Definition

Prove the migration end-to-end: (1) hosting config points at root `dist/`, (2) deploy workflow runs `npx expo export -p web` at repo root (not inside `/web/`), (3) `/web/` is gone, (4) no stale references linger.

A passing suite means a push-to-main would build the Expo web bundle and publish it in place of the Vite bundle. The live-URL behavior is validated by a manual K1 drill post-deploy.

## Strategy

**C (Real local):** real filesystem I/O on repo config. No live Firebase calls, no `expo export` invocation in tests.

## Scenarios (see `walking-skeleton.feature`)

1. `firebase.json` hosting.public = `"dist"`
2. `firebase.json` SPA rewrite still `**` → `/index.html` (unchanged from web-prod-deploy)
3. `.github/workflows/deploy-web.yml` has a step running `expo export` (or `npx expo export`) with platform `web` at repo root
4. `deploy-web.yml` no longer references `working-directory: web`
5. `deploy-web.yml` still chains off `ci.yml` via `workflow_run` (unchanged invariant)
6. Deploy step still uses `FirebaseExtended/action-hosting-deploy` with the same secret (unchanged invariant)
7. `/web/` directory does not exist
8. No production-code references to `/web/*` (grep invariant in `.github/`, `src/`, top-level config)

## Why this is a valid walking skeleton

- End-to-end: each of the 4 core changes (path swap, build-step swap, deletion, grep-clean) is an assertion. Pass means the pipeline is mechanically correct.
- Integration checkpoints: config → workflow → build-step → artifact path → hosting-publish. All on-disk and verifiable statically.

## What this skeleton cannot verify

| Gap | Why jest can't | Verification |
|---|---|---|
| `npx expo export -p web` actually produces a valid bundle | would require running Expo build | First green CI/deploy run validates it |
| Live URL serves the Expo UI (not a stale Vite release) | requires HTTP + DNS | Manual K1 drill: open `grocery-list-cad.web.app` post-deploy |
| Sign-in with real credentials still works | requires live Firebase | Manual K2 drill: sign in post-deploy |
| Firebase Hosting cache behavior | live-traffic observation | K3 drill if needed |

All intentional out-of-scope items. Same pattern as `web-prod-deploy` (K1/K2/K3/K5 drills documented in `docs/deploy.md`).
