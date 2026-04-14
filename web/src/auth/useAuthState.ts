import { useEffect, useState } from 'react';
import type { AuthService, AuthUser } from './AuthService';

export type AuthState = {
  readonly user: AuthUser | null;
  readonly loading: boolean;
};

export const useAuthState = (authService: AuthService): AuthState => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, [authService]);

  return { user, loading };
};
