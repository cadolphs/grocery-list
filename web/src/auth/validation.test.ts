/**
 * Acceptance tests for the validation pure module (US-04).
 * WS strategy C: real pure-function invocation, no doubles.
 * RED scaffold throws on every call until DELIVER US-04 implements.
 */

import { describe, it, expect } from 'vitest';
import { validateFormInput, EMAIL_PATTERN } from './validation';

describe('[@real-io @us-04] validateFormInput', () => {
  it('V1 rejects empty email in either mode', () => {
    const msg = validateFormInput('', 'password', 'signIn');
    expect(msg).not.toBeNull();
    expect(msg!.toLowerCase()).toContain('email');
  });

  it('V2 rejects invalid email format', () => {
    const msg = validateFormInput('not-an-email', 'password', 'signIn');
    expect(msg).not.toBeNull();
    expect(msg!.toLowerCase()).toMatch(/valid email/);
  });

  it('V3 rejects <8 char password in sign-up mode only', () => {
    const signUpResult = validateFormInput('a@b.co', 'short', 'signUp');
    expect(signUpResult).not.toBeNull();
    expect(signUpResult!.toLowerCase()).toContain('8 characters');

    const signInResult = validateFormInput('a@b.co', 'short', 'signIn');
    expect(signInResult).toBeNull();
  });

  it('V4 returns null for valid sign-in inputs', () => {
    expect(validateFormInput('a@b.co', 'anything', 'signIn')).toBeNull();
  });

  it('V5 returns null for valid sign-up inputs with long password', () => {
    expect(validateFormInput('a@b.co', 'longenough', 'signUp')).toBeNull();
  });
});

describe('[@real-io @us-04] EMAIL_PATTERN', () => {
  it('V6 accepts common valid addresses and rejects obvious invalids', () => {
    expect(EMAIL_PATTERN.test('a@b.co')).toBe(true);
    expect(EMAIL_PATTERN.test('x+tag@example.com')).toBe(true);
    expect(EMAIL_PATTERN.test('first.last@sub.example.org')).toBe(true);

    expect(EMAIL_PATTERN.test('no-at.com')).toBe(false);
    expect(EMAIL_PATTERN.test('two@@at.com')).toBe(false);
    expect(EMAIL_PATTERN.test('spaces @b.co')).toBe(false);
  });
});
