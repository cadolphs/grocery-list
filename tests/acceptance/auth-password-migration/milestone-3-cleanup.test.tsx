/**
 * Milestone 3 Acceptance Tests - Remove Email-Link Auth Flow
 *
 * These tests verify the cleanup of email-link authentication code.
 * They check that the LoginScreen, useAuth hook, and App component
 * no longer contain email-link references.
 *
 * Strategy: All tests start with it.skip(). Enable one at a time during
 * DELIVER wave after milestones 1 and 2 pass.
 *
 * Driving Ports:
 * - LoginScreen (UI component)
 * - useAuth hook (returns methods to consumer)
 *
 * Story Trace:
 * - MS3-1: No email-link UI on login screen (US-04)
 * - MS3-2: useAuth exposes password auth methods (US-04)
 * - MS3-3: App does not handle auth deep links (US-04)
 */

import { render, screen } from '@testing-library/react-native';
import { renderHook } from '@testing-library/react-native';
import { createNullAuthService } from '../../../src/auth/AuthService';
import { LoginScreen } from '../../../src/ui/LoginScreen';
import { useAuth } from '../../../src/hooks/useAuth';

// =============================================================================
// MS3-1: No email-link UI elements on login screen
// =============================================================================

describe('MS3-1: No email-link UI elements on login screen', () => {
  // AC: LoginScreen contains no "Send Sign-In Link" button or email-link success message
  // Trace: US-04

  it('does not show any email-link UI elements', () => {
    // Given a user opens the login screen
    const authService = createNullAuthService();
    render(
      <LoginScreen
        signIn={(email: string, password: string) => authService.signIn(email, password)}
        signUp={(email: string, password: string) => authService.signUp(email, password)}
      />
    );

    // Then the user does not see a "Send Sign-In Link" button
    expect(screen.queryByText('Send Sign-In Link')).toBeNull();

    // And the user does not see mention of "sign-in link" or "magic link"
    expect(screen.queryByText(/sign-in link/i)).toBeNull();
    expect(screen.queryByText(/magic link/i)).toBeNull();

    // And the user does not see "Check your email" success state
    expect(screen.queryByText(/check your email/i)).toBeNull();
  });
});

// =============================================================================
// MS3-2: useAuth hook exposes password auth methods
// =============================================================================

describe('MS3-2: useAuth hook exposes password auth methods', () => {
  // AC: useAuth hook exposes signIn, signUp, signOut
  // AC: useAuth hook does not expose sendSignInLink or handleSignInLink
  // Trace: US-04

  it('exposes signIn, signUp, signOut but not email-link methods', () => {
    // Given the useAuth hook is initialized with an auth service
    const authService = createNullAuthService();
    const { result } = renderHook(() => useAuth(authService));

    // Then the hook exposes signIn and signUp methods
    expect(result.current).toHaveProperty('signIn');
    expect(result.current).toHaveProperty('signUp');
    expect(result.current).toHaveProperty('signOut');
    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.signUp).toBe('function');

    // And the hook does not expose sendSignInLink or handleSignInLink methods
    expect(result.current).not.toHaveProperty('sendSignInLink');
    expect(result.current).not.toHaveProperty('handleSignInLink');
  });
});

// =============================================================================
// MS3-3: App does not handle auth deep links
// =============================================================================

describe('MS3-3: App does not handle auth deep links', () => {
  // AC: App.tsx contains no useDeepLinkHandler hook for auth deep links
  // Note: This is a structural test. It verifies by importing App and checking
  // that Linking.addEventListener is not called for auth purposes.
  // The implementation will be verified during code review and by the absence
  // of deep link handling code.
  // Trace: US-04

  it.skip('app does not register deep link handlers for auth', async () => {
    // This test verifies the structural cleanup of App.tsx.
    // After cleanup, App should not import Linking for auth purposes
    // and should not call useDeepLinkHandler.
    //
    // Implementation approach during DELIVER:
    // - Mock Linking and verify addEventListener is NOT called
    // - Or verify the App renders without deep link handling code
    //
    // Given the app is running with no authenticated user
    // When the app receives a deep link URL
    // Then no email-link authentication is attempted

    // Placeholder: the software-crafter will implement this as part of
    // the App.tsx cleanup, verifying Linking is not used for auth.
    expect(true).toBe(true);
  });
});
