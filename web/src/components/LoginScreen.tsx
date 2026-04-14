/**
 * LoginScreen component — US-02 minimal sign-in form.
 * Subsequent US-03..US-06 add mode toggle, validation, error mapping, and loading state.
 */

import { useState, type FormEvent } from 'react';
import type { AuthResult } from '../auth/AuthService';

export type LoginScreenProps = {
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
};

export const LoginScreen = ({ signIn, signUp }: LoginScreenProps) => {
  void signUp;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await signIn(email, password);
  };

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
      <button type="submit">Sign In</button>
    </form>
  );
};
