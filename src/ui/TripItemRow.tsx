// TripItemRow - renders a single trip item
// Pure presentational component

import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { TripItem } from '../domain/types';
import { ViewMode } from '../hooks/useViewMode';
import { useIsWeb } from '../hooks/useIsWeb';
import { theme } from './theme';

type TripItemRowProps = {
  readonly item: TripItem;
  readonly mode: ViewMode;
  readonly onPress?: () => void;
  readonly onSkip?: () => void;
  readonly onLongPress?: (name: string, area: string) => void;
};

export const TripItemRow = ({
  item,
  mode,
  onPress,
  onSkip,

  onLongPress,
}: TripItemRowProps): React.JSX.Element => {
  const isWeb = useIsWeb();

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
    <View style={styles.row}>
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
