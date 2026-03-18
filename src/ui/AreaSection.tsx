// AreaSection - renders a house area heading with its trip items
// Pure presentational component

import React from 'react';
import { View, Text } from 'react-native';
import { AreaGroup } from '../domain/item-grouping';
import { TripItemRow } from './TripItemRow';

type AreaSectionProps = {
  readonly areaGroup: AreaGroup;
};

export const AreaSection = ({ areaGroup }: AreaSectionProps): React.JSX.Element | null => {
  if (areaGroup.items.length === 0) {
    return null;
  }

  return (
    <View>
      <Text>{areaGroup.area}</Text>
      {areaGroup.items.map((item) => (
        <TripItemRow key={item.id} item={item} mode="home" />
      ))}
    </View>
  );
};
