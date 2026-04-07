/**
 * Walking Skeleton Acceptance Tests - Email/Password Authentication
 *
 * These tests form the outer loop of Outside-In TDD for the auth migration.
 * They render the LoginScreen and App components with NullAuthService and
 * verify observable user outcomes through screen queries.
 *
 * Strategy: ONE test enabled at a time. Implement until it passes,
 * then enable the next.
 *
 * Driving Ports:
 * - AuthService (via createNullAuthService)
 * - LoginScreen (UI component receiving signIn/signUp props)
 * - useAuth hook (bridges AuthService to React state)
 *
 * Story Trace:
 * - WS-1: Returning user signs in with email and password (US-01)
 * - WS-2: New user signs up with email and password (US-02)
 * - WS-3: Login screen displays password fields, not email-link (US-01 + US-04)
 */

import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { createNullAuthService, AuthService } from '../../../src/auth/AuthService';
import { LoginScreen } from '../../../src/ui/LoginScreen';

// =============================================================================
// Shared test setup
// =============================================================================

function createTestAuthService(options?: { existingUser?: boolean }): AuthService {
  return createNullAuthService(options?.existingUser ? null : null);
}

// Helper: wraps signIn/signUp calls to match the post-migration LoginScreen props
function createSignInProp(authService: AuthService) {
  return (email: string, password: string) => authService.signIn(email, password);
}

function createSignUpProp(authService: AuthService) {
  return (email: string, password: string) => authService.signUp(email, password);
}

// =============================================================================
// WS-1: Returning user signs in with email and password
// =============================================================================

describe('WS-1: Returning user signs in and reaches the grocery list', () => {
  // AC: Successful sign-in with valid credentials navigates to the grocery list screen
  // AC: Login screen displays email field, password field, and "Sign In" button
  // Trace: US-01

  it('signs in Maria with email and password, resulting in successful auth', async () => {
    // Given Maria has an existing account with email "maria.santos@email.com"
    const authService = createTestAuthService();

    // And Maria is on the login screen
    render(
      <LoginScreen
        signIn={createSignInProp(authService)}
        signUp={createSignUpProp(authService)}
      />
    );

    // When Maria enters "maria.santos@email.com" as email and "SecureGrocery42!" as password
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'maria.santos@email.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'SecureGrocery42!');

    // And Maria taps "Sign In"
    fireEvent.press(screen.getByText('Sign In'));

    // Then sign-in succeeds (auth state changes, App would navigate to grocery list)
    // At the acceptance level, we verify the signIn call resolves successfully
    await waitFor(() => {
      const result = authService.getCurrentUser();
      expect(result).not.toBeNull();
      expect(result?.email).toBe('maria.santos@email.com');
    });
  });
});

// =============================================================================
// WS-2: New user signs up with email and password
// =============================================================================

describe('WS-2: New user signs up and reaches the grocery list', () => {
  // AC: Successful sign-up creates a new account and navigates to the grocery list screen
  // Trace: US-02

  it('signs up Ana with email and password, resulting in account creation', async () => {
    // Given no account exists for "ana.kowalski@email.com"
    const authService = createTestAuthService();

    // And Ana is on the login screen in "Sign Up" mode
    render(
      <LoginScreen
        signIn={createSignInProp(authService)}
        signUp={createSignUpProp(authService)}
      />
    );

    // Switch to Sign Up mode
    fireEvent.press(screen.getByText(/Sign Up/i));

    // When Ana enters "ana.kowalski@email.com" as email and "FreshVeggies2024!" as password
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'ana.kowalski@email.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'FreshVeggies2024!');

    // And Ana taps "Sign Up"
    fireEvent.press(screen.getByText('Sign Up'));

    // Then a new account exists for "ana.kowalski@email.com"
    await waitFor(() => {
      const result = authService.getCurrentUser();
      expect(result).not.toBeNull();
      expect(result?.email).toBe('ana.kowalski@email.com');
    });
  });
});

// =============================================================================
// WS-3: Login screen displays email and password fields
// =============================================================================

describe('WS-3: Login screen displays email and password fields', () => {
  // AC: Login screen displays email field, password field, and "Sign In" button
  // AC: LoginScreen contains no "Send Sign-In Link" button
  // Trace: US-01 + US-04

  it.skip('shows email field, password field, and Sign In button', () => {
    // Given a user opens the app without being signed in
    const authService = createTestAuthService();

    // When the login screen appears
    render(
      <LoginScreen
        signIn={createSignInProp(authService)}
        signUp={createSignUpProp(authService)}
      />
    );

    // Then the user sees an email field
    expect(screen.getByPlaceholderText('Email')).toBeTruthy();

    // And the user sees a password field
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();

    // And the user sees a "Sign In" button
    expect(screen.getByText('Sign In')).toBeTruthy();

    // And the user does not see a "Send Sign-In Link" button
    expect(screen.queryByText('Send Sign-In Link')).toBeNull();
  });
});
