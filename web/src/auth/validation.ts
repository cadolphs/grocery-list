/**
 * Client-side form validation — RED scaffold (created by DISTILL).
 * DELIVER US-04 replaces with real validation rules copied from mobile.
 */

export const __SCAFFOLD__ = true;

export type AuthMode = 'signIn' | 'signUp';

export const EMAIL_PATTERN: RegExp = /__SCAFFOLD__/;

export const validateFormInput = (
  _email: string,
  _password: string,
  _mode: AuthMode
): string | null => {
  throw new Error('validateFormInput not yet implemented — RED scaffold');
};
