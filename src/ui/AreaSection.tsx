// AreaSection - renders a house area heading with its trip items
// Pure presentational component

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { AreaGroup } from '../domain/item-grouping';
import { TripItemRow } from './TripItemRow';

type AreaSectionProps = {
  readonly areaGroup: AreaGroup;
  readonly onSkipItem?: (name: string) => void;
  readonly onUnskipItem?: (name: string) => void;
  readonly onCompleteArea?: (area: string) => void;
  readonly onSelectArea?: (area: string) => void;
  readonly onEditStaple?: (name: string, area: string) => void;
  readonly isCompleted?: boolean;
  readonly isActive?: boolean;
};

const formatAreaHeading = (area: string, neededCount: number): string =>
  `${area} (${neededCount})`;

export const AreaSection = ({ areaGroup, onSkipItem, onUnskipItem, onCompleteArea, onSelectArea, onEditStaple, isCompleted, isActive }: AreaSectionProps): React.JSX.Element => {
  const neededItems = areaGroup.items.filter((item) => item.needed);
  const skippedItems = areaGroup.items.filter((item) => !item.needed);

  return (
    <View style={styles.card} testID={isActive ? `active-area-${areaGroup.area}` : undefined}>
      <View style={styles.header}>
        <Pressable onPress={onSelectArea ? () => onSelectArea(areaGroup.area) : undefined}>
          <Text style={styles.heading}>{formatAreaHeading(areaGroup.area, neededItems.length)}</Text>
        </Pressable>
        {isCompleted && (
          <View style={styles.badge} testID={`badge-${areaGroup.area}`}>
            <Text style={styles.badgeText}>Complete</Text>
          </View>
        )}
      </View>
      {neededItems.map((item, index) => (
        <View key={item.id}>
          {index > 0 && <View style={styles.separator} />}
          <TripItemRow
            item={item}
            mode="home"
            onSkip={onSkipItem ? () => onSkipItem(item.name) : undefined}
            onEditStaple={onEditStaple}
          />
        </View>
      ))}
      {skippedItems.map((item) => (
        <View key={item.id} style={styles.skippedRow}>
          <Text style={styles.skippedName}>{item.name}</Text>
          <Pressable
            style={styles.readdButton}
            testID={`readd-${item.name}`}
            onPress={onUnskipItem ? () => onUnskipItem(item.name) : undefined}
          >
            <Text style={styles.readdText}>Re-add</Text>
          </Pressable>
        </View>
      ))}
      {onCompleteArea && !isCompleted && (
        <Pressable
          style={styles.doneButton}
          testID={`complete-${areaGroup.area}`}
          onPress={() => onCompleteArea(areaGroup.area)}
        >
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  badge: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  skippedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  skippedName: {
    color: '#999999',
    textDecorationLine: 'line-through',
    fontSize: 14,
  },
  readdButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  readdText: {
    color: '#FF9800',
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  doneText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});
