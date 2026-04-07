# Shared Artifacts Registry: auth-password-migration

## Artifacts

### email (user input)

- **Source of truth**: TextInput value in LoginScreen component state
- **Consumers**: AuthService.signIn(), AuthService.signUp(), error messages, email field display
- **Owner**: LoginScreen
- **Integration risk**: LOW -- single source, consumed locally before passing to service
- **Validation**: Email value passed to AuthService matches what user typed

### password (user input)

- **Source of truth**: TextInput value in LoginScreen component state (masked)
- **Consumers**: AuthService.signIn(), AuthService.signUp()
- **Owner**: LoginScreen
- **Integration risk**: LOW -- single source, consumed locally
- **Validation**: Password value passed to AuthService matches what user typed

### screen_mode (Sign In / Sign Up)

- **Source of truth**: LoginScreen component state (toggle)
- **Consumers**: Submit button label, toggle link text, which AuthService method is called, screen heading
- **Owner**: LoginScreen
- **Integration risk**: MEDIUM -- mode must be consistent across UI text and service call selection
- **Validation**: When mode is "Sign In", button says "Sign In" and signIn() is called. When mode is "Sign Up", button says "Sign Up" and signUp() is called.

### auth_result (AuthResult)

- **Source of truth**: Return value of AuthService.signIn() or AuthService.signUp()
- **Consumers**: LoginScreen error display, useAuth hook user state, App.tsx auth gate
- **Owner**: AuthService (via useAuth hook)
- **Integration risk**: HIGH -- drives both error display and navigation. Mismatch means user sees error but app navigates, or vice versa.
- **Validation**: On success (result.success === true), useAuth.user is set and App.tsx renders AppShell. On failure, LoginScreen displays result.error.

### user (AuthUser | null)

- **Source of truth**: useAuth hook state, driven by AuthService.onAuthStateChanged
- **Consumers**: App.tsx auth gate (render LoginScreen vs AppShell), ServiceProvider initialization
- **Owner**: useAuth hook
- **Integration risk**: HIGH -- null/non-null drives entire app routing
- **Validation**: When user is null, App.tsx renders LoginScreen. When user is non-null, App.tsx renders AppShell.

## Removed Artifacts (Cleanup)

### EMAIL_LINK_STORAGE_KEY

- **Was**: AsyncStorage key storing email for email-link sign-in completion
- **Status**: No longer needed -- remove AsyncStorage usage for auth email persistence
- **Risk**: If not removed, stale data in AsyncStorage (cosmetic, not functional)

### deep link URL (for auth)

- **Was**: URL received via Linking.getInitialURL / Linking.addEventListener, passed to handleSignInLink
- **Status**: No longer consumed for auth purposes
- **Note**: Deep linking may still be needed for other features -- DESIGN wave should assess whether useDeepLinkHandler is removed entirely or scoped to non-auth links
