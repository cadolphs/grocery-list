/**
 * Client-side form validation — pure module (US-04).
 * Rules mirrored from mobile src/ui/LoginScreen.tsx.
 */

export type AuthMode = 'signIn' | 'signUp';

export const EMAIL_PATTERN: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateFormInput = (
  email: string,
  password: string,
  mode: AuthMode
): string | null => {
  const trimmed = email.trim();
  if (!trimmed) return 'Please enter your email address';
  if (!EMAIL_PATTERN.test(trimmed)) return 'Please enter a valid email address.';
  if (mode === 'signUp' && password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  return null;
};
