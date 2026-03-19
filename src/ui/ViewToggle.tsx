// ViewToggle - renders Home/Store toggle buttons
// Uses useViewMode hook for state management

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ViewMode } from '../hooks/useViewMode';

type ViewToggleProps = {
  readonly viewMode: ViewMode;
  readonly onToggle: (mode: ViewMode) => void;
};

export const ViewToggle = ({ viewMode, onToggle }: ViewToggleProps): React.JSX.Element => (
  <View style={styles.container}>
    <TouchableOpacity
      style={[styles.tab, viewMode === 'home' && styles.activeTab]}
      onPress={() => onToggle('home')}
    >
      <Text style={[styles.tabText, viewMode === 'home' && styles.activeTabText]}>Home</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.tab, viewMode === 'store' && styles.activeTab]}
      onPress={() => onToggle('store')}
    >
      <Text style={[styles.tabText, viewMode === 'store' && styles.activeTabText]}>Store</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 44,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#2196F3',
  },
  tabText: {
    fontSize: 16,
    color: '#666666',
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: '600',
  },
});
