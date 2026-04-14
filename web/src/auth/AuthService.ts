import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { getFirebaseAuth } from '../firebase-config';

export type AuthUser = {
  uid: string;
  email: string | null;
};

export type AuthResult = {
  success: boolean;
  user?: AuthUser;
  error?: string;
};

export type Unsubscribe = () => void;

export interface AuthService {
  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  getCurrentUser(): AuthUser | null;
  onAuthStateChanged(callback: (user: AuthUser | null) => void): Unsubscribe;
}

const toAuthUser = (user: User): AuthUser => ({
  uid: user.uid,
  email: user.email,
});

const successResult = (user: AuthUser): AuthResult => ({ success: true, user });
const failureResult = (error: string): AuthResult => ({ success: false, error });

const attemptAuth = async (
  action: () => Promise<{ user: User }>
): Promise<AuthResult> => {
  try {
    const credential = await action();
    return successResult(toAuthUser(credential.user));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return failureResult(message);
  }
};

export const createAuthService = (): AuthService => {
  const auth = getFirebaseAuth();

  return {
    signIn: (email, password) =>
      attemptAuth(() => signInWithEmailAndPassword(auth, email, password)),

    signUp: (email, password) =>
      attemptAuth(() => createUserWithEmailAndPassword(auth, email, password)),

    signOut: async () => {
      await firebaseSignOut(auth);
    },

    getCurrentUser: () => {
      const user = auth.currentUser;
      return user ? toAuthUser(user) : null;
    },

    onAuthStateChanged: (callback) =>
      onAuthStateChanged(auth, (user) => {
        callback(user ? toAuthUser(user) : null);
      }),
  };
};

// Null implementation for testing.
export type NullAuthServiceOptions = {
  initialUser?: AuthUser | null;
  signInResult?: AuthResult;
  signUpResult?: AuthResult;
  throwOnNextCall?: boolean;
};

export const createNullAuthService = (
  options: NullAuthServiceOptions = {}
): AuthService => {
  let currentUser: AuthUser | null = options.initialUser ?? null;
  let shouldThrow = options.throwOnNextCall ?? false;
  const listeners = new Set<(user: AuthUser | null) => void>();

  const notify = () => {
    listeners.forEach((cb) => cb(currentUser));
  };

  const maybeThrow = (method: string) => {
    if (shouldThrow) {
      shouldThrow = false;
      throw new Error(`AuthService.${method} threw (configured)`);
    }
  };

  const applyResult = (result: AuthResult): AuthResult => {
    if (result.success && result.user) {
      currentUser = result.user;
      notify();
    }
    return result;
  };

  return {
    signIn: async (email, _password) => {
      maybeThrow('signIn');
      if (options.signInResult) return applyResult(options.signInResult);
      const user: AuthUser = { uid: `user-${Date.now()}`, email };
      currentUser = user;
      notify();
      return successResult(user);
    },

    signUp: async (email, _password) => {
      maybeThrow('signUp');
      if (options.signUpResult) return applyResult(options.signUpResult);
      const user: AuthUser = { uid: `user-${Date.now()}`, email };
      currentUser = user;
      notify();
      return successResult(user);
    },

    signOut: async () => {
      maybeThrow('signOut');
      currentUser = null;
      notify();
    },

    getCurrentUser: () => currentUser,

    onAuthStateChanged: (callback) => {
      listeners.add(callback);
      queueMicrotask(() => callback(currentUser));
      return () => {
        listeners.delete(callback);
      };
    },
  };
};
