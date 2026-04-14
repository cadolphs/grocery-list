/**
 * Walking-skeleton acceptance tests for App (US-01, US-02, US-07).
 * @in-memory @walking_skeleton
 *
 * Strategy B — no live Firebase. We mock `./auth/AuthService`'s createAuthService
 * to return a hand-rolled fake that simulates auth-state transitions.
 * DELIVER US-01 will rewrite the existing App.test.tsx (which currently mocks
 * the stale ./hooks/useAuth path). That test may co-exist with this file during
 * DISTILL and is deleted as part of US-01.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { AuthService, AuthUser } from './auth/AuthService';

// Internal fake; configured per-test via resetFakeAuth.
type FakeAuth = {
  service: AuthService;
  emit: (user: AuthUser | null) => void;
};

let fake: FakeAuth;

const resetFakeAuth = (initial: AuthUser | null = null) => {
  let listener: ((user: AuthUser | null) => void) | null = null;
  const service: AuthService = {
    signIn: vi.fn(async (_email: string, _password: string) => {
      const user: AuthUser = { uid: 'u1', email: _email };
      listener?.(user);
      return { success: true, user };
    }),
    signUp: vi.fn(async (_email: string, _password: string) => {
      const user: AuthUser = { uid: 'u1', email: _email };
      listener?.(user);
      return { success: true, user };
    }),
    signOut: vi.fn(async () => {
      listener?.(null);
    }),
    getCurrentUser: () => initial,
    onAuthStateChanged: (cb) => {
      listener = cb;
      queueMicrotask(() => listener?.(initial));
      return () => {
        listener = null;
      };
    },
  };
  fake = { service, emit: (u) => listener?.(u) };
  return fake;
};

vi.mock('./auth/AuthService', async (orig) => {
  const actual = await orig<typeof import('./auth/AuthService')>();
  return {
    ...actual,
    createAuthService: () => fake.service,
  };
});

vi.mock('./firebase-config', () => ({
  getFirebaseAuth: vi.fn(() => ({})),
  getFirebaseDb: vi.fn(() => ({})),
}));

vi.mock('./hooks/useStaples', () => ({
  useStaples: vi.fn(() => ({ staples: [], loading: false })),
}));

// Dynamic import AFTER vi.mock is set up.
const importApp = async () => {
  const mod = await import('./App');
  return mod.App;
};

describe('[@walking_skeleton @in-memory] App', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('1. signed-out user sees LoginScreen, not dashboard', async () => {
    resetFakeAuth(null);
    const App = await importApp();
    render(<App />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.queryByText(/welcome/i)).not.toBeInTheDocument();
  });

  it('2. successful sign-in reveals dashboard', async () => {
    resetFakeAuth(null);
    const App = await importApp();
    render(<App />);
    await act(async () => {
      await Promise.resolve();
    });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), 'clemens@example.com');
    await user.type(screen.getByLabelText(/password/i), 'correct-horse-battery');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/welcome/i)).toBeInTheDocument();
  });

  it('3. restored session bypasses the form', async () => {
    resetFakeAuth({ uid: 'u1', email: 'clemens@example.com' });
    const App = await importApp();
    render(<App />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(await screen.findByText(/welcome/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
  });

  it('4. Sign Out returns to the sign-in form', async () => {
    resetFakeAuth({ uid: 'u1', email: 'clemens@example.com' });
    const App = await importApp();
    render(<App />);
    await act(async () => {
      await Promise.resolve();
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /sign out/i }));
    expect(await screen.findByLabelText(/email/i)).toBeInTheDocument();
    expect(fake.service.signOut).toHaveBeenCalled();
  });

  it('5. auth-resolving state shows loading indicator', async () => {
    // Special setup: fake that never fires the initial callback.
    const service: AuthService = {
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getCurrentUser: () => null,
      onAuthStateChanged: () => () => {},
    };
    fake = { service, emit: () => {} };
    const App = await importApp();
    render(<App />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
  });
});
