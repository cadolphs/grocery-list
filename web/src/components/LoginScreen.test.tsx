/**
 * Acceptance tests for LoginScreen (US-02, US-03, US-04, US-05, US-06).
 * @in-memory: signIn/signUp are vitest spies; no live Firebase.
 * WS strategy B: NullAuthService substitutes for Firebase.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginScreen } from './LoginScreen';
import type { AuthResult } from '../auth/AuthService';

const okResult: AuthResult = { success: true, user: { uid: 'u1', email: 'clemens@example.com' } };
const failResult = (msg: string): AuthResult => ({ success: false, error: msg });

const mkSpies = () => {
  const signIn = vi.fn(async () => okResult);
  const signUp = vi.fn(async () => okResult);
  return { signIn, signUp };
};

const renderLogin = (overrides: Partial<ReturnType<typeof mkSpies>> = {}) => {
  const spies = { ...mkSpies(), ...overrides };
  render(<LoginScreen signIn={spies.signIn} signUp={spies.signUp} />);
  return spies;
};

const typeCreds = async (email: string, password: string) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/email/i), email);
  await user.type(screen.getByLabelText(/password/i), password);
  return user;
};

describe('[@in-memory @us-02] LoginScreen render', () => {
  it('15. renders email + password fields and Sign In button', () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    const password = screen.getByLabelText(/password/i);
    expect(password).toBeInTheDocument();
    expect(password).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('16. submitting valid credentials calls signIn', async () => {
    const spies = renderLogin();
    const user = await typeCreds('clemens@example.com', 'correct-horse-battery');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(spies.signIn).toHaveBeenCalledTimes(1);
    expect(spies.signIn).toHaveBeenCalledWith('clemens@example.com', 'correct-horse-battery');
  });
});

describe('[@in-memory @us-03] Mode toggle (Sign In ↔ Sign Up)', () => {
  it('17. toggling flips button label + helper text', async () => {
    renderLogin();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /sign up/i }));
    expect(screen.getByRole('button', { name: /^sign up$/i })).toBeInTheDocument();
    expect(screen.getByText(/already have an account\? sign in/i)).toBeInTheDocument();
  });

  it('18. toggle preserves typed email', async () => {
    renderLogin();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), 'clemens@example.com');
    await user.click(screen.getByRole('button', { name: /sign up/i }));
    expect(screen.getByLabelText(/email/i)).toHaveValue('clemens@example.com');
  });

  it('19. toggle clears prior error', async () => {
    const spies = { ...mkSpies(), signIn: vi.fn(async () => failResult('Invalid credentials')) };
    render(<LoginScreen signIn={spies.signIn} signUp={spies.signUp} />);
    const user = await typeCreds('a@b.co', 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/invalid|incorrect/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /sign up/i }));
    expect(screen.queryByText(/invalid|incorrect/i)).not.toBeInTheDocument();
  });

  it('20. sign up submits to signUp prop', async () => {
    const spies = renderLogin();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /sign up/i }));
    await user.type(screen.getByLabelText(/email/i), 'new@example.com');
    await user.type(screen.getByLabelText(/password/i), 'longenoughpassword');
    await user.click(screen.getByRole('button', { name: /^sign up$/i }));
    expect(spies.signUp).toHaveBeenCalledWith('new@example.com', 'longenoughpassword');
  });
});

describe('[@in-memory @us-04] Client-side validation blocks network calls', () => {
  it('21. empty email shows validation error and does not call signIn', async () => {
    const spies = renderLogin();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/enter your email/i)).toBeInTheDocument();
    expect(spies.signIn).not.toHaveBeenCalled();
  });

  it('22. invalid email format is rejected pre-network', async () => {
    const spies = renderLogin();
    const user = await typeCreds('not-an-email', 'password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
    expect(spies.signIn).not.toHaveBeenCalled();
  });

  it('23. sign-up short password rejected pre-network', async () => {
    const spies = renderLogin();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /sign up/i }));
    await user.type(screen.getByLabelText(/email/i), 'a@b.co');
    await user.type(screen.getByLabelText(/password/i), 'short');
    await user.click(screen.getByRole('button', { name: /^sign up$/i }));
    expect(await screen.findByText(/8 characters/i)).toBeInTheDocument();
    expect(spies.signUp).not.toHaveBeenCalled();
  });

  it('24. sign-in mode does NOT enforce 8-char minimum', async () => {
    const spies = renderLogin();
    const user = await typeCreds('a@b.co', 'abcd');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(spies.signIn).toHaveBeenCalledWith('a@b.co', 'abcd');
  });
});

describe('[@in-memory @us-05] Firebase error mapping surfaces in UI', () => {
  it('25. Firebase failure displays mapped error copy', async () => {
    const spies = {
      ...mkSpies(),
      signIn: vi.fn(async () => failResult('Firebase: Error (auth/wrong-password)')),
    };
    render(<LoginScreen signIn={spies.signIn} signUp={spies.signUp} />);
    const user = await typeCreds('a@b.co', 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/invalid|incorrect/i)).toBeInTheDocument();
  });
});

describe('[@in-memory @us-06] Loading state', () => {
  it('26. button label + disabled during submit', async () => {
    let resolveSignIn!: (r: AuthResult) => void;
    const pending = new Promise<AuthResult>((r) => {
      resolveSignIn = r;
    });
    const spies = { ...mkSpies(), signIn: vi.fn(() => pending) };
    render(<LoginScreen signIn={spies.signIn} signUp={spies.signUp} />);
    const user = await typeCreds('a@b.co', 'anything');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
    await act(async () => {
      resolveSignIn(okResult);
    });
  });

  it('27. form re-enables after a failure', async () => {
    const spies = {
      ...mkSpies(),
      signIn: vi.fn(async () => failResult('Invalid credentials')),
    };
    render(<LoginScreen signIn={spies.signIn} signUp={spies.signUp} />);
    const user = await typeCreds('a@b.co', 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    await screen.findByText(/invalid|incorrect/i);
    expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled();
  });
});
