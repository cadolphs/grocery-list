// TripItemRow - renders a single trip item
// Pure presentational component

import React from 'react';
import { Pressable, Text } from 'react-native';
import { TripItem } from '../domain/types';
import { ViewMode } from '../hooks/useViewMode';

type TripItemRowProps = {
  readonly item: TripItem;
  readonly mode: ViewMode;
  readonly onPress?: () => void;
};

export const TripItemRow = ({ item, mode, onPress }: TripItemRowProps): React.JSX.Element => (
  <Pressable
    onPress={onPress}
    testID={item.checked ? `checked-${item.name}` : undefined}
  >
    <Text>{item.name}</Text>
  </Pressable>
);
