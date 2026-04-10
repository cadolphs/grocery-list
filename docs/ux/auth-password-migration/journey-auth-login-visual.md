# Journey: Auth Password Migration

## Overview

Migrate login UI from email-link (magic link) to email/password authentication.
External trigger: Firebase Dynamic Links deprecation breaks `sendSignInLinkToEmail()` flow.

## Emotional Arc: Problem Relief

Start: Anxious (will my login break?) | Middle: Focused (familiar email+password form) | End: Relieved (signed in, app works)

## Journey Flow

```
[Trigger]              [Step 1]              [Step 2]              [Goal]
User opens app    ->   See login screen  ->  Enter credentials ->  Signed in, see grocery list
Not authenticated      Email + password       Submit form           App loads normally
Feels: uncertain       Feels: familiar        Feels: focused        Feels: relieved
```

## Step-by-Step Detail

### Step 1: Login Screen (Returning User)

```
+-- Login Screen (Sign In) ----------------------------------+
|                                                             |
|  +-----------------------------------------------+         |
|  | Email                                          |         |
|  +-----------------------------------------------+         |
|                                                             |
|  +-----------------------------------------------+         |
|  | Password                                       |         |
|  +-----------------------------------------------+         |
|                                                             |
|  +-----------------------------------------------+         |
|  |              Sign In                           |         |
|  +-----------------------------------------------+         |
|                                                             |
|  Don't have an account? Sign Up                             |
|                                                             |
+-------------------------------------------------------------+
```

Emotional state: Familiar, confident -- standard email/password pattern.

### Step 2: Login Screen (New User)

```
+-- Login Screen (Sign Up) ----------------------------------+
|                                                             |
|  +-----------------------------------------------+         |
|  | Email                                          |         |
|  +-----------------------------------------------+         |
|                                                             |
|  +-----------------------------------------------+         |
|  | Password                                       |         |
|  +-----------------------------------------------+         |
|                                                             |
|  +-----------------------------------------------+         |
|  |              Sign Up                           |         |
|  +-----------------------------------------------+         |
|                                                             |
|  Already have an account? Sign In                           |
|                                                             |
+-------------------------------------------------------------+
```

Emotional state: Slightly cautious (creating account), but form is simple.

### Step 3: Error States

```
+-- Login Screen (Error) ------------------------------------+
|                                                             |
|  +-----------------------------------------------+         |
|  | maria.santos@email.com                         |         |
|  +-----------------------------------------------+         |
|                                                             |
|  +-----------------------------------------------+         |
|  | ********                                       |         |
|  +-----------------------------------------------+         |
|                                                             |
|  [!] Incorrect password. Please try again.                  |
|                                                             |
|  +-----------------------------------------------+         |
|  |              Sign In                           |         |
|  +-----------------------------------------------+         |
|                                                             |
+-------------------------------------------------------------+
```

Emotional state: Frustrated but guided -- clear error message tells them what went wrong.

### Step 4: Loading / Transition

```
+-- Loading --------------------------------------------------+
|                                                              |
|                    Signing in...                             |
|                    [spinner]                                 |
|                                                              |
+--------------------------------------------------------------+
```

Emotional state: Brief anticipation, transitions to relief when app loads.

## Cleanup: Removed Elements

The following elements are removed as part of this migration:

1. **Email link UI**: "Send Sign-In Link" button and success message ("Check your email!")
2. **Deep link handler**: `useDeepLinkHandler` in App.tsx no longer needed for auth
3. **Email link service methods**: `sendSignInLink()` and `handleSignInLink()` in useAuth hook exposure
4. **AsyncStorage email storage**: `EMAIL_LINK_STORAGE_KEY` usage for persisting email between app/browser

## Integration Points

- `AuthService.signIn(email, password)` -- already implemented, not exposed in UI
- `AuthService.signUp(email, password)` -- already implemented, not exposed in UI
- `useAuth` hook -- needs `signIn` and `signUp` exposed instead of `sendSignInLink`/`handleSignInLink`
- `App.tsx` -- passes new auth methods to LoginScreen, removes deep link handler
- `LoginScreen.tsx` -- complete rewrite from email-link to email/password form
