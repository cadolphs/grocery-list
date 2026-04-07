# Wave Decisions: auth-password-migration (DISTILL)

## Test Framework

**Decision**: Jest with @testing-library/react-native, matching existing project patterns.

**Rationale**: The project already uses Jest via jest-expo preset. All existing acceptance tests follow this pattern. No reason to introduce a separate framework.

## Test Double Strategy

**Decision**: Use `createNullAuthService()` for happy paths. Use `jest.fn().mockResolvedValue()` for specific error scenarios.

**Rationale**: The NullAuthService already implements signIn/signUp with validation (password >= 8, email format). For error scenarios that require specific error messages (e.g., "Incorrect password"), we mock the signIn/signUp props directly since NullAuthService does not simulate "wrong password" or "account not found" -- it accepts any valid-looking credentials.

## Driving Port Selection

**Decision**: Tests render LoginScreen directly with signIn/signUp props.

**Rationale**: LoginScreen is the UI driving port for authentication. It receives signIn/signUp as props from useAuth via App.tsx. Testing through LoginScreen exercises the full UI contract (input fields, validation, error display, loading states) without needing to render the entire App tree. The useAuth hook is tested separately in MS3-2 for its return type contract.

## Scenario Organization

**Decision**: 4 files organized by milestone, not by story.

**Rationale**: The milestones map to the implementation sequence: walking skeleton first, then sign-up/toggle, then errors, then cleanup. This matches the one-at-a-time TDD flow. The software crafter works through files in order.

## Skip Strategy

**Decision**: Only WS-1 is enabled (no skip). All other tests use `it.skip()`.

**Rationale**: One test at a time. The software crafter enables the next test only after the current one passes and is committed. This maintains the tight TDD feedback loop.

## Error Message Ownership

**Decision**: Error messages in tests match the acceptance criteria exactly. The LoginScreen is responsible for displaying error messages from AuthResult.error as-is, or producing client-side validation messages.

**Rationale**: DESIGN wave decision D5 places error message mapping in the hook or screen, not in the AuthService adapter. Tests verify the exact user-facing strings from the acceptance criteria.

## Client-Side Validation

**Decision**: LoginScreen validates empty email, invalid email format, and password < 8 chars before calling the auth service.

**Rationale**: DESIGN wave decision D4 specifies client-side validation before network calls. Tests in MS2-5, MS2-6, MS2-7 verify the auth service mock was NOT called when validation fails.

## Implementation Sequence for Software Crafter

1. WS-1: Modify LoginScreen props, add password field, wire signIn
2. WS-2: Add mode toggle, wire signUp
3. WS-3: Verify old UI elements removed
4. MS1-1 through MS1-6: Sign up happy path and mode toggle details
5. MS2-1 through MS2-8: Error handling and validation
6. MS3-1 through MS3-3: Cleanup of email-link code in useAuth and App.tsx
