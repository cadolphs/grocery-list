// SignOutButton - presentational sign-out control
//
// Pure presentational component. No internal state, no useEffect.
// Fire-and-forget onPress: we do not await the returned promise because
// state transitions are driven by the auth listener (see ADR-008).
//
// Contract (per docs/feature/logout-button/design/wave-decisions.md §3.1):
//
//   export type SignOutButtonProps = {
//     readonly onPress: () => void | Promise<void>;
//     readonly testID?: string;
//   };

import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';

export type SignOutButtonProps = {
  readonly onPress: () => void | Promise<void>;
  readonly testID?: string;
};

export const __SCAFFOLD__ = false;

export const SignOutButton = ({ onPress, testID }: SignOutButtonProps): React.JSX.Element => {
  const handlePress = (): void => {
    // Fire-and-forget: do not await. Auth listener drives the state transition.
    void onPress();
  };

  return (
    <Pressable
      accessibilityLabel="Sign out"
      accessibilityRole="button"
      onPress={handlePress}
      testID={testID}
      style={styles.button}
    >
      <Text style={styles.label}>Sign out</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    minHeight: 44,
  },
  label: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
});
