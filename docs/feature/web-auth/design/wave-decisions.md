# DESIGN Decisions — web-auth

Interaction mode: **propose**. Scope: application / components (web Vite app only). Paradigm: functional (factory + hooks, no classes — locked by project `CLAUDE.md`).

## Decisions

| ID | Decision | Rationale | Rejected alternatives |
|---|---|---|---|
| DD1 | Auth state exposure via **factory + thin hook** (Option C). `createAuthService()` returned from `/web/src/auth/AuthService.ts`. A tiny `/web/src/auth/useAuthState.ts` subscribes to `AuthService.onAuthStateChanged` and returns `{ user, loading }` React state. | Mobile parity (mirrors `src/auth/AuthService.ts` verbatim per D5). AuthService stays pure TS + Firebase SDK — no React import — which keeps it unit-testable without RTL. The hook is a one-screen-deep wrapper; no context needed at this scale. | **Option A (bare `useAuth()`)**: each caller creates its own listener; wasteful and inconsistent with mobile. **Option B (React context provider)**: unjustified indirection for a 2-node component tree (`App` → `AuthenticatedApp`). Promotable to context later without breaking callers. |
| DD2 | Validation is a **separate pure module** `/web/src/auth/validation.ts` exporting `validateFormInput(email, password, mode)` and `EMAIL_PATTERN`. | Pure function, no React/Firebase deps → mutation-testing-friendly, trivially unit-testable, reusable from `LoginScreen`. Matches mobile's inline logic in shape but hoisted for testability. | Inline in `LoginScreen`: couples pure logic to RTL-dependent tests; harder to mutation-test. |
| DD3 | Firebase error mapping is a **separate pure module** `/web/src/auth/error-mapping.ts` exporting `mapAuthError(error: unknown, mode: AuthMode): string`. Returns the user-facing copy required by US-05 (invalid credentials | try signing up | email already in use). | Mode-aware hints (US-05 asks for "hint at toggling to Sign Up / Sign In") require more than passing `error.message` through. Web evolves beyond mobile's "display as-is" — an explicit pure mapper isolates that logic from UI and makes it mutation-testable. | Inline mapping in `LoginScreen`: tangles UI with string tables; harder to enforce actionable copy. |
| DD4 | Component directory is `/web/src/auth/` (sibling to `hooks/`, `components/`). | Mirrors mobile `src/auth/` layout exactly. Signals "this is infrastructure-port-like code", not a generic hook. | `/web/src/hooks/useAuth.ts` (current location): implies "just a hook"; obscures the AuthService port underneath. |
| DD5 | AuthService factory is **instantiated once at module scope** inside `App.tsx` (`const authService = createAuthService();`) and passed as prop to `<LoginScreen>` + consumed by `useAuthState(authService)`. | Single Firebase auth listener per tab (Firebase SDK itself is a singleton so this is cosmetic, but keeps the test seam explicit). Props over context at this tree depth. | Module-level `export const authService = ...`: awkward for testing (can't swap for `createNullAuthService()` without module mocks). Context provider: over-engineered (see DD1). |
| DD6 | Delete `/web/src/hooks/useAuth.ts` entirely; replace with `/web/src/auth/useAuthState.ts`. | Per DISCUSS D7. New path signals new pattern (factory-backed, not monolithic hook). | Rename-in-place: keeps stale imports working silently, risks leftover email-link references. |
| DD7 | `/web/src/auth/` is an **independent port mirror**, not a monorepo workspace. No shared package between `/src` (RN) and `/web`. | Locked by DISCUSS D5. `/web` has its own `package.json`, React 18 vs RN's React 19, Vite vs Metro. A shared package would force lockstep upgrades and drag RN-specific types into web. The ~80-line AuthService copy is cheaper than a workspace. See `adr-003-web-email-password-auth.md`. | Yarn/npm workspaces with `@grocery-list/auth-core`: over-engineering for a single consumer; forces React-version alignment. |
| DD8 | Architecture enforcement: **dependency-cruiser** rule forbidding `/web/src/components/**` and `/web/src/hooks/**` from importing `firebase/auth` directly. Only `/web/src/auth/**` may import `firebase/auth`. | Prevents the stale-useAuth pattern from recurring (UI code reaching into Firebase SDK directly). Same tool family already recommended for RN side. Annotation for software-crafter. | ArchUnitTS: heavier, unused in this repo; dependency-cruiser already matches project direction. No enforcement: architecture rule erodes on first shortcut. |
| DD9 | C4 Component diagram is scoped to **`/web/src/` only** and added to `docs/product/architecture/brief.md` as a new `## Web App (Vite) Application Architecture` section. No changes to the existing RN C4. | Web is a separate container. Merging both into one L2 diagram would mix abstraction levels and misrepresent deployment (separate bundles). | Single combined diagram: confusing; containers have no runtime relationship other than sharing the Firebase project. |

## Component map (new / modified / deleted)

| Path | Action | Responsibility | Story |
|---|---|---|---|
| `/web/src/auth/AuthService.ts` | NEW | Factory `createAuthService()` returning `{ signIn, signUp, signOut, getCurrentUser, onAuthStateChanged }`. Wraps Firebase email/password. Mirrors mobile `src/auth/AuthService.ts`. Also exports `createNullAuthService()` for tests. | US-01 |
| `/web/src/auth/validation.ts` | NEW | Pure `validateFormInput(email, password, mode)`; exports `EMAIL_PATTERN`. | US-04 |
| `/web/src/auth/error-mapping.ts` | NEW | Pure `mapAuthError(error, mode)` → user-facing copy. | US-05 |
| `/web/src/auth/useAuthState.ts` | NEW | React hook: `useAuthState(authService)` → `{ user, loading }`. Subscribes on mount, unsubscribes on unmount. | US-01 |
| `/web/src/components/LoginScreen.tsx` | NEW | React DOM form. Props: `{ signIn, signUp }`. State machine `{ initial | submitting | error }` × mode `{ signIn | signUp }`. Semantic HTML (`<form>`, `<input type="email">`, `<input type="password">`, `<button>`). | US-02, US-03, US-06 |
| `/web/src/App.tsx` | MODIFY | Create `authService` once; call `useAuthState(authService)`; render `<LoginScreen>` when no user; render `<AuthenticatedApp>` (with Sign Out button) when user. | US-02, US-07 |
| `/web/src/hooks/useAuth.ts` | DELETE | Stale email-link flow. | US-01 |

## Quality attributes

| Attribute | Strategy |
|---|---|
| Functional suitability | US-01..US-07 AC directly trace to component boundaries above |
| Security | Firebase SDK handles token storage; no passwords in app state beyond form lifetime; client validation non-authoritative (Firebase is source of truth) |
| Maintainability | Factory + ports mirror mobile; new web devs (future) recognize the shape instantly |
| Testability | AuthService testable without React; validation + error-mapping pure; LoginScreen testable via RTL with `createNullAuthService()` |
| Usability | Single-screen mode toggle, actionable error copy, loading state (US-06) |
| Reliability | Firebase SDK handles reconnection; session persists in localStorage by SDK default |

## Architecture enforcement annotation (for software-crafter)

Style: Hexagonal-lite (the web app is small; this is really "isolate Firebase behind a port").
Language: TypeScript (Vite + React 18).
Tool: **dependency-cruiser**.

Rules to enforce:
- `/web/src/components/**` MUST NOT import `firebase/auth` (only via `/web/src/auth/`).
- `/web/src/hooks/**` MUST NOT import `firebase/auth` (only via `/web/src/auth/`).
- `/web/src/auth/validation.ts` MUST NOT import React or `firebase/**` (pure).
- `/web/src/auth/error-mapping.ts` MUST NOT import React or `firebase/**` (pure).

## External integrations

| Service | Consumed | Contract-test recommendation |
|---|---|---|
| Firebase Authentication (email/password) | `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `signOut`, `onAuthStateChanged` | Low risk — standard, versioned SDK. No custom contract tests warranted beyond US-01..US-07 acceptance tests. Same assessment as RN side. |

No new external surface introduced by this feature.

## Handoff

- **To DISTILL (acceptance-designer)**: component boundaries above are the testable seams. `createNullAuthService()` is the primary test double for LoginScreen-level scenarios; `jest.fn()` stubs for specific error branches.
- **To DELIVER (nw-functional-software-crafter)**: small scope (~3 h). Follow story order US-01 → US-02 → US-03 → US-04 → US-05 → US-06 → US-07. No new dependencies — Firebase Auth SDK already in `/web/package.json`.
- **To DEVOPS (platform-architect)**: no infra change. KPIs are one-shot manual checks (see `outcome-kpis.md`). One-time Firebase console action (D12): enable Email/Password provider.
