import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  User,
} from 'firebase/auth';
import { getFirebaseAuth } from '../firebase-config';

export type AuthUser = {
  readonly uid: string;
  readonly email: string | null;
};

export type AuthState = {
  readonly user: AuthUser | null;
  readonly loading: boolean;
  readonly sendSignInLink: (email: string) => Promise<void>;
  readonly handleSignInLink: (url: string) => Promise<void>;
};

const toAuthUser = (firebaseUser: User): AuthUser => ({
  uid: firebaseUser.uid,
  email: firebaseUser.email,
});

export const useAuth = (): AuthState => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ? toAuthUser(firebaseUser) : null);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const sendSignInLink = async (email: string): Promise<void> => {
    const auth = getFirebaseAuth();
    const actionCodeSettings = {
      url: window.location.href,
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', email);
  };

  const handleSignInLink = async (url: string): Promise<void> => {
    const auth = getFirebaseAuth();
    if (!isSignInWithEmailLink(auth, url)) return;
    const email = window.localStorage.getItem('emailForSignIn');
    if (!email) return;
    await signInWithEmailLink(auth, email, url);
    window.localStorage.removeItem('emailForSignIn');
  };

  return { user, loading, sendSignInLink, handleSignInLink };
};
