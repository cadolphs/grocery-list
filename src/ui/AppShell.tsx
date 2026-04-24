// AppShell - top-level app layout
// Renders ViewToggle and conditionally shows HomeView or StoreView.
// Accepts a signOut prop which is forwarded to SignOutButton.

import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useViewMode } from '../hooks/useViewMode';
import { ViewToggle } from './ViewToggle';
import { HomeView } from './HomeView';
import { StoreView } from './StoreView';
import { SignOutButton } from './SignOutButton';

export type AppShellProps = {
  // Optional at the type boundary so pre-existing regression tests that render
  // AppShell without auth wiring still compile. Production and the logout-button
  // acceptance harness always pass this prop (see App.tsx and the
  // logout-button acceptance test). When absent, SignOutButton is not rendered.
  readonly signOut?: () => Promise<void>;
};

export const AppShell = ({ signOut }: AppShellProps): React.JSX.Element => {
  const { viewMode, toggleViewMode } = useViewMode();

  const handleToggle = (mode: 'home' | 'store'): void => {
    if (mode !== viewMode) {
      toggleViewMode();
    }
  };

  return (
    <SafeAreaView testID="safe-area" style={styles.container}>
      <ViewToggle viewMode={viewMode} onToggle={handleToggle} />
      {signOut ? <SignOutButton onPress={signOut} /> : null}
      {viewMode === 'home' ? <HomeView /> : <StoreView />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});
