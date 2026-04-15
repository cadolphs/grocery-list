# Shared Artifacts Registry — web-auth

| Artifact | Location / Identifier | Single source | Consumers |
|---|---|---|---|
| Firebase Auth session | browser `localStorage` under Firebase key (SDK default `local` persistence) | `signInWithEmailAndPassword` / `createUserWithEmailAndPassword` on success | Firebase Auth SDK (restores across reloads), `onAuthStateChanged` listener in web `useAuth` / `AuthService` |
| `AuthUser` object | in-memory React state in `useAuth` hook | `onAuthStateChanged` callback mapping `firebase.User` → `{ uid, email }` | `App.tsx` (conditional render), `useStaples(db, uid)` |
| `AuthService` / `useAuth` interface | `/web/src/auth/` (NEW) | written in this feature; mirrors `src/auth/AuthService.ts` (mobile) | `App.tsx`, `LoginScreen.tsx` (NEW in web) |
| Validation rules | `validateFormInput` pure function (to be ported from `src/ui/LoginScreen.tsx`) | mobile's existing rules (email regex + password min 8 on sign-up) | web `LoginScreen` |
| Firebase Auth authorized domains | Firebase console → Authentication → Settings → Authorized domains | manually configured in Firebase console (one-time setup) | Firebase Auth SDK (rejects sign-in from unlisted domains) |
| Prod URL | `https://grocery-list-cad.web.app` | established by feature `web-prod-deploy` | Firebase Auth authorized domains list must include it |
| Email/password provider enabled | Firebase console → Authentication → Sign-in methods | manually enabled (one-time) | Firebase Auth SDK |

**Single-writer check**: each artifact has exactly one producer. No conflicts.

**Stale artifacts to remove** (not truly "shared", but worth tracking for cleanup):
- `/web/src/hooks/useAuth.ts` (current) — uses `sendSignInLinkToEmail` / `signInWithEmailLink` (deprecated Dynamic Links flow). Replace entirely; do not migrate.
