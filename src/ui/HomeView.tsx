// HomeView - displays trip items grouped by house area
// Composes useTrip hook with groupByArea pure function

import React from 'react';
import { View } from 'react-native';
import { useTrip } from '../hooks/useTrip';
import { groupByArea } from '../domain/item-grouping';
import { AreaSection } from './AreaSection';
import { QuickAdd } from './QuickAdd';

export const HomeView = (): React.JSX.Element => {
  const { items, addItem, skipItem } = useTrip();
  const areaGroups = groupByArea(items);

  return (
    <View>
      <QuickAdd onAddItem={addItem} />
      {areaGroups.map((areaGroup) => (
        <AreaSection
          key={areaGroup.area}
          areaGroup={areaGroup}
          onSkipItem={skipItem}
        />
      ))}
    </View>
  );
};
