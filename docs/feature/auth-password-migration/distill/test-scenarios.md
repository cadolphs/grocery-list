# Test Scenarios: auth-password-migration

## Summary

- Total scenarios: 20
- Walking skeletons: 3
- Focused scenarios: 17
- Error/edge scenarios: 11 (55% of total -- exceeds 40% target)

## Scenario Index

### Walking Skeleton (3 scenarios)

| ID | Scenario | Story | Type |
|----|----------|-------|------|
| WS-1 | Returning user signs in and reaches the grocery list | US-01 | Happy path |
| WS-2 | New user signs up and reaches the grocery list | US-02 | Happy path |
| WS-3 | Login screen displays email and password fields | US-01 + US-04 | Happy path |

### Milestone 1: Sign Up and Mode Toggle (6 scenarios)

| ID | Scenario | Story | Type |
|----|----------|-------|------|
| MS1-1 | New user creates account successfully | US-02 | Happy path |
| MS1-2 | Switch from Sign In to Sign Up mode | US-03 | Happy path |
| MS1-3 | Switch from Sign Up to Sign In mode | US-03 | Happy path |
| MS1-4 | Email field value persists across mode switches | US-03 | Edge case |
| MS1-5 | Error message clears when switching modes | US-03 | Edge case |
| MS1-6 | Loading indicator during sign-up | US-02 | Happy path |

### Milestone 2: Error Handling (8 scenarios)

| ID | Scenario | Story | Type |
|----|----------|-------|------|
| MS2-1 | Wrong password shows actionable error | US-01 | Error path |
| MS2-2 | Non-existent account suggests signing up | US-01 | Error path |
| MS2-3 | Password shorter than 8 characters rejected | US-02 | Error path |
| MS2-4 | Existing email rejected on sign-up | US-02 | Error path |
| MS2-5 | Empty email validation on sign-in | US-04 | Error path |
| MS2-6 | Empty email validation on sign-up | US-04 | Error path |
| MS2-7 | Invalid email format validation | US-04 | Error path |
| MS2-8 | Sign In button disabled during auth | US-01 | Edge case |

### Milestone 3: Cleanup (3 scenarios)

| ID | Scenario | Story | Type |
|----|----------|-------|------|
| MS3-1 | No email-link UI on login screen | US-04 | Cleanup |
| MS3-2 | useAuth exposes password auth methods | US-04 | Cleanup |
| MS3-3 | App does not handle auth deep links | US-04 | Cleanup |

## Story Coverage

| Story | Scenarios | Status |
|-------|-----------|--------|
| US-01: Sign In | WS-1, WS-3, MS2-1, MS2-2, MS2-5, MS2-8 | 6 scenarios |
| US-02: Sign Up | WS-2, MS1-1, MS1-6, MS2-3, MS2-4, MS2-6 | 6 scenarios |
| US-03: Mode Toggle | MS1-2, MS1-3, MS1-4, MS1-5 | 4 scenarios |
| US-04: Cleanup | WS-3, MS2-5, MS2-6, MS2-7, MS3-1, MS3-2, MS3-3 | 7 scenarios |

## Error Path Analysis

Error/edge scenarios: WS (0) + MS1 (2 edge) + MS2 (7 error + 1 edge) + MS3 (0) = 10 error + 1 edge = 11 total
Error ratio: 11 / 20 = 55% (exceeds 40% target)
