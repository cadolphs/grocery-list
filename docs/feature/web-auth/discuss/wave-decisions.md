# DISCUSS Decisions — web-auth

## Key Decisions

- **[D1] Feature type = User-facing.** Adds UI (sign-in screen) and a new auth port in `/web/src/auth/`.
- **[D2] No walking skeleton.** Web app already ships (feature `web-prod-deploy`); this feature adds one screen and removes stale code.
- **[D3] Lightweight UX depth.** Single actor (Clemens). Visual polish explicitly deferred — raw semantic HTML acceptable for MVP.
- **[D4] JTBD skipped.** Motivation trivially derivable: mobile migrated to email/password on 2026-04-10 because Firebase Dynamic Links was deprecated; web was left on the stale flow and needs the same migration.
- **[D5] Reuse mobile's AuthService pattern verbatim.** `src/auth/AuthService.ts` is framework-agnostic (pure TS + Firebase SDK). Port near-verbatim to `/web/src/auth/AuthService.ts`. Do NOT reuse the file directly via import — the web Vite app is intentionally a separate package with its own `package.json` and different React version (18 vs 19).
- **[D6] Rewrite mobile LoginScreen as plain React DOM.** Mobile's `src/ui/LoginScreen.tsx` uses React Native primitives (`View`, `TextInput`, `Pressable`, `StyleSheet`) that don't exist in the web Vite app. Copy the *logic* (validation, state machine, mode toggle) but render native HTML elements (`form`, `input`, `button`).
- **[D7] Delete `/web/src/hooks/useAuth.ts` entirely.** Stale email-link code. Not worth adapting. Replace with a new `useAuth` (or expose `AuthService` directly through React context — defer that choice to DESIGN).
- **[D8] Single-screen with mode toggle.** Mirrors mobile. Rejected alternative: separate sign-in / sign-up screens (more navigation, no benefit at this scale).
- **[D9] Password minimum = 8 chars on sign-up.** Matches mobile. Firebase's own minimum is 6; the 8-char rule is app-level, not service-level.
- **[D10] No forgot-password / MFA / OAuth in this feature.** Deferred to separate features if ever needed. Single user → password reset is a Firebase console operation.
- **[D11] Visual polish deferred.** Existing feature `web-ux-polish` covers dashboard polish; this feature stays unpolished (raw HTML). Future polish could extend to the login screen in a follow-up.
- **[D12] Pre-push ops task**: Firebase Auth email/password provider must be enabled in the Firebase console (one-time). Document in `docs/deploy.md` alongside existing service-account steps.

## Requirements Summary

- **Primary need**: Make the web app usable by providing a working sign-in screen that matches mobile's email/password auth pattern.
- **Walking skeleton scope**: Entire feature IS the skeleton — 7 stories, ~3 h total, shippable as a single delivery (see prioritization.md for optional release-1/2/3 staging).
- **Feature type**: User-facing (web only).

## Constraints Established

- Cannot reuse mobile auth code directly (different package, different primitives).
- Must not break mobile auth (`src/auth/**`, `src/ui/LoginScreen.tsx` — untouched).
- Must not break mobile acceptance tests (`tests/acceptance/auth-password-migration/**`).
- Firebase project grocery-list-cad is shared — any email/password account created on web also usable on mobile.
- `grocery-list-cad.web.app` must be in Firebase Auth authorized domains (usually auto-added; verify once).

## Upstream Changes

None. This feature implements a flow that DISCOVER (implicit, evolution log) already proved viable on mobile. No prior assumptions changed.

## Handoff

- **To primary**: nw-solution-architect (DESIGN) — small scope, probably single pass.
- **To secondary**: nw-platform-architect (DEVOPS, KPIs only) — KPIs are one-shot manual checks; no instrumentation needed.
- **Key deliverables to hand off**: `user-stories.md`, `story-map.md`, `outcome-kpis.md`, `journey-sign-in.yaml`, shared-artifacts registry.
- **DESIGN may skip** some typical outputs (no new architectural boundary; reusing existing patterns from mobile). Key architectural question for DESIGN: do we introduce a React context for auth state or keep it as a hook?
