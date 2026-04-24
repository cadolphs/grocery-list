/**
 * Unit test for ErrorBoundary.
 *
 * Contract: when a child throws during render, ErrorBoundary displays
 * fallback UI instead of propagating the error (which in production
 * would result in a blank screen).
 */

import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ErrorBoundary } from '../../../src/ui/ErrorBoundary';

const Boom = (): React.JSX.Element => {
  throw new Error('Kaboom');
};

const Harmless = (): React.JSX.Element => <Text>All good</Text>;

describe('ErrorBoundary', () => {
  // React logs the caught error to console.error by design. Silence it
  // for the error-path test so the test output stays clean.
  let consoleErrorSpy: jest.SpyInstance;
  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <Harmless />
      </ErrorBoundary>,
    );

    expect(screen.getByText('All good')).toBeTruthy();
  });

  it('renders fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    // Fallback UI should be rendered in place of the crashing subtree.
    expect(screen.getByTestId('error-boundary-fallback')).toBeTruthy();
  });

  it('surfaces the error message in the fallback UI', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/Kaboom/)).toBeTruthy();
  });
});
