// HomeView - displays trip items grouped by house area
// Composes useTrip hook with groupByArea pure function

import React, { useState, useCallback } from 'react';
import { View, Text } from 'react-native';
import { useTrip } from '../hooks/useTrip';
import { useServices } from './ServiceProvider';
import { groupByArea } from '../domain/item-grouping';
import { HouseArea } from '../domain/types';
import { AreaSection } from './AreaSection';
import { QuickAdd } from './QuickAdd';

const formatSweepProgress = (completedCount: number, totalAreas: number): string =>
  `${completedCount} of ${totalAreas} areas complete`;

export const HomeView = (): React.JSX.Element => {
  const { items, addItem, skipItem, unskipItem, completeArea, sweepProgress } = useTrip();
  const { stapleLibrary } = useServices();
  const areaGroups = groupByArea(items);
  const [activeArea, setActiveArea] = useState<HouseArea | null>(null);

  const handleSelectArea = useCallback((area: string) => {
    setActiveArea(area as HouseArea);
  }, []);

  return (
    <View>
      <QuickAdd onAddItem={addItem} onSearch={stapleLibrary.search} />
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
          onSelectArea={handleSelectArea}
          isCompleted={sweepProgress.completedAreas.includes(areaGroup.area)}
          isActive={activeArea === areaGroup.area}
        />
      ))}
    </View>
  );
};
