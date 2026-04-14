/**
 * Acceptance tests for the error-mapping pure module (US-05).
 * WS strategy C: real pure-function invocation.
 */

import { describe, it, expect } from 'vitest';
import { mapAuthError } from './error-mapping';

describe('[@real-io @us-05] mapAuthError', () => {
  it('E1 returns invalid-credentials copy on wrong-password', () => {
    const msg = mapAuthError(new Error('Firebase: Error (auth/wrong-password)'), 'signIn');
    expect(msg).toMatch(/invalid|incorrect/i);
  });

  it('E2 hints at Sign Up for user-not-found in sign-in mode', () => {
    const msg = mapAuthError(new Error('Firebase: Error (auth/user-not-found)'), 'signIn');
    expect(msg.toLowerCase()).toContain('sign up');
  });

  it('E3 hints at Sign In on email-already-in-use in sign-up mode', () => {
    const msg = mapAuthError(new Error('Firebase: Error (auth/email-already-in-use)'), 'signUp');
    expect(msg.toLowerCase()).toContain('already');
    expect(msg.toLowerCase()).toContain('sign in');
  });

  it('E4 returns a generic fallback for unknown errors (no raw firebase code)', () => {
    const msg = mapAuthError(new Error('something weird'), 'signIn');
    expect(msg.length).toBeGreaterThan(0);
    expect(msg.toLowerCase()).not.toContain('firebase: error');
  });

  it('E5 handles non-Error values safely', () => {
    const a = mapAuthError('plain string', 'signIn');
    const b = mapAuthError(undefined, 'signUp');
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBeGreaterThan(0);
  });
});
