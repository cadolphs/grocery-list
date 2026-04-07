import { render, waitFor } from '@testing-library/react-native';
import App from './App';

// Mock useAuth to control auth state in tests
const mockUseAuth = jest.fn();
jest.mock('./src/hooks/useAuth', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

// Mock createAuthService so it doesn't touch Firebase
jest.mock('./src/auth/AuthService', () => ({
  createAuthService: () => ({}),
}));

// Mock useAppInitialization to avoid Firestore dependency in tests
const mockUseAppInitialization = jest.fn();
jest.mock('./src/hooks/useAppInitialization', () => ({
  useAppInitialization: (...args: unknown[]) => mockUseAppInitialization(...args),
}));

// Mock AppShell to avoid deep rendering of the full app tree
jest.mock('./src/ui/AppShell', () => ({
  AppShell: () => {
    const { Text } = require('react-native');
    return <Text>Home</Text>;
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  // Default: not ready (loading state for app init)
  mockUseAppInitialization.mockReturnValue({
    isReady: false,
    services: null,
    error: null,
    needsAuth: false,
  });
});

describe('App', () => {
  test('shows loading screen when auth is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    });

    const { getByText } = render(<App />);
    expect(getByText('Loading...')).toBeTruthy();
  });

  test('shows login screen when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    });

    const { getByText } = render(<App />);
    expect(getByText('Sign In')).toBeTruthy();
  });

  test('shows main app when user is authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-user', email: 'test@example.com' },
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    });

    const mockServices = {
      stapleLibrary: {},
      tripService: {},
      areaManagement: {},
      sectionOrderStorage: {},
    };
    mockUseAppInitialization.mockReturnValue({
      isReady: true,
      services: mockServices,
      error: null,
      needsAuth: false,
    });

    const { getByText } = render(<App />);

    await waitFor(() => {
      expect(getByText('Home')).toBeTruthy();
    });
  });
});
