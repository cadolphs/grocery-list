# DISCUSS Decisions — expo-web-unify

## Key Decisions

- **[D1] Feature type = Infrastructure / cross-cutting.** Touches deploy workflow + firebase config + production code (deletes a sub-app). No new user-facing features.
- **[D2] No walking skeleton.** Mobile Expo web already works (`npm run web` proves it). This feature is a deploy-target swap + dead-code deletion, not net-new product.
- **[D3] Lightweight UX.** No new UX surface — Expo web's RN UI is the UX, and it was already designed in the mobile journeys.
- **[D4] JTBD skipped.** Motivation trivially clear: "stop maintaining two web apps; mobile is already better."
- **[D5] Deploy artifact path: `dist/` at repo root.** This is Expo's default output for `npx expo export -p web`. No custom `--output-dir`; keep the default so future Expo users reading the code aren't surprised.
- **[D6] Atomic delivery of US-01 + US-02.** Ship them in the same pull / push / delivery cycle. Half-migrations leave the repo in an ambiguous state (config pointing at one bundle, code for another still checked in).
- **[D7] US-03 is optional.** Hoisting web-auth's pure modules to shared mobile `src/auth/` would be nice but the mobile code works fine with inline rules. Defer unless the appetite is there after R1.
- **[D8] Do NOT attempt to preserve `/web` git history in the new paths.** Deletion is clean: `git rm -r web/`. The web-auth feature's DESIGN/DISTILL docs remain as reference in `docs/feature/web-auth/`; they document decisions for a code path that no longer exists but the decisions themselves (single-screen toggle, 8-char min, mode-aware error mapping) translate to mobile if we ever revisit US-03.
- **[D9] Keep firebase.json SPA rewrite as-is.** Expo web also produces an SPA that needs `**` → `/index.html` for client-side routes.
- **[D10] No workflow_run ref change.** `deploy-web.yml` still chains off `ci.yml`. The CI workflow itself already lints + jest-tests the whole repo, which covers Expo web code.
- **[D11] No mobile test regression allowed.** US-02 deletes `/web/` only; mobile tests (`tests/**`) are untouched. CI + mutation testing unaffected.

## Requirements Summary

- **Primary need**: eliminate the parallel Vite/web codebase; serve Expo's RN app on the web prod URL instead.
- **Scope**: 2 stories (US-01 deploy swap, US-02 delete /web) — atomic delivery. Optional US-03 salvage.
- **Feature type**: Infrastructure / cross-cutting (deploy + code removal).

## Constraints Established

- Expo web must still build (`npx expo export -p web` at repo root MUST succeed).
- Mobile (`src/**`) untouched in this feature.
- No Firebase project-level changes: same project, same domain, same authorized domains, same service-account secret.
- `firebase.json` and `.github/workflows/deploy-web.yml` are the only files changed on the hosting side.

## Upstream Changes

**Supersedes** some content of:
- Feature `web-auth` — its production code (`/web/src/auth/`, `/web/src/components/LoginScreen.tsx`, the rewritten `/web/src/App.tsx`) will be deleted by this feature's US-02. The web-auth evolution doc notes "ships a stack that will be superseded by expo-web-unify"; this feature's evolution doc cross-links back.
- The `web-auth` feature's tests (`/web/src/**.test.ts(x)`) will also disappear. Main-repo tests (`tests/acceptance/**`) are untouched.

**Does NOT supersede**:
- Feature `web-prod-deploy` (hosting config, CI wiring, service account setup, docs/deploy.md). Only the build-step specifics change.

## Handoff

- **To DESIGN (nw-solution-architect)**: tiny pass. Confirm deploy-web.yml shape with the Expo build step; note any RN-web-specific concerns (e.g., static-asset paths) if they exist (they shouldn't — Expo handles it).
- **To DEVOPS**: trivial — build step swap in the existing workflow. Environments.yaml barely changes (ci-runner now runs `expo export -p web` instead of `npm run build` in /web).
- **To DISTILL**: ~4-5 acceptance scenarios (firebase.json path check, workflow step check, live URL check, /web absence check). Can reuse the web-prod-deploy test-pattern (repo-state + workflow YAML assertions) with one addition: a post-deploy manual check for "real RN UI renders on live URL" (analogous to web-prod-deploy's K3/K5 drills).
- **To DELIVER**: 2-3 steps (swap firebase.json, swap deploy workflow, delete /web). Atomic single push. Post-push: reload live URL and confirm real app shows up. If wrong, `firebase hosting:rollback`.
