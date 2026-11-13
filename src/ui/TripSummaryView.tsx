// TripSummaryView - displays trip completion summary
// Shows purchased count and carryover items

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { CompleteTripResult } from '../domain/trip';
import { theme } from './theme';
import { pressedBlock, surfaces } from './surfaces';

type TripSummaryViewProps = {
  readonly result: CompleteTripResult;
  readonly onSwitchToStoreView?: () => void;
};

export const TripSummaryView = ({
  result,
  onSwitchToStoreView,
}: TripSummaryViewProps): React.JSX.Element => {
  const stapleCount = result.purchasedStaples.length;
  const oneOffCount = result.purchasedOneOffs.length;
  const purchasedCount = stapleCount + oneOffCount;
  const carryoverItems = result.unboughtItems;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.heading}>{purchasedCount} items purchased</Text>
        <Text style={styles.breakdown}>{stapleCount} staples</Text>
        {oneOffCount > 0 && (
          <Text style={styles.breakdown}>{oneOffCount} one-offs</Text>
        )}
        {carryoverItems.length > 0 && (
          <View style={styles.carryoverSection}>
            <View style={styles.separator} />
            <Text style={styles.carryoverHeading}>
              Items that will carry over
            </Text>
            {carryoverItems.map((item) => (
              <Text key={item.id} style={styles.carryoverItem}>
                {item.name}
              </Text>
            ))}
          </View>
        )}
        {onSwitchToStoreView && (
          <Pressable
            style={({ pressed }) => [
              styles.switchButton,
              pressedBlock(pressed),
            ]}
            onPress={onSwitchToStoreView}
          >
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
    padding: theme.space.lg,
  },
  card: {
    ...surfaces.card,
    padding: 20,
  },
  heading: {
    fontSize: theme.font.size.xl,
    fontWeight: theme.font.weight.bold,
    color: theme.color.text,
    marginBottom: theme.space.sm,
  },
  breakdown: {
    fontSize: theme.font.size.md,
    color: theme.color.textMuted,
    marginBottom: theme.space.xs,
  },
  carryoverSection: {
    marginTop: theme.space.md,
  },
  separator: {
    height: 0,
    marginBottom: theme.space.md,
  },
  carryoverHeading: {
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.bold,
    color: theme.color.text,
    marginBottom: theme.space.sm,
  },
  carryoverItem: {
    fontSize: theme.font.size.sm,
    color: theme.color.text,
    paddingVertical: theme.space.xs,
  },
  switchButton: {
    ...surfaces.primaryButton,
    paddingVertical: 14,
    paddingHorizontal: theme.space.xl,
    alignItems: 'center',
    marginTop: theme.space.lg,
  },
  switchButtonText: {
    color: theme.color.onAccent,
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.bold,
  },
});
