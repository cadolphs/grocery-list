// LoadingScreen - displayed during app initialization

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from './theme';

export const LoadingScreen = (): React.JSX.Element => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color={theme.color.accent} />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.ground,
  },
  loadingText: {
    fontSize: 16,
    color: theme.color.textMuted,
    marginTop: 16,
  },
});
