import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { getFirebaseAuth } from '../adapters/firestore/firebase-config';

export interface AuthUser {
  uid: string;
  email: string | null;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

export interface AuthService {
  signUp(email: string, password: string): Promise<AuthResult>;
  signIn(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  getCurrentUser(): AuthUser | null;
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void;
}

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
  };
}

const successResult = (user: AuthUser): AuthResult => ({ success: true, user });

const failureResult = (error: string): AuthResult => ({ success: false, error });

const attemptAuth = async (
  action: () => Promise<{ user: User }>
): Promise<AuthResult> => {
  try {
    const credential = await action();
    return successResult(toAuthUser(credential.user));
  } catch (error: any) {
    return failureResult(error.message);
  }
};

export function createAuthService(): AuthService {
  const auth = getFirebaseAuth();

  return {
    async signUp(email: string, password: string): Promise<AuthResult> {
      return attemptAuth(() => createUserWithEmailAndPassword(auth, email, password));
    },

    async signIn(email: string, password: string): Promise<AuthResult> {
      return attemptAuth(() => signInWithEmailAndPassword(auth, email, password));
    },

    async signOut(): Promise<void> {
      await firebaseSignOut(auth);
    },

    getCurrentUser(): AuthUser | null {
      const user = auth.currentUser;
      return user ? toAuthUser(user) : null;
    },

    onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
      return onAuthStateChanged(auth, (user) => {
        callback(user ? toAuthUser(user) : null);
      });
    },
  };
}

// Null implementation for testing
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateEmail = (email: string): string | null =>
  !EMAIL_PATTERN.test(email) ? 'Invalid email format' : null;

const validatePasswordLength = (password: string): string | null =>
  password.length < 8 ? 'Password must be at least 8 characters' : null;

export function createNullAuthService(initialUser: AuthUser | null = null): AuthService {
  let currentUser: AuthUser | null = initialUser;
  const listeners: Set<(user: AuthUser | null) => void> = new Set();

  const notifyListeners = () => {
    listeners.forEach((callback) => callback(currentUser));
  };

  const authenticateAs = (email: string): AuthResult => {
    currentUser = { uid: `user-${Date.now()}`, email };
    notifyListeners();
    return successResult(currentUser);
  };

  return {
    async signUp(email: string, password: string): Promise<AuthResult> {
      const passwordError = validatePasswordLength(password);
      if (passwordError) return failureResult(passwordError);

      const emailError = validateEmail(email);
      if (emailError) return failureResult(emailError);

      return authenticateAs(email);
    },

    async signIn(email: string, password: string): Promise<AuthResult> {
      const emailError = validateEmail(email);
      if (emailError) return failureResult(emailError);

      const passwordError = validatePasswordLength(password);
      if (passwordError) return failureResult('Invalid password');

      return authenticateAs(email);
    },

    async signOut(): Promise<void> {
      currentUser = null;
      notifyListeners();
    },

    getCurrentUser(): AuthUser | null {
      return currentUser;
    },

    onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
      listeners.add(callback);
      // Immediately call with current state
      callback(currentUser);
      return () => {
        listeners.delete(callback);
      };
    },
  };
}
