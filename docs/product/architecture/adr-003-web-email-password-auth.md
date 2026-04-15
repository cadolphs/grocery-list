# ADR-003: Web App Email/Password Auth — Mirror Mobile, Not Monorepo

## Status

Accepted (2026-04-14)

## Context

The web app (`/web/`, a Vite + React 18 bundle) is currently on a deprecated email-link auth flow (`/web/src/hooks/useAuth.ts` using `sendSignInLinkToEmail` / `signInWithEmailLink`). The RN mobile app was migrated to email/password on 2026-04-10 (see `docs/evolution/2026-04-10-auth-password-migration.md`). Firebase Dynamic Links deprecation makes the web path unusable.

The feature `web-auth` adds the same email/password flow to the web app. The architectural question: how do we share the auth logic between the two apps?

### Business drivers

- Restore web app usability (currently renders only a heading).
- Keep the two apps consistent in behavior (same credentials work across both; same validation rules; same 8-char sign-up minimum).
- Minimize maintenance drag from having two codebases for the same feature.

### Constraints

- `/web` is a **separate package** with its own `package.json`, React 18, Vite 6.
- The RN app uses React 19 and React Native primitives (`View`, `TextInput`, `Pressable`).
- Project is solo-dev (Clemens); team size = 1.
- Feature must fit in ~3 hours of DELIVER work across 7 small stories.
- Visual polish is explicitly deferred (DISCUSS D11).
- Monorepo introduction is explicitly out of scope (DISCUSS D5).

## Decision

**Mirror the mobile `AuthService` pattern verbatim in `/web/src/auth/AuthService.ts`.** Port the source ~80 LoC by hand. The web version imports `firebase/auth` from the web app's `package.json` and uses the web `firebase-config.ts`. Render tier is rewritten as plain React DOM (`<form>`, `<input>`, `<button>`) — RN primitives don't exist in the web bundle.

Factor validation into `/web/src/auth/validation.ts` (pure) and Firebase error mapping into `/web/src/auth/error-mapping.ts` (pure). Expose auth state to components via a thin `/web/src/auth/useAuthState.ts` hook that subscribes to `AuthService.onAuthStateChanged` — no React context.

## Alternatives considered

### Option A: Monorepo with shared `@grocery-list/auth-core` workspace package

Introduce npm/yarn workspaces. Extract `AuthService` + validation into a shared package consumed by both `/src` (RN) and `/web`.

- **Pro**: Single source of truth; bug fixed once.
- **Con**: Forces React version alignment (RN 19 vs web 18) if any React imports leak. AuthService itself has no React imports today, but any co-located hook would.
- **Con**: Build tooling complexity — Vite + Metro + TypeScript project references; tsconfig paths; EAS/Firebase Hosting build scripts all need workspace-awareness.
- **Con**: Solo dev, ~80 LoC of duplication, feature budget of 3 hours. Workspace setup alone exceeds the feature budget.
- **Con**: Explicitly rejected by DISCUSS D5.
- **Rejected**: Cost vastly exceeds benefit at team size 1 and this surface area.

### Option B: Reuse mobile's file via relative import / TypeScript path

`/web/src/auth/AuthService.ts` re-exports from `../../../src/auth/AuthService.ts`.

- **Pro**: Zero duplication; trivial to set up.
- **Con**: The mobile file imports `../adapters/firestore/firebase-config` (RN path). Web has its own firebase-config at a different path. Would require path-remapping or abstracting the config injection.
- **Con**: `/web/tsconfig.json` would need to reach outside `/web`, breaking the "two separate apps" invariant. Vite config would need similar concessions.
- **Con**: Future RN-specific changes (e.g., importing React Native utilities) would silently break the web build.
- **Rejected**: False economy; couples the two app builds without a workspace contract to guard the coupling.

### Option C: React Context `<AuthProvider>` over both a hook and a factory

Wrap `<App>` in `<AuthProvider>`; expose `{ user, loading, signIn, signUp, signOut }` via `useContext`.

- **Pro**: Standard React auth pattern; obvious to future contributors.
- **Con**: The component tree is exactly 2 nodes deep (`App` → `AuthenticatedApp`). Prop drilling for `signOut` is one hop. Context adds indirection with no reduction in passes.
- **Con**: Diverges from mobile's hook-only pattern; asymmetry for no gain.
- **Rejected for now**: Easy to promote to context if the tree grows. Keep simpler today.

### Option D: Keep `/web/src/hooks/useAuth.ts` and add email/password methods alongside email-link ones

- **Con**: Keeps dead code (Dynamic Links is deprecated externally).
- **Con**: Name `useAuth` already exists and carries the wrong semantics (state container, not service port).
- **Rejected**: DISCUSS D7 explicitly says delete it.

## Consequences

### Positive

- Web auth behavior is identical to mobile auth behavior from day one (same validation rules, same 8-char minimum, same `AuthResult` shape).
- No new build tooling. Each app remains independently buildable and deployable.
- AuthService in both apps is framework-agnostic (pure TS + Firebase SDK) — unit-testable without React.
- `/web/src/components/` and `/web/src/hooks/` stay free of direct `firebase/auth` imports (enforced via dependency-cruiser per the design doc).

### Negative

- **Duplication**: ~80 LoC of AuthService + ~10 LoC of validation exist in two places. A bug in auth has to be fixed twice.
  - Mitigation: auth logic is small, well-tested, and rarely changes. The mobile migration has been stable since 2026-04-10. Acceptable cost for solo dev at this scale.
  - Mitigation: if a third consumer appears (desktop app, browser extension, etc.), re-evaluate Option A. Two consumers is the inflection point where a shared package typically starts earning its keep.
- **Drift risk**: mobile and web could diverge on validation rules or error messages over time.
  - Mitigation: design doc's `/web/src/auth/validation.ts` keeps `EMAIL_PATTERN` and `validateFormInput` byte-for-byte equivalent to mobile's. Acceptance tests on both sides guard the contract.

### Quality attribute impact

| Attribute | Impact |
|---|---|
| Maintainability | Slightly negative (duplication) but positive at the build-level (no workspace tooling to maintain) |
| Testability | Positive — AuthService stays React-free; validation and error-mapping are pure |
| Portability | Positive — `/web` can be extracted, rebuilt, rehosted without touching mobile |
| Functional suitability | Same behavior on both apps |

## Related

- Evolution log: `docs/evolution/2026-04-10-auth-password-migration.md` (mobile migration that this ADR catches the web app up to)
- DISCUSS decisions: `docs/feature/web-auth/discuss/wave-decisions.md` (D5, D7, D11)
- DESIGN decisions: `docs/feature/web-auth/design/wave-decisions.md` (DD1, DD7)
- C4 Component diagram: `docs/feature/web-auth/design/application-architecture.md`
- Brief section: `docs/product/architecture/brief.md` → `## Web App (Vite) Application Architecture`
