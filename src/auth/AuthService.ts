import {
  initializeApp,
  getApps,
  FirebaseApp,
} from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  Auth,
  User,
} from 'firebase/auth';

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

// Firebase configuration - should be set via environment variables in production
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
  };
}

export function createAuthService(): AuthService {
  let app: FirebaseApp;
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  const auth: Auth = getAuth(app);

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
  };
}

// Null implementation for testing
export function createNullAuthService(initialUser: AuthUser | null = null): AuthService {
  let currentUser: AuthUser | null = initialUser;
  const listeners: Set<(user: AuthUser | null) => void> = new Set();

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
  };
}
