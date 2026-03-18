// LoadingScreen - displayed during app initialization

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const LoadingScreen = (): React.JSX.Element => (
  <View style={styles.container}>
    <Text>Loading...</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
