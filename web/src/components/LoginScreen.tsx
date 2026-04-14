/**
 * LoginScreen component — US-02 sign-in form + US-03 mode toggle.
 * Subsequent US-04..US-06 add validation, error mapping, and loading state.
 */

import { useState, type FormEvent } from 'react';
import type { AuthResult } from '../auth/AuthService';

export type LoginScreenProps = {
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
};

type AuthMode = 'signIn' | 'signUp';

export const LoginScreen = ({ signIn, signUp }: LoginScreenProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const action = mode === 'signUp' ? signUp : signIn;
    const result = await action(email, password);
    if (!result.success) {
      setErrorMessage(result.error ?? 'Invalid credentials');
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === 'signIn' ? 'signUp' : 'signIn'));
    setErrorMessage(null);
  };

  const submitLabel = mode === 'signUp' ? 'Sign Up' : 'Sign In';
  const toggleLabel =
    mode === 'signIn'
      ? "Don't have an account? Sign Up"
      : 'Already have an account? Sign In';

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="login-email">Email</label>
      <input
        id="login-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <label htmlFor="login-password">Password</label>
      <input
        id="login-password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {errorMessage !== null && <p role="alert">{errorMessage}</p>}
      <button type="submit">{submitLabel}</button>
      <button type="button" onClick={toggleMode}>
        {toggleLabel}
      </button>
    </form>
  );
};
