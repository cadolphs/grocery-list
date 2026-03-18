// ViewToggle - renders Home/Store toggle buttons
// Uses useViewMode hook for state management

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ViewMode } from '../hooks/useViewMode';

type ViewToggleProps = {
  readonly viewMode: ViewMode;
  readonly onToggle: (mode: ViewMode) => void;
};

export const ViewToggle = ({ viewMode, onToggle }: ViewToggleProps): React.JSX.Element => (
  <View>
    <TouchableOpacity onPress={() => onToggle('home')}>
      <Text>Home</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={() => onToggle('store')}>
      <Text>Store</Text>
    </TouchableOpacity>
  </View>
);
