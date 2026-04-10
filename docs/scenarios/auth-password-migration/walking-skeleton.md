# Walking Skeleton: auth-password-migration

## Skeleton Definition

The walking skeleton traces the thinnest end-to-end slice: a returning user signs in with email and password and is authenticated.

### Why This Skeleton

The email-link auth flow is broken due to Firebase Dynamic Links deprecation. The skeleton proves the replacement works: a user can enter credentials, tap Sign In, and be authenticated. This is the minimum viable proof that the migration delivers user value.

## Implementation Sequence

### Step 1: WS-1 -- Returning user signs in (FIRST -- enabled)

**File**: `tests/acceptance/auth-password-migration/walking-skeleton.test.tsx`

This is the first test to enable. It exercises:
- LoginScreen accepts `signIn` and `signUp` props (new props contract)
- Password TextInput exists on the screen
- Calling `signIn(email, password)` through the UI updates auth state

**What must change to make it pass**:
1. LoginScreen must accept `signIn(email, password)` and `signUp(email, password)` props
2. LoginScreen must render a password TextInput
3. LoginScreen must call `signIn` when user taps "Sign In"

### Step 2: WS-2 -- New user signs up

Same LoginScreen, exercising the Sign Up code path:
- Mode toggle to "Sign Up" mode
- Calling `signUp(email, password)` through the UI

### Step 3: WS-3 -- Login screen shows password fields, not email-link

Confirms the old UI is gone:
- No "Send Sign-In Link" button
- Password field exists
- "Sign In" button exists

## Driving Ports

All walking skeleton tests invoke through:
- **LoginScreen** component (UI driving port) -- rendered with props
- **AuthService** (domain driving port) -- via `createNullAuthService()`

No internal components are tested directly.

## Handoff Notes for Software Crafter

1. Enable WS-1 first (it is already not skipped)
2. Modify `LoginScreen` to accept new props and render password field
3. Run test -- it should pass once LoginScreen renders correctly
4. Enable WS-2, implement mode toggle
5. Enable WS-3, verify cleanup
6. Then proceed to Milestone 1 tests one at a time
