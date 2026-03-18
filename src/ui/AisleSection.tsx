// AisleSection - renders an aisle heading with its trip items
// Pure presentational component

import React from 'react';
import { View, Text } from 'react-native';
import { AisleGroup } from '../domain/item-grouping';
import { TripItemRow } from './TripItemRow';

type AisleSectionProps = {
  readonly aisleGroup: AisleGroup;
};

const formatAisleHeading = (aisleGroup: AisleGroup): string =>
  aisleGroup.aisleNumber !== null
    ? `Aisle ${aisleGroup.aisleNumber}: ${aisleGroup.section}`
    : aisleGroup.section;

export const AisleSection = ({ aisleGroup }: AisleSectionProps): React.JSX.Element => (
  <View>
    <Text>{formatAisleHeading(aisleGroup)}</Text>
    {aisleGroup.items.map((item) => (
      <TripItemRow key={item.id} item={item} mode="store" />
    ))}
  </View>
);
