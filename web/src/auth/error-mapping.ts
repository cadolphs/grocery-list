/**
 * Firebase error mapping — RED scaffold (created by DISTILL).
 * DELIVER US-05 replaces with real mode-aware error copy.
 */

import type { AuthMode } from './validation';

export const __SCAFFOLD__ = true;

export const mapAuthError = (_error: unknown, _mode: AuthMode): string => {
  throw new Error('mapAuthError not yet implemented — RED scaffold');
};
