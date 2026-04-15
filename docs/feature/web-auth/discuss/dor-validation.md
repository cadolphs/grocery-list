# Definition of Ready — web-auth

| # | DoR item | Status | Evidence |
|---|---|---|---|
| 1 | Business value articulated | ✅ | Journey visual: unblocks the web companion app (currently unusable — stale email-link flow on a deprecated Dynamic Links dependency). |
| 2 | User / actor identified | ✅ | Clemens (solo dev + end user). Same Firebase Auth account as mobile. |
| 3 | Acceptance criteria testable | ✅ | Every AC in user-stories.md is testable via (a) unit tests on pure validation functions, (b) React Testing Library on `LoginScreen`, (c) integration with a Firebase Auth test fixture (emulator or live test account). Mobile's `LoginScreen.test.tsx` is a reference template. |
| 4 | Dependencies identified | ✅ | Depends on: `web-prod-deploy` (shipped, prod URL live). External: Firebase Auth email/password provider must be enabled (one-time console action); `grocery-list-cad.web.app` must be in authorized domains (usually auto-added). |
| 5 | Non-functional requirements defined | ✅ | outcome-kpis.md: time-to-first-signed-in-view, session persistence on reload, validation message quality. |
| 6 | UX / UI reviewed | ✅ | Journey visual + story map reviewed. Visual polish explicitly deferred — raw HTML acceptable for MVP given single-user context. |
| 7 | Technical approach agreed | ✅ | Port mobile's `AuthService` verbatim (Firebase SDK is identical between RN and web). Rewrite `LoginScreen` as React DOM (RN primitives don't exist in this Vite app). Validation logic copies. |
| 8 | Estimable / sized | ✅ | 7 stories, total ~3 h. Each <1 h. Easy single-delivery cycle. |
| 9 | Rollback / risk plan | ✅ | Small blast radius: only `/web/src/` + deletion of stale `useAuth.ts`. Rollback = revert commits. Web app was already unusable, so worst case restores the pre-feature unusable state. Mobile app completely unaffected (separate codebase). |

## Outstanding concerns

**Minor**: Firebase Auth email/password provider must be enabled in the console before sign-up will work (one-time manual step). Document in `docs/deploy.md` alongside existing service-account setup. Flagged as "pre-push ops" — does not block DESIGN.

## Peer review

Target reviewer: `nw-product-owner-reviewer`. Can be skipped per user autonomy preference for this scale of feature (single-user personal project, reuses pattern already proven in mobile).
