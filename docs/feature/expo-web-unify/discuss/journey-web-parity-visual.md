# Journey: Web app serves the real RN UI (parity with mobile)

**Feature**: expo-web-unify
**Actor**: Clemens (solo dev + end user)
**Goal**: Open `https://grocery-list-cad.web.app` on any browser and use the actual grocery-list app — the same styled, feature-complete UI you already have on Android — without a parallel Vite codebase to maintain.

## Narrative

Clemens has been maintaining two web experiences: the real Expo RN app (works on web via `react-native-web`, `npm run web`) and a stripped-down `/web` Vite SPA shipped via Firebase Hosting. The Vite app was started before Expo web caught up. It has none of the mobile UI polish, none of the sweep/edit/areas flows, and required re-implementing auth/validation/error-mapping from scratch (see feature `web-auth`).

Instead of spending cycles styling the Vite app to match mobile, retire it. Swap the Firebase Hosting deploy to serve Expo's web export. Delete the `/web` directory. Web gains all mobile features automatically.

## Mental model

- Same git repo, one UI codebase (`src/ui/**`), two deploy outputs: EAS (Android/iOS) + Firebase Hosting (web).
- `npx expo export -p web` produces a static bundle identical in behavior to `expo start --web`.
- Firebase Hosting still serves the bundle — just a different `public:` path in `firebase.json`.
- Auth, Firestore, offline cache, sync — all already working on Expo web. No new wiring.

## Happy path

| # | Step | Output | Emotion |
|---|------|--------|---------|
| 1 | Swap `firebase.json` `hosting.public` from `"web/dist"` to `"dist"` | SPA rewrite + config still valid | neutral |
| 2 | Swap `deploy-web.yml` build step from `cd web && npm run build` to `npx expo export -p web` at repo root | Artifact moves to `/dist/` | neutral |
| 3 | Delete `/web/` directory | `-O(10k)` lines of redundant code | relief |
| 4 | Push to main | CI green, deploy-web publishes Expo bundle | anticipation |
| 5 | Open live URL in browser | Full grocery-list app appears: staples table, sweep, area management, everything | "finally" |
| 6 | Sign in with existing credentials | Dashboard works | trust |

## Error paths

| Failure | Recovery |
|---------|----------|
| Expo web bundle fails to load in browser (missing asset, RN polyfill issue) | Run `npm run web` locally to reproduce; fix before pushing |
| `expo export -p web` fails in CI (e.g. missing asset, TypeScript) | CI catches; deploy never runs; prior release stays live |
| Firebase Hosting serves a stale bundle (browser cache) | `firebase hosting:rollback` if bad; hard-refresh otherwise; Firebase Hosting auto-sets cache headers |
| Deleted `/web/` referenced somewhere unexpectedly | Repo-wide grep before deletion; CI + acceptance tests catch remnants |

## Emotional arc

The arc here is "eliminating tax" rather than "unlocking delight". The real goal: stop paying cost. Clemens's satisfaction comes from deleting ~1500 lines of code and knowing every future mobile feature lands on web for free.

## Shared artifacts

- `dist/` (NEW root-level output from `expo export -p web`) — consumed by Firebase Hosting deploy
- `firebase.json` — `hosting.public` swap is the sole code change to this file
- `.github/workflows/deploy-web.yml` — build step swap is the sole change here
- Expo web bundle semantics — unchanged from what `npm run web` already produces locally
- Firebase Auth session / authorized domains — unchanged (same project, same domain)

## Non-goals (explicit)

- No new features on the web experience (whatever's on mobile ships as-is)
- No visual polish (already polished on mobile — that's the point)
- No splitting codebases or introducing monorepo workspaces
- No changes to Android/iOS EAS build pipeline
- No changes to Firebase project, Firestore rules, auth providers

## What might surface during the swap

- Mobile uses `AsyncStorage` for some persistence; Expo web polyfills it via `localStorage`. Already working per existing `npm run web` flow.
- Deep-linking / native-only APIs: mobile already guards these; Expo web no-ops correctly. Confirmed by existing web workflow.
- Bundle size: Expo web bundles are larger than Vite (RN runtime included). At single-user scale, irrelevant. Firebase Hosting free tier unaffected.
- SEO: N/A (single-user auth-gated app)
