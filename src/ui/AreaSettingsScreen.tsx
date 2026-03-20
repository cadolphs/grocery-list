// AreaSettingsScreen - displays and manages house areas
// Shows list of configured areas with Add Area button

import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useAreas } from '../hooks/useAreas';

export const AreaSettingsScreen = (): React.JSX.Element => {
  const { areas } = useAreas();

  return (
    <ScrollView testID="area-settings-scroll" style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.header}>House Areas</Text>
      {areas.map((area) => (
        <View key={area} style={styles.areaCard}>
          <Text style={styles.areaName}>{area}</Text>
        </View>
      ))}
      <Pressable style={styles.addButton} testID="add-area-button">
        <Text style={styles.addButtonText}>Add Area</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 16,
  },
  areaCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  areaName: {
    fontSize: 16,
    color: '#333333',
  },
  addButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
