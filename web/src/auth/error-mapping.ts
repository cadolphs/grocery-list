/**
 * Firebase error mapping — pure mode-aware copy (US-05).
 * No React, no firebase imports. Translates Firebase auth error codes
 * into user-readable, actionable messages.
 */

import type { AuthMode } from './validation';

const INVALID_CREDENTIALS = 'Invalid credentials. Check your email and password.';
const USER_NOT_FOUND_SIGNIN =
  'No account found with that email. Try Sign Up instead.';
const EMAIL_ALREADY_IN_USE_SIGNUP =
  'This email is already in use. Try Sign In instead.';
const FALLBACK_SIGNIN = 'Sign in failed. Please try again.';
const FALLBACK_SIGNUP = 'Sign up failed. Please try again.';

const extractCode = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return '';
};

const fallbackFor = (mode: AuthMode): string =>
  mode === 'signUp' ? FALLBACK_SIGNUP : FALLBACK_SIGNIN;

export const mapAuthError = (error: unknown, mode: AuthMode): string => {
  const code = extractCode(error);
  if (/auth\/(wrong-password|invalid-credential)/.test(code)) {
    return INVALID_CREDENTIALS;
  }
  if (/auth\/user-not-found/.test(code) && mode === 'signIn') {
    return USER_NOT_FOUND_SIGNIN;
  }
  if (/auth\/email-already-in-use/.test(code) && mode === 'signUp') {
    return EMAIL_ALREADY_IN_USE_SIGNUP;
  }
  // If the error carries a human-readable message with no raw Firebase
  // code, pass it through unchanged (covers upstream-mapped strings).
  const trimmed = code.trim();
  if (trimmed.length > 0 && !/firebase/i.test(trimmed) && !/auth\//.test(trimmed)) {
    return trimmed;
  }
  return fallbackFor(mode);
};
