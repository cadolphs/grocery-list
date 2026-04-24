/**
 * Acceptance Tests — logout-button
 *
 * These tests form the OUTER LOOP of Outside-In TDD for the `logout-button`
 * feature. They render the authenticated app shell via a composition-root
 * harness that mirrors `App.tsx`'s wiring but swaps the production Firebase
 * auth service for `createNullAuthService`, and the production Firestore
 * factories for spy adapter factories where listener-lifecycle assertions
 * are needed.
 *
 * Strategy:
 *   Walking Skeleton: Strategy A (full InMemory doubles).
 *   Rationale: this is a UI wiring feature. `createNullAuthService` already
 *   emits auth-state transitions synchronously to listeners and is the
 *   established test seam (see tests/acceptance/auth-password-migration/*).
 *   No new driven adapters are added by this feature, so there is no real-I/O
 *   integration coverage to add.
 *
 * Driving ports (entered through these seams only):
 *   - AppShell (authenticated shell UI; gains `signOut` prop in this feature)
 *   - LoginScreen (post-logout render target)
 *   - useAuth hook (bridges AuthService to React state)
 *   - useAppInitialization (receives factories so unsubscribe can be asserted)
 *
 * Story trace:
 *   - US-01 is the sole story — see docs/feature/logout-button/discuss/user-stories.md
 *
 * Scenario status (one at a time per outside-in):
 *   - WS-1      : ENABLED (drives the first RED)
 *   - UAT-1     : skipped (enable after WS-1 GREEN)
 *   - UAT-2     : skipped
 *   - UAT-3     : skipped
 *   - UAT-4     : skipped (@pending — no error UI in v1, see feature file)
 *   - UAT-5     : skipped
 */

import React, { useMemo } from 'react';
import { render, fireEvent, waitFor, screen, act } from '@testing-library/react-native';

import {
  createNullAuthService,
  AuthService,
  AuthUser,
} from '../../../src/auth/AuthService';
import { useAuth } from '../../../src/hooks/useAuth';
import {
  useAppInitialization,
  AdapterFactories,
} from '../../../src/hooks/useAppInitialization';
import { AppShell } from '../../../src/ui/AppShell';
import { LoginScreen } from '../../../src/ui/LoginScreen';
import { ServiceProvider } from '../../../src/ui/ServiceProvider';

import { createNullStapleStorage } from '../../../src/adapters/null/null-staple-storage';
import { createNullTripStorage } from '../../../src/adapters/null/null-trip-storage';
import { createNullAreaStorage } from '../../../src/adapters/null/null-area-storage';
import { createNullSectionOrderStorage } from '../../../src/adapters/null/null-section-order-storage';

// =============================================================================
// Test harness — composition root that mirrors App.tsx
// =============================================================================

// AppShell will gain a `signOut` prop in the DELIVER wave (see design/wave-decisions.md §3.2).
// Until the production type is updated, we cast locally so the harness can pass the prop.
const AppShellWithSignOut = AppShell as unknown as React.FC<{
  signOut: () => Promise<void>;
}>;

type HarnessProps = {
  readonly authService: AuthService;
  readonly factories?: AdapterFactories;
};

/**
 * TestAppRoot mirrors App.tsx's composition but accepts an injected
 * AuthService and (optionally) injected AdapterFactories. This is the
 * DRIVING-PORT seam that acceptance tests enter through.
 */
const TestAppRoot: React.FC<HarnessProps> = ({ authService, factories }) => {
  const { user, loading, signIn, signUp, signOut } = useAuth(authService);
  const { isReady, services } = useAppInitialization(
    user ? user : undefined,
    factories,
  );

  if (loading) return null;

  if (!user) {
    return <LoginScreen signIn={signIn} signUp={signUp} />;
  }

  if (!isReady || services === null) return null;

  return (
    <ServiceProvider
      stapleLibrary={services.stapleLibrary}
      tripService={services.tripService}
      areaManagement={services.areaManagement}
      sectionOrderStorage={services.sectionOrderStorage}
    >
      <AppShellWithSignOut signOut={signOut} />
    </ServiceProvider>
  );
};

// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------

const MARIA: AuthUser = {
  uid: 'maria-uid',
  email: 'maria.santos@email.com',
};

/** A null auth service pre-populated so Maria starts signed in. */
function createSignedInAuthService(initialUser: AuthUser = MARIA): AuthService {
  return createNullAuthService(initialUser);
}

/** Factories that track unsubscribe calls by port name. */
function createTrackingFactories(): {
  factories: AdapterFactories;
  unsubscribeCalls: string[];
} {
  const unsubscribeCalls: string[] = [];

  const factories: AdapterFactories = {
    createStapleStorage: (_uid: string) => ({
      ...createNullStapleStorage(),
      initialize: () => Promise.resolve(),
      unsubscribe: () => {
        unsubscribeCalls.push('staples');
      },
    }),
    createAreaStorage: (_uid: string) => ({
      ...createNullAreaStorage(),
      initialize: () => Promise.resolve(),
      unsubscribe: () => {
        unsubscribeCalls.push('areas');
      },
    }),
    createSectionOrderStorage: (_uid: string) => ({
      ...createNullSectionOrderStorage(),
      initialize: () => Promise.resolve(),
      unsubscribe: () => {
        unsubscribeCalls.push('sectionOrder');
      },
    }),
    createTripStorage: (_uid: string) => ({
      ...createNullTripStorage(),
      initialize: () => Promise.resolve(),
      unsubscribe: () => {
        unsubscribeCalls.push('trip');
      },
    }),
    checkMigrationNeeded: () => false,
    migrateToFirestore: () => {},
    createAsyncStapleStorage: () => ({
      ...createNullStapleStorage(),
      initialize: () => Promise.resolve(),
    }),
    createAsyncAreaStorage: () => ({
      ...createNullAreaStorage(),
      initialize: () => Promise.resolve(),
    }),
    createAsyncSectionOrderStorage: () => ({
      ...createNullSectionOrderStorage(),
      initialize: () => Promise.resolve(),
    }),
    createAsyncTripStorage: () => ({
      ...createNullTripStorage(),
      initialize: () => Promise.resolve(),
    }),
    migrateTripIfNeeded: () => {},
  };

  return { factories, unsubscribeCalls };
}

/**
 * Waits for the harness to settle into the authenticated shell. A "Home" tab
 * (from ViewToggle) is the observable signal that AppShell has rendered.
 */
async function waitForAuthenticatedShell(): Promise<void> {
  await waitFor(() => {
    expect(screen.queryByText('Home')).toBeTruthy();
  });
}

// =============================================================================
// WS-1: Walking skeleton — Maria signs out and lands on the login screen
// =============================================================================

describe('WS-1: Maria signs out and returns to the login screen', () => {
  // Trace: US-01 (primary scenario from user-stories.md)
  // Strategy A: InMemory — createNullAuthService drives the auth transition.

  it('takes Maria from the authenticated shell back to the login screen when she taps Sign out', async () => {
    // Given Maria is signed in to the grocery list app
    const authService = createSignedInAuthService();
    const { factories } = createTrackingFactories();

    render(<TestAppRoot authService={authService} factories={factories} />);

    // And Maria is viewing the authenticated app shell
    await waitForAuthenticatedShell();

    // And a labeled "Sign out" control is visible to Maria in the app shell
    const signOutControl = screen.getByText('Sign out');
    expect(signOutControl).toBeTruthy();

    // When Maria taps "Sign out"
    await act(async () => {
      fireEvent.press(signOutControl);
    });

    // Then Maria sees the login screen with empty email and password fields
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Email')).toBeTruthy();
      expect(screen.getByPlaceholderText('Password')).toBeTruthy();
    });
    expect((screen.getByPlaceholderText('Email') as any).props.value ?? '').toBe('');
    expect((screen.getByPlaceholderText('Password') as any).props.value ?? '').toBe('');

    // And no authenticated content remains visible to Maria
    expect(screen.queryByText('Home')).toBeNull();
    expect(screen.queryByText('Store')).toBeNull();
    expect(screen.queryByText('Sign out')).toBeNull();
  });
});

// =============================================================================
// UAT-1: Visibility and accessibility of the Sign Out control
// =============================================================================

describe('UAT-1: Authenticated user sees an accessible Sign Out control', () => {
  // Trace: US-01, AC-1 (visibility), AC-5 (accessible label)
  // Strategy A: InMemory.

  it('presents a control labeled "Sign out" with an accessibility label', async () => {
    // Given Maria is signed in and viewing the authenticated app shell
    const authService = createSignedInAuthService();
    const { factories } = createTrackingFactories();

    render(<TestAppRoot authService={authService} factories={factories} />);

    await waitForAuthenticatedShell();

    // Then Maria sees a control labeled "Sign out" in the app shell
    expect(screen.getByText('Sign out')).toBeTruthy();

    // And the control exposes the accessibility label "Sign out"
    expect(screen.getByLabelText('Sign out')).toBeTruthy();

    // And the control is reachable as an interactive element
    // (An interactive element has an onPress handler — fireEvent.press must not throw.)
    expect(() => fireEvent.press(screen.getByText('Sign out'))).not.toThrow();
  });
});

// =============================================================================
// UAT-2: Tapping Sign Out ends Maria's session
// =============================================================================

describe('UAT-2: Tapping Sign Out ends Maria’s session', () => {
  // Trace: US-01, AC-2 (session ends + LoginScreen surfaced)
  // Strategy A: InMemory — getCurrentUser() is the observable session state
  // on the null auth service.

  it.skip('removes Maria from the signed-in user set and surfaces the login screen', async () => {
    // Given Maria is signed in
    const authService = createSignedInAuthService();
    const { factories } = createTrackingFactories();

    render(<TestAppRoot authService={authService} factories={factories} />);
    await waitForAuthenticatedShell();

    // Sanity check: Maria is currently recognised as signed in
    expect(authService.getCurrentUser()?.email).toBe('maria.santos@email.com');

    // When Maria taps "Sign out"
    await act(async () => {
      fireEvent.press(screen.getByText('Sign out'));
    });

    // Then Maria is no longer recognised as a signed-in user by the app
    await waitFor(() => {
      expect(authService.getCurrentUser()).toBeNull();
    });

    // And the app surfaces the login screen to Maria
    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
  });
});

// =============================================================================
// UAT-3: Signing out releases all per-user data subscriptions (ADR-008)
// =============================================================================

describe('UAT-3: Signing out releases all per-user data subscriptions', () => {
  // Trace: US-01, AC-3 (listener cleanup), ADR-008 (lifecycle invariant)
  // Strategy A: InMemory — spy factories observe unsubscribe calls.

  it.skip('releases each of the four data subscriptions exactly once when Maria signs out', async () => {
    // Given the authenticated shell has opened data subscriptions for
    // staples, areas, section order, and trip
    const authService = createSignedInAuthService();
    const { factories, unsubscribeCalls } = createTrackingFactories();

    render(<TestAppRoot authService={authService} factories={factories} />);
    await waitForAuthenticatedShell();

    // Pre-condition: no unsubscribes have been observed yet
    expect(unsubscribeCalls).toEqual([]);

    // When Maria taps "Sign out"
    await act(async () => {
      fireEvent.press(screen.getByText('Sign out'));
    });

    // Then each of the four data subscriptions is released exactly once
    await waitFor(() => {
      expect(unsubscribeCalls).toHaveLength(4);
    });
    expect(unsubscribeCalls.sort()).toEqual(
      ['areas', 'sectionOrder', 'staples', 'trip'],
    );

    // And no additional unsubscribe fires afterwards (no stale subscription)
    const after = unsubscribeCalls.length;
    await new Promise((r) => setTimeout(r, 50));
    expect(unsubscribeCalls.length).toBe(after);
  });
});

// =============================================================================
// UAT-4: Sign Out fails due to network error — @pending
// =============================================================================

describe('UAT-4: Sign Out fails due to a network error and Maria can retry', () => {
  // Trace: US-01, AC-6 (actionable error surface).
  // @pending — DESIGN wave v1 deliberately scopes out the error-banner UI;
  // the null auth service does not reject signOut. This scenario is captured
  // as living documentation and will be activated when the error-surface
  // component is designed (see docs/feature/logout-button/discuss/user-stories.md,
  // scenario 4).

  it.skip('(PENDING) keeps Maria on the authenticated shell and surfaces a retryable error message', async () => {
    // Intentionally unimplemented — see describe block comment.
    expect(true).toBe(true);
  });
});

// =============================================================================
// UAT-5: Rapid double-tap is coalesced into a single sign-out
// =============================================================================

describe('UAT-5: Rapid double-tap does not produce duplicate sign-out calls', () => {
  // Trace: US-01, AC-7 (dedupe rapid double-press).
  // Strategy A: InMemory — wrap null auth service to count signOut invocations.

  it.skip('invokes the auth service at most once when Maria taps Sign out twice in quick succession', async () => {
    // Given Maria is signed in
    const baseAuth = createSignedInAuthService();
    const signOutCalls: number[] = [];
    const authService: AuthService = {
      ...baseAuth,
      signOut: async () => {
        signOutCalls.push(Date.now());
        return baseAuth.signOut();
      },
    };
    const { factories } = createTrackingFactories();

    render(<TestAppRoot authService={authService} factories={factories} />);
    await waitForAuthenticatedShell();

    // When Maria taps "Sign out" twice within 200 milliseconds
    await act(async () => {
      fireEvent.press(screen.getByText('Sign out'));
      fireEvent.press(screen.getByText('Sign out'));
    });

    // Then the auth service receives the sign-out request at most once
    await waitFor(() => {
      expect(signOutCalls.length).toBeGreaterThanOrEqual(1);
    });
    expect(signOutCalls.length).toBeLessThanOrEqual(1);

    // And Maria reaches the login screen within the normal time
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Email')).toBeTruthy();
    });
  });
});
