// HomeView - displays trip items grouped by house area
// Composes useTrip hook with groupByArea pure function

import React from 'react';
import { View, Text } from 'react-native';
import { useTrip } from '../hooks/useTrip';
import { groupByArea } from '../domain/item-grouping';
import { AreaSection } from './AreaSection';
import { QuickAdd } from './QuickAdd';

const formatSweepProgress = (completedCount: number, totalAreas: number): string =>
  `${completedCount} of ${totalAreas} areas complete`;

export const HomeView = (): React.JSX.Element => {
  const { items, addItem, skipItem, unskipItem, completeArea, sweepProgress } = useTrip();
  const areaGroups = groupByArea(items);

  return (
    <View>
      <QuickAdd onAddItem={addItem} />
      <Text>{formatSweepProgress(sweepProgress.completedCount, sweepProgress.totalAreas)}</Text>
      {sweepProgress.allAreasComplete && (
        <Text>Add from whiteboard</Text>
      )}
      {areaGroups.map((areaGroup) => (
        <AreaSection
          key={areaGroup.area}
          areaGroup={areaGroup}
          onSkipItem={skipItem}
          onUnskipItem={unskipItem}
          onCompleteArea={completeArea}
          isCompleted={sweepProgress.completedAreas.includes(areaGroup.area)}
        />
      ))}
    </View>
  );
};
