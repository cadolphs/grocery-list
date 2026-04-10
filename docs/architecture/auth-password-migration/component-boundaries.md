# Component Boundaries: auth-password-migration

## Overview

This migration touches 4 existing components and removes 2 dead artifacts. No new components are created. The ports-and-adapters boundary is preserved: AuthService (port+adapter) stays behind the interface, useAuth (hook) mediates, LoginScreen (UI) consumes.

## Components That Change

### 1. `src/auth/AuthService.ts` -- Port Interface + Firebase Adapter

**Boundary**: Defines the auth contract (port) and implements it against Firebase (adapter).

**Changes**:
- Remove `sendSignInLink(email: string): Promise<AuthResult>` from `AuthService` interface
- Remove `handleSignInLink(url: string): Promise<AuthResult>` from `AuthService` interface
- Remove `sendSignInLink` and `handleSignInLink` implementations from `createAuthService()`
- Remove `sendSignInLink` and `handleSignInLink` implementations from `createNullAuthService()`
- Remove `EMAIL_LINK_STORAGE_KEY` constant
- Remove `ACTION_CODE_SETTINGS` constant
- Remove unused imports: `sendSignInLinkToEmail`, `isSignInWithEmailLink`, `signInWithEmailLink`, `AsyncStorage`

**What stays unchanged**:
- `AuthUser` interface
- `AuthResult` interface
- `signUp()`, `signIn()`, `signOut()`, `getCurrentUser()`, `onAuthStateChanged()` -- all unchanged
- `createAuthService()` factory function signature
- `createNullAuthService()` factory function signature and behavior for signUp/signIn/signOut

**Post-migration interface**:
```
AuthService {
  signUp(email, password) -> AuthResult
  signIn(email, password) -> AuthResult
  signOut() -> void
  getCurrentUser() -> AuthUser | null
  onAuthStateChanged(callback) -> unsubscribe
}
```

### 2. `src/hooks/useAuth.ts` -- Hook (Driving Adapter)

**Boundary**: Bridges React state management with the AuthService port.

**Changes**:
- Remove `sendSignInLink` from returned object and callback
- Remove `handleSignInLink` from returned object and callback
- Add `signIn` callback wrapping `authService.signIn(email, password)`
- Add `signUp` callback wrapping `authService.signUp(email, password)`

**Post-migration return type**:
```
UseAuthResult {
  user: AuthUser | null
  loading: boolean
  signIn(email, password) -> AuthResult
  signUp(email, password) -> AuthResult
  signOut() -> void
}
```

### 3. `src/ui/LoginScreen.tsx` -- UI Component

**Boundary**: Presentation layer. Receives auth functions as props, renders form, handles local UI state (mode toggle, validation, error display).

**Changes**:
- Replace `sendSignInLink` prop with `signIn` and `signUp` props
- Add password TextInput field (masked)
- Add mode state: 'signIn' | 'signUp'
- Add mode toggle link below form
- Replace "Send Sign-In Link" button with "Sign In" / "Sign Up" button (label follows mode)
- Remove "success" screen state (no "Check your email" message)
- Add client-side validation: empty email, invalid email format, password < 8 chars (sign-up mode)
- Update error display for password-auth error messages
- Loading state remains (reuse existing 'sending' concept as 'submitting')

**Props contract (post-migration)**:
```
LoginScreenProps {
  signIn(email, password) -> AuthResult
  signUp(email, password) -> AuthResult
}
```

### 4. `App.tsx` -- Root Component

**Boundary**: Composition root. Wires services, manages auth gating.

**Changes**:
- Remove `useDeepLinkHandler` hook definition and invocation
- Remove `Linking` import
- Destructure `signIn`, `signUp` from `useAuth` instead of `sendSignInLink`, `handleSignInLink`
- Pass `signIn` and `signUp` to `LoginScreen` instead of `sendSignInLink`

## Components Removed

### 5. `useDeepLinkHandler` (in `App.tsx`)

Local hook function that handles deep links for email-link auth. Removed entirely -- no other deep link consumers exist.

### 6. `src/components/LoginScreen.tsx` + `src/components/LoginScreen.test.tsx`

Older prototype LoginScreen that takes `AuthService` directly. Not used by `App.tsx`. Dead code. Remove both files.

## Components Unchanged

- `src/ui/LoadingScreen.tsx` -- no auth logic
- `src/ui/AppShell.tsx` -- downstream of auth, no changes
- `src/ui/ServiceProvider.tsx` -- no auth logic
- `src/hooks/useAppInitialization.ts` -- receives user, not involved in auth flow
- `src/adapters/firestore/firebase-config.ts` -- no auth logic
- All domain modules (`src/domain/*`) -- no auth coupling
- All storage ports and adapters -- no auth coupling

## Dependency Flow (Post-Migration)

```
App.tsx
  |-- creates AuthService via createAuthService()
  |-- passes AuthService to useAuth hook
  |-- receives { user, loading, signIn, signUp, signOut } from useAuth
  |-- passes { signIn, signUp } to LoginScreen (when !user)
  |-- passes user to useAppInitialization (when user)

LoginScreen
  |-- receives signIn, signUp as props
  |-- manages local state: mode, email, password, error, loading
  |-- validates input locally (empty email, format, password length)
  |-- calls signIn or signUp based on mode
  |-- displays AuthResult.error on failure

useAuth hook
  |-- wraps AuthService methods in useCallback
  |-- manages user/loading state via onAuthStateChanged
  |-- exposes signIn, signUp, signOut

AuthService (interface/port)
  |-- signUp, signIn, signOut, getCurrentUser, onAuthStateChanged

createAuthService (Firebase adapter)
  |-- implements AuthService against Firebase Auth SDK

createNullAuthService (test adapter)
  |-- implements AuthService with in-memory state for testing
```
