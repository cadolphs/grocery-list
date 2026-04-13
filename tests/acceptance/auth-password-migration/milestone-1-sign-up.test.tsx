/**
 * Milestone 1 Acceptance Tests - Sign Up and Mode Toggle
 *
 * These tests cover sign-up happy path, mode toggle between Sign In and
 * Sign Up, and loading states during authentication.
 *
 * Strategy: All tests start with it.skip(). Enable one at a time during
 * DELIVER wave after walking skeleton passes.
 *
 * Driving Ports:
 * - AuthService (via createNullAuthService)
 * - LoginScreen (UI component receiving signIn/signUp props)
 *
 * Story Trace:
 * - MS1-1: New user creates account (US-02)
 * - MS1-2: Switch from Sign In to Sign Up (US-03)
 * - MS1-3: Switch from Sign Up to Sign In (US-03)
 * - MS1-4: Email persists across mode switch (US-03)
 * - MS1-5: Error clears on mode switch (US-03)
 * - MS1-6: Loading indicator during sign-up (US-02)
 */

import { render, fireEvent, waitFor, screen, act } from '@testing-library/react-native';
import { createNullAuthService, AuthService, AuthResult } from '../../../src/auth/AuthService';
import { LoginScreen } from '../../../src/ui/LoginScreen';

// =============================================================================
// Shared test setup
// =============================================================================

function createTestAuthService(): AuthService {
  return createNullAuthService();
}

function createSignInProp(authService: AuthService) {
  return (email: string, password: string) => authService.signIn(email, password);
}

function createSignUpProp(authService: AuthService) {
  return (email: string, password: string) => authService.signUp(email, password);
}

function renderLoginScreen(authService?: AuthService) {
  const service = authService ?? createTestAuthService();
  return render(
    <LoginScreen
      signIn={createSignInProp(service)}
      signUp={createSignUpProp(service)}
    />
  );
}

// =============================================================================
// MS1-1: New user creates account successfully
// =============================================================================

describe('MS1-1: New user creates account successfully', () => {
  // AC: Successful sign-up creates account and navigates to grocery list
  // Trace: US-02

  it('creates account for Ana and authenticates her', async () => {
    // Given Ana is on the login screen in "Sign Up" mode
    const authService = createTestAuthService();
    render(
      <LoginScreen
        signIn={createSignInProp(authService)}
        signUp={createSignUpProp(authService)}
      />
    );
    fireEvent.press(screen.getByText(/Sign Up/i));

    // When Ana enters "ana.kowalski@email.com" as email and "FreshVeggies2024!" as password
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'ana.kowalski@email.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'FreshVeggies2024!');

    // And Ana taps "Sign Up"
    fireEvent.press(screen.getByText('Sign Up'));

    // Then Ana is taken to the grocery list screen (verified via auth state)
    await waitFor(() => {
      expect(authService.getCurrentUser()?.email).toBe('ana.kowalski@email.com');
    });
  });
});

// =============================================================================
// MS1-2: User switches from Sign In to Sign Up mode
// =============================================================================

describe('MS1-2: User switches from Sign In to Sign Up mode', () => {
  // AC: Toggle link visible below the form in both modes
  // AC: Switching mode changes button label
  // Trace: US-03

  it('changes submit button to "Sign Up" after tapping toggle', () => {
    // Given the user is on the login screen in "Sign In" mode
    renderLoginScreen();
    expect(screen.getByText('Sign In')).toBeTruthy();

    // When the user taps "Don't have an account? Sign Up"
    fireEvent.press(screen.getByText(/Don't have an account\? Sign Up/i));

    // Then the submit button reads "Sign Up"
    expect(screen.getByText('Sign Up')).toBeTruthy();
  });
});

// =============================================================================
// MS1-3: User switches from Sign Up to Sign In mode
// =============================================================================

describe('MS1-3: User switches from Sign Up to Sign In mode', () => {
  // AC: Toggle link visible in Sign Up mode
  // Trace: US-03

  it('changes submit button to "Sign In" after tapping toggle', () => {
    // Given the user is on the login screen in "Sign Up" mode
    renderLoginScreen();
    fireEvent.press(screen.getByText(/Don't have an account\? Sign Up/i));
    expect(screen.getByText('Sign Up')).toBeTruthy();

    // When the user taps "Already have an account? Sign In"
    fireEvent.press(screen.getByText(/Already have an account\? Sign In/i));

    // Then the submit button reads "Sign In"
    expect(screen.getByText('Sign In')).toBeTruthy();
  });
});

// =============================================================================
// MS1-4: Email field value persists across mode switches
// =============================================================================

describe('MS1-4: Email field value persists when switching modes', () => {
  // AC: Email field value persists across mode switches
  // Trace: US-03

  it('retains email value after switching from Sign In to Sign Up', () => {
    // Given the user is on the login screen in "Sign In" mode
    renderLoginScreen();

    // And the user has entered "carlos@email.com" as email
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'carlos@email.com');

    // When the user taps "Don't have an account? Sign Up"
    fireEvent.press(screen.getByText(/Don't have an account\? Sign Up/i));

    // Then the email field still contains "carlos@email.com"
    expect(screen.getByPlaceholderText('Email').props.value).toBe('carlos@email.com');
  });
});

// =============================================================================
// MS1-5: Error message clears when switching modes
// =============================================================================

describe('MS1-5: Error message clears when switching modes', () => {
  // AC: Switching mode clears any displayed error
  // Trace: US-03

  it('clears error message after mode toggle', async () => {
    // Given the user sees an error on the login screen
    const authService = createNullAuthService();
    const failingSignIn = jest.fn().mockResolvedValue({
      success: false,
      error: 'Incorrect password. Please try again.',
    });
    render(
      <LoginScreen
        signIn={failingSignIn}
        signUp={createSignUpProp(authService)}
      />
    );

    // Trigger the error
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'carlos@email.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'WrongPass1!');
    fireEvent.press(screen.getByText('Sign In'));

    await waitFor(() => {
      expect(screen.getByText('Incorrect password. Please try again.')).toBeTruthy();
    });

    // When the user taps "Don't have an account? Sign Up"
    fireEvent.press(screen.getByText(/Don't have an account\? Sign Up/i));

    // Then no error message is displayed
    expect(screen.queryByText('Incorrect password. Please try again.')).toBeNull();
  });
});

// =============================================================================
// MS1-6: Loading indicator during sign-up
// =============================================================================

describe('MS1-6: Loading indicator shown during sign-up', () => {
  // AC: Loading indicator shown while account creation is in progress
  // AC: Sign Up button disabled while authentication is in progress
  // Trace: US-02

  it('shows loading state and disables button during sign-up', async () => {
    // Given Ana is on the login screen in "Sign Up" mode
    let resolveSignUp: (value: AuthResult) => void;
    const pendingSignUp = jest.fn().mockImplementation(
      () => new Promise<AuthResult>((resolve) => { resolveSignUp = resolve; })
    );
    const authService = createNullAuthService();
    render(
      <LoginScreen
        signIn={createSignInProp(authService)}
        signUp={pendingSignUp}
      />
    );
    fireEvent.press(screen.getByText(/Don't have an account\? Sign Up/i));

    // When Ana enters valid credentials and taps "Sign Up"
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'ana@email.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'FreshVeggies2024!');
    fireEvent.press(screen.getByText('Sign Up'));

    // Then Ana sees a loading indicator while account creation is in progress
    await waitFor(() => {
      expect(screen.getByText(/Signing/i)).toBeTruthy();
    });

    // Complete the sign-up
    await act(async () => {
      resolveSignUp!({ success: true, user: { uid: 'user-1', email: 'ana@email.com' } });
    });

    expect(screen.queryByText(/Signing/i)).toBeNull();
  });
});
