// AreaSection - renders a house area heading with its trip items
// Pure presentational component

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { AreaGroup } from '../domain/item-grouping';
import { TripItemRow } from './TripItemRow';
import { theme } from './theme';

type AreaSectionProps = {
  readonly areaGroup: AreaGroup;
  readonly onSkipItem?: (name: string) => void;
  readonly onUnskipItem?: (name: string) => void;
  readonly onCompleteArea?: (area: string) => void;
  readonly onUncompleteArea?: (area: string) => void;
  readonly onSelectArea?: (area: string) => void;
  readonly onEditStaple?: (name: string, area: string) => void;
  readonly onItemPress?: (name: string) => void;
  readonly onItemLongPress?: (name: string, area: string) => void;
  readonly isCompleted?: boolean;
  readonly isActive?: boolean;
};

const formatAreaHeading = (area: string, neededCount: number): string =>
  `${area} (${neededCount})`;

export const AreaSection = ({ areaGroup, onCompleteArea, onUncompleteArea, onSelectArea, onItemPress, onItemLongPress, isCompleted, isActive }: AreaSectionProps): React.JSX.Element => {
  const neededCount = areaGroup.items.filter((item) => item.needed).length;

  return (
    <View style={styles.card} testID={isActive ? `active-area-${areaGroup.area}` : undefined}>
      <View style={styles.header}>
        <Pressable onPress={onSelectArea ? () => onSelectArea(areaGroup.area) : undefined}>
          <Text style={styles.heading}>{formatAreaHeading(areaGroup.area, neededCount)}</Text>
        </Pressable>
        {isCompleted && onUncompleteArea && (
          <Pressable style={styles.badge} testID={`badge-${areaGroup.area}`} onPress={() => onUncompleteArea(areaGroup.area)}>
            <Text style={styles.badgeText}>Undo</Text>
          </Pressable>
        )}
        {isCompleted && !onUncompleteArea && (
          <View style={styles.badge} testID={`badge-${areaGroup.area}`}>
            <Text style={styles.badgeText}>Complete</Text>
          </View>
        )}
      </View>
      {areaGroup.items.map((item, index) => (
        <View key={item.id}>
          {index > 0 && <View style={styles.separator} />}
          <TripItemRow
            item={item}
            mode="home"
            onPress={onItemPress ? () => onItemPress(item.name) : undefined}
            onLongPress={onItemLongPress}
          />
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
    backgroundColor: theme.color.tile,
    borderRadius: theme.radius.lg,
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
    color: theme.color.text,
  },
  badge: {
    backgroundColor: theme.color.inverse,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: theme.color.inverseText,
    fontSize: 12,
    fontWeight: '600',
  },
  separator: {
    height: 0,
  },
  skippedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  skippedName: {
    color: theme.color.textMuted,
    textDecorationLine: 'line-through',
    fontSize: 14,
  },
  readdButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  readdText: {
    color: theme.color.accent,
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: theme.color.inverse,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  doneText: {
    color: theme.color.inverseText,
    fontWeight: '600',
    fontSize: 14,
  },
});
