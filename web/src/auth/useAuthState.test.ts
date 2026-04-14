/**
 * Acceptance tests for the useAuthState hook (US-01).
 * @in-memory: drives the hook with a hand-rolled fake AuthService.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthState } from './useAuthState';
import type { AuthService, AuthUser } from './AuthService';

type FakeService = AuthService & {
  emit: (user: AuthUser | null) => void;
  unsubscribeCalls: number;
};

const makeFakeService = (initial: AuthUser | null = null): FakeService => {
  let listener: ((user: AuthUser | null) => void) | null = null;
  const service = {
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getCurrentUser: () => initial,
    onAuthStateChanged: (cb: (user: AuthUser | null) => void) => {
      listener = cb;
      queueMicrotask(() => listener?.(initial));
      service.unsubscribeCalls = 0;
      return () => {
        service.unsubscribeCalls += 1;
        listener = null;
      };
    },
    emit: (user: AuthUser | null) => listener?.(user),
    unsubscribeCalls: 0,
  } as unknown as FakeService;
  return service;
};

describe('[@in-memory @us-01] useAuthState', () => {
  it('11. initial render is loading with no user', () => {
    const service = makeFakeService(null);
    const { result } = renderHook(() => useAuthState(service));
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('12. reflects the first auth callback', async () => {
    const user: AuthUser = { uid: 'u1', email: 'clemens@example.com' };
    const service = makeFakeService(user);
    const { result } = renderHook(() => useAuthState(service));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.user).toEqual(user);
  });

  it('13. unsubscribes on unmount', async () => {
    const service = makeFakeService(null);
    const { unmount } = renderHook(() => useAuthState(service));
    await act(async () => {
      await Promise.resolve();
    });
    unmount();
    expect(service.unsubscribeCalls).toBeGreaterThanOrEqual(1);
  });

  it('14. re-renders on auth-state changes', async () => {
    const service = makeFakeService(null);
    const { result } = renderHook(() => useAuthState(service));
    await act(async () => {
      await Promise.resolve();
    });

    const user: AuthUser = { uid: 'u1', email: 'clemens@example.com' };
    await act(async () => {
      service.emit(user);
    });
    expect(result.current.user).toEqual(user);

    await act(async () => {
      service.emit(null);
    });
    expect(result.current.user).toBeNull();
  });
});
