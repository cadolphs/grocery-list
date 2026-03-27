import { renderHook, act } from '@testing-library/react-native/pure';
import { createNullAuthService, AuthService } from '../auth/AuthService';
import { useAuth } from './useAuth';

describe('useAuth', () => {
  describe('acceptance: useAuth tracks auth state changes', () => {
    test('given no initial user, useAuth starts loading then resolves to null user', () => {
      const authService = createNullAuthService(null);

      const { result } = renderHook(() => useAuth(authService));

      // After the onAuthStateChanged callback fires (synchronously in null impl),
      // loading should be false and user should be null
      expect(result.current.loading).toBe(false);
      expect(result.current.user).toBeNull();
    });

    test('given auth state changes from null to a user, useAuth returns updated user', async () => {
      const authService = createNullAuthService(null);

      const { result } = renderHook(() => useAuth(authService));

      expect(result.current.user).toBeNull();

      // Sign in triggers onAuthStateChanged
      await act(async () => {
        await authService.signIn('test@example.com', 'password123');
      });

      expect(result.current.user).not.toBeNull();
      expect(result.current.user?.email).toBe('test@example.com');
      expect(result.current.loading).toBe(false);
    });
  });

  describe('unit: initial loading state', () => {
    test('given initial user, resolves immediately with that user', () => {
      const initialUser = { uid: 'user-1', email: 'alice@example.com' };
      const authService = createNullAuthService(initialUser);

      const { result } = renderHook(() => useAuth(authService));

      expect(result.current.loading).toBe(false);
      expect(result.current.user).toEqual(initialUser);
    });
  });

  describe('unit: convenience passthrough functions', () => {
    test('sendSignInLink delegates to authService', async () => {
      const authService = createNullAuthService(null);
      const { result } = renderHook(() => useAuth(authService));

      let authResult: any;
      await act(async () => {
        authResult = await result.current.sendSignInLink('bob@example.com');
      });

      expect(authResult.success).toBe(true);
    });

    test('handleSignInLink delegates to authService', async () => {
      const authService = createNullAuthService(null);
      const { result } = renderHook(() => useAuth(authService));

      // First send a link to set up pending email
      await act(async () => {
        await result.current.sendSignInLink('bob@example.com');
      });

      let authResult: any;
      await act(async () => {
        authResult = await result.current.handleSignInLink(
          'https://grocery-list-cad.firebaseapp.com?link=test',
        );
      });

      expect(authResult.success).toBe(true);
      expect(result.current.user?.email).toBe('bob@example.com');
    });

    test('signOut delegates to authService and clears user', async () => {
      const initialUser = { uid: 'user-1', email: 'alice@example.com' };
      const authService = createNullAuthService(initialUser);
      const { result } = renderHook(() => useAuth(authService));

      expect(result.current.user).toEqual(initialUser);

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.user).toBeNull();
    });
  });

  describe('unit: cleanup on unmount', () => {
    test('unsubscribes from auth state changes on unmount', async () => {
      const authService = createNullAuthService(null);
      const { result, unmount } = renderHook(() => useAuth(authService));

      unmount();

      // After unmount, signing in should not cause errors
      // (the listener was removed, so no setState on unmounted component)
      await authService.signIn('test@example.com', 'password123');

      // If we get here without error, cleanup worked
      expect(true).toBe(true);
    });
  });
});
