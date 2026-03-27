import { createNullAuthService, AuthService, AuthUser } from './AuthService';

describe('AuthService - email link authentication', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = createNullAuthService();
  });

  test('sendSignInLink followed by handleSignInLink authenticates the user', async () => {
    const email = 'user@example.com';

    const sendResult = await authService.sendSignInLink(email);
    expect(sendResult.success).toBe(true);

    // Simulate clicking the magic link URL
    const magicLinkUrl = `https://grocery-list-cad.firebaseapp.com?email=${email}`;
    const handleResult = await authService.handleSignInLink(magicLinkUrl);
    expect(handleResult.success).toBe(true);
    expect(handleResult.user).toBeDefined();
    expect(handleResult.user!.email).toBe(email);

    // After handling the link, getCurrentUser should return the authenticated user
    const currentUser = authService.getCurrentUser();
    expect(currentUser).not.toBeNull();
    expect(currentUser!.email).toBe(email);
  });

  test('onAuthStateChanged is notified when user signs in via email link', async () => {
    const email = 'listener@example.com';
    const stateChanges: (AuthUser | null)[] = [];

    authService.onAuthStateChanged((user) => {
      stateChanges.push(user);
    });

    await authService.sendSignInLink(email);
    const magicLinkUrl = `https://grocery-list-cad.firebaseapp.com?email=${email}`;
    await authService.handleSignInLink(magicLinkUrl);

    // First call is the initial state (null), then after handleSignInLink the user is set
    expect(stateChanges.length).toBeGreaterThanOrEqual(2);
    expect(stateChanges[0]).toBeNull(); // initial state
    const lastChange = stateChanges[stateChanges.length - 1];
    expect(lastChange).not.toBeNull();
    expect(lastChange!.email).toBe(email);
  });

  test('sendSignInLink rejects invalid email', async () => {
    const result = await authService.sendSignInLink('not-an-email');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('handleSignInLink rejects invalid URL', async () => {
    const result = await authService.handleSignInLink('not-a-valid-link');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
