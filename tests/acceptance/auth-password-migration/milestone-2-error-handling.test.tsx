/**
 * Milestone 2 Acceptance Tests - Error Handling for Authentication
 *
 * These tests cover error paths for sign-in, sign-up, and input validation.
 * Error scenarios make up the majority of this milestone (8 scenarios),
 * targeting > 40% error coverage across the feature.
 *
 * Strategy: All tests start with it.skip(). Enable one at a time during
 * DELIVER wave.
 *
 * Driving Ports:
 * - AuthService (via createNullAuthService)
 * - LoginScreen (UI component receiving signIn/signUp props)
 *
 * Story Trace:
 * - MS2-1: Wrong password error (US-01)
 * - MS2-2: Non-existent account error (US-01)
 * - MS2-3: Weak password error (US-02)
 * - MS2-4: Email already in use error (US-02)
 * - MS2-5: Empty email validation on sign-in (US-04)
 * - MS2-6: Empty email validation on sign-up (US-04)
 * - MS2-7: Invalid email format validation (US-04)
 * - MS2-8: Sign In button disabled during auth (US-01)
 */

import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { createNullAuthService, AuthService, AuthResult } from '../../../src/auth/AuthService';
import { LoginScreen } from '../../../src/ui/LoginScreen';

// =============================================================================
// Shared test setup
// =============================================================================

function createSignInProp(authService: AuthService) {
  return (email: string, password: string) => authService.signIn(email, password);
}

function createSignUpProp(authService: AuthService) {
  return (email: string, password: string) => authService.signUp(email, password);
}

// Creates a signIn mock that returns a specific error
function createFailingSignIn(errorMessage: string) {
  return jest.fn().mockResolvedValue({
    success: false,
    error: errorMessage,
  });
}

// Creates a signUp mock that returns a specific error
function createFailingSignUp(errorMessage: string) {
  return jest.fn().mockResolvedValue({
    success: false,
    error: errorMessage,
  });
}

function renderLoginScreen(overrides?: {
  signIn?: (email: string, password: string) => Promise<AuthResult>;
  signUp?: (email: string, password: string) => Promise<AuthResult>;
}) {
  const authService = createNullAuthService();
  return render(
    <LoginScreen
      signIn={overrides?.signIn ?? createSignInProp(authService)}
      signUp={overrides?.signUp ?? createSignUpProp(authService)}
    />
  );
}

// =============================================================================
// MS2-1: Wrong password shows actionable error
// =============================================================================

describe('MS2-1: Wrong password shows actionable error', () => {
  // AC: Wrong password displays "Incorrect password. Please try again."
  // AC: User remains on login screen
  // Trace: US-01

  it('displays wrong password error and stays on login screen', async () => {
    // Given Carlos has an existing account
    // And Carlos is on the login screen in "Sign In" mode
    renderLoginScreen({
      signIn: createFailingSignIn('Incorrect password. Please try again.'),
    });

    // When Carlos enters his email and wrong password
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'carlos.rivera@email.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'WrongPassword99');

    // And Carlos taps "Sign In"
    fireEvent.press(screen.getByText('Sign In'));

    // Then Carlos sees "Incorrect password. Please try again."
    await waitFor(() => {
      expect(screen.getByText('Incorrect password. Please try again.')).toBeTruthy();
    });

    // And Carlos remains on the login screen
    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
  });
});

// =============================================================================
// MS2-2: Non-existent account suggests signing up
// =============================================================================

describe('MS2-2: Non-existent account suggests signing up', () => {
  // AC: Non-existent account displays "No account found with this email. Try signing up instead."
  // Trace: US-01

  it('displays non-existent account error with sign-up suggestion', async () => {
    // Given no account exists for "new.person@email.com"
    renderLoginScreen({
      signIn: createFailingSignIn('No account found with this email. Try signing up instead.'),
    });

    // When the user enters email and password and taps "Sign In"
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'new.person@email.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'SomePassword1!');
    fireEvent.press(screen.getByText('Sign In'));

    // Then the user sees the suggestion to sign up
    await waitFor(() => {
      expect(screen.getByText('No account found with this email. Try signing up instead.')).toBeTruthy();
    });
  });
});

// =============================================================================
// MS2-3: Password shorter than 8 characters is rejected
// =============================================================================

describe('MS2-3: Password shorter than 8 characters is rejected', () => {
  // AC: Password shorter than 8 characters displays "Password must be at least 8 characters."
  // Trace: US-02

  it('displays minimum password length error', async () => {
    // Given Tomoko is on the login screen in "Sign Up" mode
    renderLoginScreen();
    fireEvent.press(screen.getByText(/Don't have an account\? Sign Up/i));

    // When Tomoko enters a short password
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'tomoko.hayashi@email.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'short');

    // And Tomoko taps "Sign Up"
    fireEvent.press(screen.getByText('Sign Up'));

    // Then Tomoko sees the minimum length error
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters.')).toBeTruthy();
    });

    // And Tomoko remains on the login screen
    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
  });
});

// =============================================================================
// MS2-4: Existing email address is rejected on sign-up
// =============================================================================

describe('MS2-4: Existing email address is rejected on sign-up', () => {
  // AC: Email already in use displays "An account with this email already exists. Try signing in instead."
  // Trace: US-02

  it.skip('displays existing account error with sign-in suggestion', async () => {
    // Given Maria Santos already has an account
    // And a user is on the login screen in "Sign Up" mode
    renderLoginScreen({
      signUp: createFailingSignUp('An account with this email already exists. Try signing in instead.'),
    });
    fireEvent.press(screen.getByText(/Don't have an account\? Sign Up/i));

    // When the user tries to sign up with Maria's email
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'maria.santos@email.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'AnotherPassword1!');
    fireEvent.press(screen.getByText('Sign Up'));

    // Then the user sees the existing account error
    await waitFor(() => {
      expect(screen.getByText('An account with this email already exists. Try signing in instead.')).toBeTruthy();
    });
  });
});

// =============================================================================
// MS2-5: Empty email shows validation error on sign-in
// =============================================================================

describe('MS2-5: Empty email shows validation error on sign-in', () => {
  // AC: Empty email field shows "Please enter your email address" on submit
  // Trace: US-04

  it.skip('shows empty email error without calling auth service', async () => {
    // Given the user is on the login screen in "Sign In" mode
    const signIn = jest.fn();
    renderLoginScreen({ signIn });

    // And the email field is empty
    // When the user taps "Sign In"
    fireEvent.press(screen.getByText('Sign In'));

    // Then the user sees "Please enter your email address"
    await waitFor(() => {
      expect(screen.getByText('Please enter your email address')).toBeTruthy();
    });

    // And the auth service was not called
    expect(signIn).not.toHaveBeenCalled();
  });
});

// =============================================================================
// MS2-6: Empty email shows validation error on sign-up
// =============================================================================

describe('MS2-6: Empty email shows validation error on sign-up', () => {
  // AC: Empty email field shows "Please enter your email address" on submit
  // Trace: US-04

  it.skip('shows empty email error in sign-up mode', async () => {
    // Given the user is on the login screen in "Sign Up" mode
    const signUp = jest.fn();
    renderLoginScreen({ signUp });
    fireEvent.press(screen.getByText(/Don't have an account\? Sign Up/i));

    // And the email field is empty
    // When the user taps "Sign Up"
    fireEvent.press(screen.getByText('Sign Up'));

    // Then the user sees "Please enter your email address"
    await waitFor(() => {
      expect(screen.getByText('Please enter your email address')).toBeTruthy();
    });

    // And the auth service was not called
    expect(signUp).not.toHaveBeenCalled();
  });
});

// =============================================================================
// MS2-7: Invalid email format shows validation error
// =============================================================================

describe('MS2-7: Invalid email format shows validation error', () => {
  // AC: Invalid email format shows "Please enter a valid email address."
  // Trace: US-04

  it.skip('shows email format error for invalid email', async () => {
    // Given the user is on the login screen
    const signIn = jest.fn();
    renderLoginScreen({ signIn });

    // When the user enters an invalid email format
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'not-an-email');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'ValidPassword1!');
    fireEvent.press(screen.getByText('Sign In'));

    // Then the user sees "Please enter a valid email address."
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address.')).toBeTruthy();
    });

    // And the auth service was not called
    expect(signIn).not.toHaveBeenCalled();
  });
});

// =============================================================================
// MS2-8: Sign In button disabled during authentication
// =============================================================================

describe('MS2-8: Sign In button disabled while authentication is in progress', () => {
  // AC: Sign In button disabled while authentication is in progress
  // Trace: US-01

  it.skip('disables Sign In button during auth request', async () => {
    // Given the user is on the login screen in "Sign In" mode
    let resolveSignIn: (value: AuthResult) => void;
    const pendingSignIn = jest.fn().mockImplementation(
      () => new Promise<AuthResult>((resolve) => { resolveSignIn = resolve; })
    );
    renderLoginScreen({ signIn: pendingSignIn });

    // When the user submits valid credentials
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'maria@email.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'SecureGrocery42!');
    fireEvent.press(screen.getByText('Sign In'));

    // Then the "Sign In" button is disabled while authentication is in progress
    await waitFor(() => {
      // Button shows loading text, indicating it's in progress / disabled
      expect(screen.getByText(/Signing/i)).toBeTruthy();
    });

    // Complete the auth
    resolveSignIn!({ success: true, user: { uid: 'user-1', email: 'maria@email.com' } });

    await waitFor(() => {
      expect(screen.queryByText(/Signing/i)).toBeNull();
    });
  });
});
