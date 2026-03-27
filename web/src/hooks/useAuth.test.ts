import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock firebase/auth
const mockOnAuthStateChanged = vi.fn();
const mockSendSignInLinkToEmail = vi.fn();
const mockIsSignInWithEmailLink = vi.fn();
const mockSignInWithEmailLink = vi.fn();

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
  sendSignInLinkToEmail: (...args: unknown[]) => mockSendSignInLinkToEmail(...args),
  isSignInWithEmailLink: (...args: unknown[]) => mockIsSignInWithEmailLink(...args),
  signInWithEmailLink: (...args: unknown[]) => mockSignInWithEmailLink(...args),
}));

vi.mock('../firebase-config', () => ({
  getFirebaseAuth: vi.fn(() => ({ currentUser: null })),
}));

import { useAuth } from './useAuth';

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChanged.mockImplementation(() => vi.fn()); // return unsubscribe
  });

  it('starts in loading state', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('resolves to null when no user is signed in', async () => {
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: (user: null) => void) => {
      callback(null);
      return vi.fn();
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.user).toBeNull();
  });

  it('resolves to user when signed in', async () => {
    const firebaseUser = { uid: 'user-123', email: 'test@example.com' };
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: (user: typeof firebaseUser) => void) => {
      callback(firebaseUser);
      return vi.fn();
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.user).toEqual({ uid: 'user-123', email: 'test@example.com' });
  });

  it('provides sendSignInLink function', () => {
    const { result } = renderHook(() => useAuth());

    expect(typeof result.current.sendSignInLink).toBe('function');
  });

  it('provides handleSignInLink function', () => {
    const { result } = renderHook(() => useAuth());

    expect(typeof result.current.handleSignInLink).toBe('function');
  });
});
