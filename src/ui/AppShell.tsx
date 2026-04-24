// AppShell - top-level app layout.
// Renders ViewToggle and BOTH HomeView and StoreView simultaneously, switching
// visibility via `display: 'flex' | 'none'`. This preserves each view's React
// state / cached hook data across tab toggles, preventing the "blank home
// after returning to Home tab" regression caused by remount-driven remount-
// during-initial-load races.
// Accepts a signOut prop which is forwarded to SignOutButton.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useViewMode, ViewMode } from '../hooks/useViewMode';
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

const visibilityStyle = (isActive: boolean): { flex: number; display: 'flex' | 'none' } => ({
  flex: 1,
  display: isActive ? 'flex' : 'none',
});

export const AppShell = ({ signOut }: AppShellProps): React.JSX.Element => {
  const { viewMode, toggleViewMode } = useViewMode();

  const handleToggle = (mode: ViewMode): void => {
    if (mode !== viewMode) {
      toggleViewMode();
    }
  };

  return (
    <SafeAreaView testID="safe-area" style={styles.container}>
      <ViewToggle viewMode={viewMode} onToggle={handleToggle} />
      {signOut ? <SignOutButton onPress={signOut} /> : null}
      <View testID="home-view-container" style={visibilityStyle(viewMode === 'home')}>
        <HomeView />
      </View>
      <View testID="store-view-container" style={visibilityStyle(viewMode === 'store')}>
        <StoreView />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});
