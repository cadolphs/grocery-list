// AreaSection - renders a house area heading with its trip items
// Pure presentational component

import React from 'react';
import { View, Text } from 'react-native';
import { AreaGroup } from '../domain/item-grouping';
import { TripItemRow } from './TripItemRow';

type AreaSectionProps = {
  readonly areaGroup: AreaGroup;
  readonly onSkipItem?: (name: string) => void;
};

const formatAreaHeading = (area: string, neededCount: number): string =>
  `${area} (${neededCount})`;

export const AreaSection = ({ areaGroup, onSkipItem }: AreaSectionProps): React.JSX.Element | null => {
  const neededItems = areaGroup.items.filter((item) => item.needed);

  if (neededItems.length === 0) {
    return null;
  }

  return (
    <View>
      <Text>{formatAreaHeading(areaGroup.area, neededItems.length)}</Text>
      {neededItems.map((item) => (
        <TripItemRow
          key={item.id}
          item={item}
          mode="home"
          onSkip={onSkipItem ? () => onSkipItem(item.name) : undefined}
        />
      ))}
    </View>
  );
};
