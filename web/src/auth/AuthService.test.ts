/**
 * Acceptance tests for the AuthService factory (US-01).
 * @in-memory: uses createNullAuthService; no live Firebase.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createAuthService,
  createNullAuthService,
  type AuthService,
  type AuthUser,
} from './AuthService';

const expectedSurface = ['signIn', 'signUp', 'signOut', 'getCurrentUser', 'onAuthStateChanged'];

// We don't want this suite to spin up real Firebase. Mock the firebase-config
// module so createAuthService() can be constructed in jsdom without network.
vi.mock('../firebase-config', () => ({
  getFirebaseAuth: vi.fn(() => ({})),
  getFirebaseDb: vi.fn(() => ({})),
}));

const assertHasPortSurface = (service: AuthService) => {
  for (const fn of expectedSurface) {
    expect(typeof (service as unknown as Record<string, unknown>)[fn]).toBe('function');
  }
};

describe('[@in-memory @us-01] createAuthService', () => {
  it('6. factory exposes the expected port', () => {
    const service = createAuthService();
    assertHasPortSurface(service);
  });
});

describe('[@in-memory @us-01] createNullAuthService', () => {
  it('10. mirrors the real factory shape', () => {
    const service = createNullAuthService();
    assertHasPortSurface(service);
  });

  it('7. sign-in returns a user on success', async () => {
    const knownUser: AuthUser = { uid: 'u1', email: 'clemens@example.com' };
    const service = createNullAuthService({
      signInResult: { success: true, user: knownUser },
    });
    const result = await service.signIn('clemens@example.com', 'correct-horse-battery');
    expect(result).toEqual({ success: true, user: knownUser });
  });

  it('8. sign-in returns a non-empty error on failure', async () => {
    const service = createNullAuthService({
      signInResult: { success: false, error: 'Invalid credentials' },
    });
    const result = await service.signIn('x@y.z', 'wrong');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('9. onAuthStateChanged returns an unsubscribe function', () => {
    const service = createNullAuthService();
    const unsubscribe = service.onAuthStateChanged(() => {});
    expect(typeof unsubscribe).toBe('function');
  });
});
