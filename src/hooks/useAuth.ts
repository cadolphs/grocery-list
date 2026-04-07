import { useState, useEffect, useCallback } from 'react';
import { AuthService, AuthUser, AuthResult } from '../auth/AuthService';

export type UseAuthResult = {
  readonly user: AuthUser | null;
  readonly loading: boolean;
  readonly signIn: (email: string, password: string) => Promise<AuthResult>;
  readonly signUp: (email: string, password: string) => Promise<AuthResult>;
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

  const signIn = useCallback(
    (email: string, password: string): Promise<AuthResult> => authService.signIn(email, password),
    [authService],
  );

  const signUp = useCallback(
    (email: string, password: string): Promise<AuthResult> => authService.signUp(email, password),
    [authService],
  );

  const signOut = useCallback(
    (): Promise<void> => authService.signOut(),
    [authService],
  );

  return { user, loading, signIn, signUp, signOut };
};
