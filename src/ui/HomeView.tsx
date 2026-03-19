// HomeView - displays trip items grouped by house area
// Composes useTrip hook with groupByArea pure function

import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTrip } from '../hooks/useTrip';
import { useServices } from './ServiceProvider';
import { groupByArea } from '../domain/item-grouping';
import { HouseArea, StapleItem } from '../domain/types';
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

  const handleSelectSuggestion = useCallback((staple: StapleItem): void => {
    const alreadyInTrip = items.some(
      (item) => item.name === staple.name && item.houseArea === staple.houseArea
    );
    if (!alreadyInTrip) {
      addItem({
        name: staple.name,
        houseArea: staple.houseArea,
        storeLocation: staple.storeLocation,
        itemType: 'staple',
        source: 'quick-add',
      });
    }
  }, [items, addItem]);

  return (
    <ScrollView testID="home-scroll" style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
      <QuickAdd onAddItem={addItem} onSearch={stapleLibrary.search} onSelectSuggestion={handleSelectSuggestion} />
      <Text style={styles.sweepProgress}>{formatSweepProgress(sweepProgress.completedCount, sweepProgress.totalAreas)}</Text>
      {sweepProgress.allAreasComplete && (
        <Text style={styles.whiteboardPrompt}>Add from whiteboard</Text>
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  sweepProgress: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginVertical: 8,
  },
  whiteboardPrompt: {
    fontSize: 16,
    color: '#2196F3',
    textAlign: 'center',
    marginVertical: 8,
  },
});
