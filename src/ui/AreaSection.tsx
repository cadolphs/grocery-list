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
  readonly onCompleteArea?: (area: string) => void;
  readonly onSelectArea?: (area: string) => void;
  readonly isCompleted?: boolean;
  readonly isActive?: boolean;
};

const formatAreaHeading = (area: string, neededCount: number): string =>
  `${area} (${neededCount})`;

export const AreaSection = ({ areaGroup, onSkipItem, onUnskipItem, onCompleteArea, onSelectArea, isCompleted, isActive }: AreaSectionProps): React.JSX.Element => {
  const neededItems = areaGroup.items.filter((item) => item.needed);
  const skippedItems = areaGroup.items.filter((item) => !item.needed);

  return (
    <View testID={isActive ? `active-area-${areaGroup.area}` : undefined}>
      <Pressable onPress={onSelectArea ? () => onSelectArea(areaGroup.area) : undefined}>
        <Text>{formatAreaHeading(areaGroup.area, neededItems.length)}</Text>
      </Pressable>
      {isCompleted && (
        <View testID={`badge-${areaGroup.area}`}>
          <Text>Complete</Text>
        </View>
      )}
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
      {onCompleteArea && !isCompleted && (
        <Pressable
          testID={`complete-${areaGroup.area}`}
          onPress={() => onCompleteArea(areaGroup.area)}
        >
          <Text>Done</Text>
        </Pressable>
      )}
    </View>
  );
};
