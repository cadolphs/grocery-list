// TripItemRow - renders a single trip item
// Pure presentational component

import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { TripItem } from '../domain/types';
import { ViewMode } from '../hooks/useViewMode';

type TripItemRowProps = {
  readonly item: TripItem;
  readonly mode: ViewMode;
  readonly onPress?: () => void;
  readonly onSkip?: () => void;
  readonly onEditStaple?: (name: string, area: string) => void;
  readonly onLongPress?: (name: string, area: string) => void;
};

export const TripItemRow = ({ item, mode, onPress, onSkip, onEditStaple, onLongPress }: TripItemRowProps): React.JSX.Element => {
  const handleLongPress = (): void => {
    if ((mode === 'store' || mode === 'home') && item.itemType === 'staple' && onLongPress) {
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
      <Text style={[
        styles.itemName,
        item.checked && mode === 'store' && styles.checkedText,
        mode === 'home' && item.needed && styles.neededText,
        mode === 'home' && !item.needed && styles.skippedText,
      ]}>{item.name}</Text>
    </Pressable>
    {mode === 'store' && onSkip && (
      <Pressable style={styles.skipButton} onPress={onSkip} testID={`skip-${item.name}`}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>
    )}
  </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  itemPressable: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  itemName: {
    fontSize: 16,
    color: '#333333',
  },
  checkedText: {
    textDecorationLine: 'line-through',
    color: '#4CAF50',
  },
  neededText: {
    color: '#4CAF50',
  },
  skippedText: {
    color: '#999999',
    textDecorationLine: 'line-through',
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipText: {
    color: '#FF9800',
    fontWeight: '600',
  },
});
