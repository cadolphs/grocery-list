// AppShell - top-level app layout
// Renders ViewToggle and conditionally shows HomeView or StoreView

import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useViewMode } from '../hooks/useViewMode';
import { ViewToggle } from './ViewToggle';
import { HomeView } from './HomeView';
import { StoreView } from './StoreView';

export const AppShell = (): React.JSX.Element => {
  const { viewMode, toggleViewMode } = useViewMode();

  const handleToggle = (mode: 'home' | 'store'): void => {
    if (mode !== viewMode) {
      toggleViewMode();
    }
  };

  return (
    <SafeAreaView testID="safe-area" style={styles.container}>
      <ViewToggle viewMode={viewMode} onToggle={handleToggle} />
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
