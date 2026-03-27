import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase modules before importing App
vi.mock('./firebase-config', () => ({
  getFirebaseAuth: vi.fn(() => ({})),
  getFirebaseDb: vi.fn(() => ({})),
}));

vi.mock('./hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { App } from './App';
import { useAuth } from './hooks/useAuth';

const mockUseAuth = vi.mocked(useAuth);

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state while auth is resolving', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      sendSignInLink: vi.fn(),
      handleSignInLink: vi.fn(),
    });

    render(<App />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows sign in when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      sendSignInLink: vi.fn(),
      handleSignInLink: vi.fn(),
    });

    render(<App />);

    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('shows grocery staple manager when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'user-1', email: 'test@example.com' },
      loading: false,
      sendSignInLink: vi.fn(),
      handleSignInLink: vi.fn(),
    });

    render(<App />);

    expect(screen.getByText('Grocery Staple Manager')).toBeInTheDocument();
  });
});
