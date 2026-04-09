import { createNullAuthService, AuthService, AuthUser } from './AuthService';

describe('AuthService - password authentication', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = createNullAuthService();
  });

  test('signUp creates a new user and returns success', async () => {
    const result = await authService.signUp('user@example.com', 'password123');
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user!.email).toBe('user@example.com');
  });

  test('signIn authenticates an existing user', async () => {
    const result = await authService.signIn('user@example.com', 'password123');
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user!.email).toBe('user@example.com');
  });

  test('signOut clears the current user', async () => {
    await authService.signIn('user@example.com', 'password123');
    await authService.signOut();
    expect(authService.getCurrentUser()).toBeNull();
  });

  test('onAuthStateChanged is notified when user signs in', async () => {
    const stateChanges: (AuthUser | null)[] = [];

    authService.onAuthStateChanged((user) => {
      stateChanges.push(user);
    });

    await authService.signIn('listener@example.com', 'password123');

    expect(stateChanges.length).toBeGreaterThanOrEqual(2);
    expect(stateChanges[0]).toBeNull();
    const lastChange = stateChanges[stateChanges.length - 1];
    expect(lastChange).not.toBeNull();
    expect(lastChange!.email).toBe('listener@example.com');
  });

  test('signUp rejects invalid email', async () => {
    const result = await authService.signUp('not-an-email', 'password123');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('signIn rejects invalid email', async () => {
    const result = await authService.signIn('not-an-email', 'password123');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
