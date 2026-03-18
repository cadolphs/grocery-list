// StoreView - displays trip items grouped by store aisle
// Composes useTrip hook with groupByAisle pure function

import React from 'react';
import { View } from 'react-native';
import { useTrip } from '../hooks/useTrip';
import { groupByAisle } from '../domain/item-grouping';
import { AisleSection } from './AisleSection';

export const StoreView = (): React.JSX.Element => {
  const { items, checkOff } = useTrip();
  const aisleGroups = groupByAisle(items);

  return (
    <View>
      {aisleGroups.map((aisleGroup) => (
        <AisleSection
          key={`${aisleGroup.aisleNumber}-${aisleGroup.section}`}
          aisleGroup={aisleGroup}
          onItemPress={checkOff}
        />
      ))}
    </View>
  );
};
