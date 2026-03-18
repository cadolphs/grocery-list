// HomeView - displays trip items grouped by house area
// Composes useTrip hook with groupByArea pure function

import React from 'react';
import { View } from 'react-native';
import { useTrip } from '../hooks/useTrip';
import { groupByArea } from '../domain/item-grouping';
import { AreaSection } from './AreaSection';

export const HomeView = (): React.JSX.Element => {
  const { items } = useTrip();
  const areaGroups = groupByArea(items);

  return (
    <View>
      {areaGroups.map((areaGroup) => (
        <AreaSection key={areaGroup.area} areaGroup={areaGroup} />
      ))}
    </View>
  );
};
