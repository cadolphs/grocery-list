// TripItemRow - renders a single trip item
// Pure presentational component

import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { SweepDecision, TripItem } from '../domain/types';
import { ViewMode } from '../hooks/useViewMode';
import { useIsWeb } from '../hooks/useIsWeb';
import { theme } from './theme';

type TripItemRowProps = {
  readonly item: TripItem;
  readonly mode: ViewMode;
  readonly onPress?: () => void;
  readonly onSkip?: () => void;
  readonly onLongPress?: (name: string, area: string) => void;
  // Sweep rows only (#93): web shows ✓ / ✗ buttons that set the decision.
  readonly onSetDecision?: (name: string, decision: SweepDecision) => void;
};

// A staple on the Home sweep shows its decision: Undecided, Needed or
// Not needed (ADR-013). Each state has its own look and test ID.
const sweepRowStyle = {
  undecided: 'rowUndecided',
  needed: 'rowNeeded',
  'not-needed': 'rowNotNeeded',
} as const satisfies Record<SweepDecision, string>;

export const TripItemRow = ({
  item,
  mode,
  onPress,
  onSkip,
  onLongPress,
  onSetDecision,
}: TripItemRowProps): React.JSX.Element => {
  const isWeb = useIsWeb();
  const isSweepRow = mode === 'home' && item.itemType === 'staple';

  const canEdit =
    (mode === 'store' || mode === 'home') &&
    item.itemType === 'staple' &&
    !!onLongPress;

  const handleLongPress = (): void => {
    if (canEdit && onLongPress) {
      onLongPress(item.name, item.houseArea);
    }
  };

  const handleEditPress = (): void => {
    if (onLongPress) {
      onLongPress(item.name, item.houseArea);
    }
  };

  const handlePress = (): void => {
    if (onPress) {
      onPress();
    }
  };

  return (
    <View
      style={[styles.row, isSweepRow && styles[sweepRowStyle[item.decision]]]}
      testID={
        isSweepRow ? `sweep-row-${item.decision}-${item.name}` : undefined
      }
    >
      <Pressable
        style={styles.itemPressable}
        onPress={handlePress}
        onLongPress={handleLongPress}
        testID={item.checked ? `checked-${item.name}` : undefined}
      >
        <Text
          style={[
            styles.itemName,
            item.checked && mode === 'store' && styles.checkedText,
            mode === 'home' && item.needed && styles.neededText,
            mode === 'home' && !item.needed && styles.skippedText,
            isSweepRow && item.decision === 'undecided' && styles.undecidedText,
          ]}
        >
          {item.name}
        </Text>
      </Pressable>
      {mode === 'store' && onSkip && (
        <Pressable
          style={styles.skipButton}
          onPress={onSkip}
          testID={`skip-${item.name}`}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      )}
      {isWeb && isSweepRow && onSetDecision && (
        <>
          <Pressable
            style={[
              styles.decisionButton,
              item.decision === 'needed' && styles.decisionButtonOn,
            ]}
            onPress={() => onSetDecision(item.name, 'needed')}
            testID={`mark-needed-${item.name}`}
            accessibilityLabel={`Mark ${item.name} needed`}
            accessibilityState={{ selected: item.decision === 'needed' }}
          >
            <Text style={styles.decisionIcon}>{'\u2713'}</Text>
          </Pressable>
          <Pressable
            style={[
              styles.decisionButton,
              item.decision === 'not-needed' && styles.decisionButtonOn,
            ]}
            onPress={() => onSetDecision(item.name, 'not-needed')}
            testID={`mark-not-needed-${item.name}`}
            accessibilityLabel={`Mark ${item.name} not needed`}
            accessibilityState={{ selected: item.decision === 'not-needed' }}
          >
            <Text style={styles.decisionIcon}>{'\u2717'}</Text>
          </Pressable>
        </>
      )}
      {isWeb && canEdit && (
        <Pressable
          style={styles.editButton}
          onPress={handleEditPress}
          testID={`edit-button-${item.name}`}
          accessibilityLabel={`Edit ${item.name}`}
        >
          <Text style={styles.editIcon}>{'\u270E'}</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.target.min,
  },
  // Undecided is still to look at: highlighted. Needed carries an ink bar.
  // Not needed is plain, its name struck through (skippedText).
  rowUndecided: {
    backgroundColor: theme.color.accentSoft,
    paddingLeft: theme.space.md,
  },
  rowNeeded: {
    borderLeftWidth: theme.space.xs,
    borderLeftColor: theme.color.border,
    paddingLeft: theme.space.sm,
  },
  rowNotNeeded: {
    paddingLeft: theme.space.md,
  },
  undecidedText: {
    color: theme.color.text,
    textDecorationLine: 'none',
  },
  decisionButton: {
    minHeight: theme.target.min,
    minWidth: theme.target.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decisionButtonOn: {
    backgroundColor: theme.color.accent,
  },
  decisionIcon: {
    fontSize: theme.font.size.lg,
    fontWeight: theme.font.weight.bold,
    color: theme.color.text,
  },
  itemPressable: {
    flex: 1,
    justifyContent: 'center',
    minHeight: theme.target.min,
  },
  itemName: {
    fontSize: theme.font.size.md,
    color: theme.color.text,
  },
  checkedText: {
    textDecorationLine: 'line-through',
    color: theme.color.textMuted,
  },
  neededText: {
    color: theme.color.text,
  },
  skippedText: {
    color: theme.color.textMuted,
    textDecorationLine: 'line-through',
  },
  skipButton: {
    paddingVertical: theme.space.sm,
    paddingHorizontal: theme.space.md,
  },
  skipText: {
    color: theme.color.textMuted,
    fontWeight: theme.font.weight.bold,
  },
  editButton: {
    minHeight: theme.target.min,
    minWidth: theme.target.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIcon: {
    fontSize: theme.font.size.lg,
    color: theme.color.textMuted,
  },
});
