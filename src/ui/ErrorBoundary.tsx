// ErrorBoundary - catches render-time errors from descendants and displays
// fallback UI instead of propagating (which in React Native would yield a
// blank screen in production).
//
// Functional paradigm exception: React requires a CLASS component for
// componentDidCatch / getDerivedStateFromError. There is no hook equivalent.
// This is the ONE permitted class in the codebase. All other React surface
// area uses function components and hooks.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type ErrorBoundaryProps = {
  readonly children: React.ReactNode;
};

type ErrorBoundaryState = {
  readonly error: Error | null;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Log to console so the error is visible during development.
    // In production this could forward to a crash reporter.
    console.error('ErrorBoundary caught error:', error, info);
  }

  render(): React.ReactNode {
    const { error } = this.state;
    if (error !== null) {
      return (
        <View testID="error-boundary-fallback" style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{error.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#fff5f5',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#c62828',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#333333',
  },
});
