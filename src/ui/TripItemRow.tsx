// TripItemRow - renders a single trip item
// Pure presentational component

import React from 'react';
import { View, Text } from 'react-native';
import { TripItem } from '../domain/types';
import { ViewMode } from '../hooks/useViewMode';

type TripItemRowProps = {
  readonly item: TripItem;
  readonly mode: ViewMode;
};

export const TripItemRow = ({ item, mode }: TripItemRowProps): React.JSX.Element => (
  <View>
    <Text>{item.name}</Text>
  </View>
);
