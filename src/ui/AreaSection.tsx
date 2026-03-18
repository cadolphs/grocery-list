// AreaSection - renders a house area heading with its trip items
// Pure presentational component

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { AreaGroup } from '../domain/item-grouping';
import { TripItemRow } from './TripItemRow';

type AreaSectionProps = {
  readonly areaGroup: AreaGroup;
  readonly onSkipItem?: (name: string) => void;
  readonly onUnskipItem?: (name: string) => void;
};

const formatAreaHeading = (area: string, neededCount: number): string =>
  `${area} (${neededCount})`;

export const AreaSection = ({ areaGroup, onSkipItem, onUnskipItem }: AreaSectionProps): React.JSX.Element | null => {
  const neededItems = areaGroup.items.filter((item) => item.needed);
  const skippedItems = areaGroup.items.filter((item) => !item.needed);

  if (neededItems.length === 0 && skippedItems.length === 0) {
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
      {skippedItems.map((item) => (
        <View key={item.id}>
          <Pressable
            testID={`readd-${item.name}`}
            onPress={onUnskipItem ? () => onUnskipItem(item.name) : undefined}
          >
            <Text>Re-add</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
};
