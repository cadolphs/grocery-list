// AreaSection - renders a house area heading with its trip items
// Pure presentational component

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { AreaGroup } from '../domain/item-grouping';
import { SweepDecision } from '../domain/types';
import { TripItemRow } from './TripItemRow';
import { theme } from './theme';
import { surfaces } from './surfaces';

type AreaSectionProps = {
  readonly areaGroup: AreaGroup;
  readonly onSkipItem?: (name: string) => void;
  readonly onUnskipItem?: (name: string) => void;
  readonly onMarkAreaDone?: (area: string) => void;
  readonly onUndoArea?: (area: string) => void;
  readonly onSelectArea?: (area: string) => void;
  readonly onItemPress?: (name: string) => void;
  readonly onItemLongPress?: (name: string, area: string) => void;
  readonly onSetItemDecision?: (name: string, decision: SweepDecision) => void;
  readonly onStepItemTowardNeeded?: (name: string) => void;
  readonly onStepItemTowardNotNeeded?: (name: string) => void;
  readonly isCompleted?: boolean;
  readonly isActive?: boolean;
  readonly undecidedCount?: number;
};

const formatAreaHeading = (area: string, neededCount: number): string =>
  `${area} (${neededCount})`;

export const AreaSection = ({
  areaGroup,
  onMarkAreaDone,
  onUndoArea,
  onSelectArea,
  onItemPress,
  onItemLongPress,
  onSetItemDecision,
  onStepItemTowardNeeded,
  onStepItemTowardNotNeeded,
  isCompleted,
  isActive,
  undecidedCount = 0,
}: AreaSectionProps): React.JSX.Element => {
  const neededCount = areaGroup.items.filter((item) => item.needed).length;

  return (
    <View
      style={styles.card}
      testID={isActive ? `active-area-${areaGroup.area}` : undefined}
    >
      <View style={styles.header}>
        <Pressable
          onPress={
            onSelectArea ? () => onSelectArea(areaGroup.area) : undefined
          }
        >
          <Text style={styles.heading}>
            {formatAreaHeading(areaGroup.area, neededCount)}
          </Text>
        </Pressable>
        {undecidedCount > 0 && (
          <Text
            style={styles.undecidedCount}
            testID={`undecided-count-${areaGroup.area}`}
          >
            {`${undecidedCount} undecided`}
          </Text>
        )}
        {isCompleted && onUndoArea && (
          <Pressable
            style={styles.badge}
            testID={`badge-${areaGroup.area}`}
            onPress={() => onUndoArea(areaGroup.area)}
          >
            <Text style={styles.badgeText}>Undo</Text>
          </Pressable>
        )}
        {isCompleted && !onUndoArea && (
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
            onSetDecision={onSetItemDecision}
            onStepTowardNeeded={onStepItemTowardNeeded}
            onStepTowardNotNeeded={onStepItemTowardNotNeeded}
          />
        </View>
      ))}
      {onMarkAreaDone && !isCompleted && (
        <Pressable
          style={styles.doneButton}
          testID={`complete-${areaGroup.area}`}
          onPress={() => onMarkAreaDone(areaGroup.area)}
        >
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    ...surfaces.card,
    marginBottom: theme.space.md,
    padding: theme.space.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.space.sm,
  },
  heading: {
    fontSize: theme.font.size.lg,
    fontWeight: theme.font.weight.bold,
    color: theme.color.text,
  },
  undecidedCount: {
    fontSize: theme.font.size.sm,
    color: theme.color.textMuted,
  },
  badge: {
    backgroundColor: theme.color.inverse,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: theme.space.xs,
  },
  badgeText: {
    color: theme.color.inverseText,
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.bold,
  },
  separator: {
    height: 0,
  },
  skippedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.space.xs,
  },
  skippedName: {
    color: theme.color.textMuted,
    textDecorationLine: 'line-through',
    fontSize: theme.font.size.sm,
  },
  readdButton: {
    minHeight: theme.target.min,
    paddingHorizontal: theme.space.md,
    justifyContent: 'center',
  },
  readdText: {
    textDecorationLine: 'underline',
    color: theme.color.text,
    fontWeight: theme.font.weight.bold,
  },
  doneButton: {
    ...surfaces.darkButton,
    paddingVertical: 10,
    paddingHorizontal: theme.space.lg,
    alignItems: 'center',
    marginTop: theme.space.sm,
  },
  doneText: {
    color: theme.color.inverseText,
    fontWeight: theme.font.weight.bold,
    fontSize: theme.font.size.sm,
  },
});
