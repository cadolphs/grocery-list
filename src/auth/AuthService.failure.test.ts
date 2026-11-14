// createAuthService failure messages
// attemptAuth turns a rejected Firebase call into a failure result. Firebase
// rejects with Error subclasses, but a non-Error rejection must still produce
// a message string instead of undefined.

import { signInWithEmailAndPassword } from 'firebase/auth';
import { createAuthService } from './AuthService';

jest.mock('../adapters/firestore/firebase-config', () => ({
  getFirebaseAuth: jest.fn(() => ({})),
}));

const signIn = jest.mocked(signInWithEmailAndPassword);

describe('createAuthService - failed sign in', () => {
  afterEach(() => {
    signIn.mockReset();
  });

  it('returns the message of an Error rejection', async () => {
    signIn.mockRejectedValueOnce(new Error('auth/wrong-password'));

    const result = await createAuthService().signIn('a@example.com', 'x');

    expect(result).toEqual({ success: false, error: 'auth/wrong-password' });
  });

  it('turns a rejection that is not an Error into a message', async () => {
    signIn.mockRejectedValueOnce('network down');

    const result = await createAuthService().signIn('a@example.com', 'x');

    expect(result).toEqual({ success: false, error: 'network down' });
  });
});
