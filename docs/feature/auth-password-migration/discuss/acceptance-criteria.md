# Acceptance Criteria: auth-password-migration

## US-01: Sign In with Email and Password

- [ ] Login screen displays email field, password field (masked), and "Sign In" button
- [ ] Successful sign-in with valid credentials navigates to the grocery list screen
- [ ] Wrong password displays "Incorrect password. Please try again." and remains on login screen
- [ ] Non-existent account displays "No account found with this email. Try signing up instead."
- [ ] Loading indicator shown while authentication is in progress
- [ ] Sign In button disabled while authentication is in progress

## US-02: Sign Up with Email and Password

- [ ] Sign Up mode displays email field, password field, and "Sign Up" button
- [ ] Successful sign-up creates a new account and navigates to the grocery list screen
- [ ] Password shorter than 8 characters displays "Password must be at least 8 characters."
- [ ] Email already in use displays "An account with this email already exists. Try signing in instead."
- [ ] Loading indicator shown while account creation is in progress

## US-03: Toggle Between Sign In and Sign Up

- [ ] "Don't have an account? Sign Up" link visible below form in Sign In mode
- [ ] "Already have an account? Sign In" link visible below form in Sign Up mode
- [ ] Tapping toggle switches button label and form behavior (signIn vs signUp call)
- [ ] Error messages clear when switching modes
- [ ] Email field value persists across mode switches

## US-04: Remove Email-Link Auth Flow

- [ ] LoginScreen contains no "Send Sign-In Link" button or email-link success message
- [ ] App.tsx contains no useDeepLinkHandler hook for auth deep links
- [ ] useAuth hook exposes signIn, signUp, signOut (not sendSignInLink, handleSignInLink)
- [ ] No active code path reads/writes EMAIL_LINK_STORAGE_KEY to AsyncStorage
- [ ] Empty email field shows "Please enter your email address" on submit
- [ ] Invalid email format shows "Please enter a valid email address." on submit
