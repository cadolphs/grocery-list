import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  User,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseAuth } from '../adapters/firestore/firebase-config';

const EMAIL_LINK_STORAGE_KEY = 'emailForSignIn';

const ACTION_CODE_SETTINGS = {
  url: 'https://grocery-list-cad.firebaseapp.com',
  handleCodeInApp: true,
};

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
  sendSignInLink(email: string): Promise<AuthResult>;
  handleSignInLink(url: string): Promise<AuthResult>;
}

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
  };
}

export function createAuthService(): AuthService {
  const auth = getFirebaseAuth();

  return {
    async signUp(email: string, password: string): Promise<AuthResult> {
      try {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        return { success: true, user: toAuthUser(credential.user) };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },

    async signIn(email: string, password: string): Promise<AuthResult> {
      try {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: toAuthUser(credential.user) };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
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

    async sendSignInLink(email: string): Promise<AuthResult> {
      try {
        await sendSignInLinkToEmail(auth, email, ACTION_CODE_SETTINGS);
        await AsyncStorage.setItem(EMAIL_LINK_STORAGE_KEY, email);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },

    async handleSignInLink(url: string): Promise<AuthResult> {
      try {
        if (!isSignInWithEmailLink(auth, url)) {
          return { success: false, error: 'Invalid sign-in link' };
        }
        const email = await AsyncStorage.getItem(EMAIL_LINK_STORAGE_KEY);
        if (!email) {
          return { success: false, error: 'Email not found. Please enter your email to complete sign-in.' };
        }
        const credential = await signInWithEmailLink(auth, email, url);
        await AsyncStorage.removeItem(EMAIL_LINK_STORAGE_KEY);
        return { success: true, user: toAuthUser(credential.user) };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  };
}

// Null implementation for testing
export function createNullAuthService(initialUser: AuthUser | null = null): AuthService {
  let currentUser: AuthUser | null = initialUser;
  const listeners: Set<(user: AuthUser | null) => void> = new Set();
  let pendingEmail: string | null = null;

  const notifyListeners = () => {
    listeners.forEach((callback) => callback(currentUser));
  };

  return {
    async signUp(email: string, password: string): Promise<AuthResult> {
      if (password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters' };
      }
      if (!email.includes('@')) {
        return { success: false, error: 'Invalid email format' };
      }
      currentUser = { uid: `user-${Date.now()}`, email };
      notifyListeners();
      return { success: true, user: currentUser };
    },

    async signIn(email: string, password: string): Promise<AuthResult> {
      // In null implementation, any valid-looking credentials work
      if (!email.includes('@')) {
        return { success: false, error: 'Invalid email format' };
      }
      if (password.length < 8) {
        return { success: false, error: 'Invalid password' };
      }
      currentUser = { uid: `user-${Date.now()}`, email };
      notifyListeners();
      return { success: true, user: currentUser };
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

    async sendSignInLink(email: string): Promise<AuthResult> {
      if (!email.includes('@')) {
        return { success: false, error: 'Invalid email format' };
      }
      pendingEmail = email;
      return { success: true };
    },

    async handleSignInLink(url: string): Promise<AuthResult> {
      if (!pendingEmail || !url.includes('grocery-list-cad.firebaseapp.com')) {
        return { success: false, error: 'Invalid sign-in link' };
      }
      const email = pendingEmail;
      pendingEmail = null;
      currentUser = { uid: `user-${Date.now()}`, email };
      notifyListeners();
      return { success: true, user: currentUser };
    },
  };
}
