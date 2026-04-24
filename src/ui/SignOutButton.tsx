// SignOutButton - presentational sign-out control
//
// Pure presentational component. No internal state, no useEffect.
// Fire-and-forget onPress: we do not await the returned promise because
// state transitions are driven by the auth listener (see ADR-008).
//
// Rapid double-tap coalescing (AC-7): a per-instance useRef<boolean> guard
// short-circuits subsequent presses after the first. The guard is reset
// naturally by unmount — the auth transition unmounts the authenticated
// shell (and this button) on sign-out, so the next session starts fresh.
// No time-based debounce (setTimeout) is used: the unmount IS the reset.
//
// Contract (per docs/feature/logout-button/design/wave-decisions.md §3.1):
//
//   export type SignOutButtonProps = {
//     readonly onPress: () => void | Promise<void>;
//     readonly testID?: string;
//   };

import React, { useRef } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';

export type SignOutButtonProps = {
  readonly onPress: () => void | Promise<void>;
  readonly testID?: string;
};

export const __SCAFFOLD__ = false;

export const SignOutButton = ({ onPress, testID }: SignOutButtonProps): React.JSX.Element => {
  // Per-instance idempotence guard. Flipped true on first press; subsequent
  // presses during the same mount are ignored. Not module-level — each
  // mounted button has its own guard.
  const hasFiredRef = useRef<boolean>(false);

  const handlePress = (): void => {
    if (hasFiredRef.current) return;
    hasFiredRef.current = true;
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
