import { useState, useEffect, useCallback } from 'react';
import { AuthService, AuthUser, AuthResult } from '../auth/AuthService';

export type UseAuthResult = {
  readonly user: AuthUser | null;
  readonly loading: boolean;
  readonly sendSignInLink: (email: string) => Promise<AuthResult>;
  readonly handleSignInLink: (url: string) => Promise<AuthResult>;
  readonly signOut: () => Promise<void>;
};

export const useAuth = (authService: AuthService): UseAuthResult => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((authUser) => {
      setUser(authUser);
      setLoading(false);
    });
    return unsubscribe;
  }, [authService]);

  const sendSignInLink = useCallback(
    (email: string): Promise<AuthResult> => authService.sendSignInLink(email),
    [authService],
  );

  const handleSignInLink = useCallback(
    (url: string): Promise<AuthResult> => authService.handleSignInLink(url),
    [authService],
  );

  const signOut = useCallback(
    (): Promise<void> => authService.signOut(),
    [authService],
  );

  return { user, loading, sendSignInLink, handleSignInLink, signOut };
};
