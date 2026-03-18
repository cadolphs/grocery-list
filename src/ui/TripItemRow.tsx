// TripItemRow - renders a single trip item
// Pure presentational component

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { TripItem } from '../domain/types';
import { ViewMode } from '../hooks/useViewMode';

type TripItemRowProps = {
  readonly item: TripItem;
  readonly mode: ViewMode;
  readonly onPress?: () => void;
  readonly onSkip?: () => void;
};

export const TripItemRow = ({ item, mode, onPress, onSkip }: TripItemRowProps): React.JSX.Element => (
  <View>
    <Pressable
      onPress={onPress}
      testID={item.checked ? `checked-${item.name}` : undefined}
    >
      <Text>{item.name}</Text>
    </Pressable>
    {mode === 'home' && onSkip && (
      <Pressable onPress={onSkip} testID={`skip-${item.name}`}>
        <Text>Skip</Text>
      </Pressable>
    )}
  </View>
);
