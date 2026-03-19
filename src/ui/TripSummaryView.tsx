// TripSummaryView - displays trip completion summary
// Shows purchased count and carryover items

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { CompleteTripResult } from '../domain/trip';

type TripSummaryViewProps = {
  readonly result: CompleteTripResult;
  readonly prepTimeMinutes?: number;
  readonly onSwitchToStoreView?: () => void;
};

export const TripSummaryView = ({ result, prepTimeMinutes, onSwitchToStoreView }: TripSummaryViewProps): React.JSX.Element => {
  const stapleCount = result.purchasedStaples.length;
  const oneOffCount = result.purchasedOneOffs.length;
  const purchasedCount = stapleCount + oneOffCount;
  const carryoverItems = result.unboughtItems;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.heading}>{purchasedCount} items purchased</Text>
        <Text style={styles.breakdown}>{stapleCount} staples</Text>
        {oneOffCount > 0 && <Text style={styles.breakdown}>{oneOffCount} one-offs</Text>}
        {prepTimeMinutes !== undefined && (
          <Text style={styles.breakdown}>{prepTimeMinutes} min</Text>
        )}
        {carryoverItems.length > 0 && (
          <View style={styles.carryoverSection}>
            <View style={styles.separator} />
            <Text style={styles.carryoverHeading}>Items that will carry over</Text>
            {carryoverItems.map((item) => (
              <Text key={item.id} style={styles.carryoverItem}>{item.name}</Text>
            ))}
          </View>
        )}
        {onSwitchToStoreView && (
          <Pressable style={styles.switchButton} onPress={onSwitchToStoreView}>
            <Text style={styles.switchButtonText}>Switch to Store View</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 8,
  },
  breakdown: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 4,
  },
  carryoverSection: {
    marginTop: 12,
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginBottom: 12,
  },
  carryoverHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  carryoverItem: {
    fontSize: 15,
    color: '#333333',
    paddingVertical: 4,
  },
  switchButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 16,
    minHeight: 48,
  },
  switchButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
