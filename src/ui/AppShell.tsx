// AppShell - top-level app layout
// Renders ViewToggle and conditionally shows HomeView or StoreView

import React from 'react';
import { View } from 'react-native';
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
    <View>
      <ViewToggle viewMode={viewMode} onToggle={handleToggle} />
      {viewMode === 'home' ? <HomeView /> : <StoreView />}
    </View>
  );
};
