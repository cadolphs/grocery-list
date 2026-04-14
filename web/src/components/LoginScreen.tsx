/**
 * LoginScreen component — RED scaffold (created by DISTILL).
 * DELIVER US-02, US-03, US-04, US-05, US-06 fill in the real React DOM form.
 */

import type { AuthResult } from '../auth/AuthService';

export const __SCAFFOLD__ = true;

export type LoginScreenProps = {
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
};

export const LoginScreen = (_props: LoginScreenProps): never => {
  throw new Error('LoginScreen not yet implemented — RED scaffold');
};
