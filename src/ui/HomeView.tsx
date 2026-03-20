// HomeView - displays trip items grouped by house area
// Composes useTrip hook with groupByArea pure function

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useTrip } from '../hooks/useTrip';
import { useServices } from './ServiceProvider';
import { groupByArea } from '../domain/item-grouping';
import { HouseArea, StapleItem, AddStapleRequest, AddTripItemRequest } from '../domain/types';
import { AreaSection } from './AreaSection';
import { QuickAdd } from './QuickAdd';
import { MetadataBottomSheet } from './MetadataBottomSheet';
import { AreaSettingsScreen } from './AreaSettingsScreen';

const DEFAULT_AREAS: readonly string[] = ['Bathroom', 'Garage Pantry', 'Kitchen Cabinets', 'Fridge', 'Freezer'];

type HomeViewProps = {
  readonly areas?: readonly string[];
};

const formatSweepProgress = (completedCount: number, totalAreas: number): string =>
  `${completedCount} of ${totalAreas} areas complete`;

export const HomeView = ({ areas = DEFAULT_AREAS }: HomeViewProps = {}): React.JSX.Element => {
  const { items, addItem, skipItem, unskipItem, completeArea, sweepProgress } = useTrip();
  const { stapleLibrary } = useServices();
  const areaGroups = groupByArea(items, areas);
  const existingSections = useMemo(
    () => [...new Set(stapleLibrary.listAll().map((s) => s.storeLocation.section))],
    [stapleLibrary],
  );
  const [activeArea, setActiveArea] = useState<HouseArea | null>(null);
  const [metadataSheetVisible, setMetadataSheetVisible] = useState(false);
  const [metadataSheetItemName, setMetadataSheetItemName] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const handleToggleSettings = useCallback(() => {
    setShowSettings((prev) => !prev);
  }, []);

  const handleSelectArea = useCallback((area: string) => {
    setActiveArea(area as HouseArea);
  }, []);

  const handleOpenMetadataSheet = useCallback((name: string) => {
    setMetadataSheetItemName(name);
    setMetadataSheetVisible(true);
  }, []);

  const handleDismissMetadataSheet = useCallback(() => {
    setMetadataSheetVisible(false);
    setMetadataSheetItemName('');
  }, []);

  const handleSubmitStaple = useCallback((request: AddStapleRequest): void => {
    stapleLibrary.addStaple(request);
  }, [stapleLibrary]);

  const handleSubmitTripItem = useCallback((request: AddTripItemRequest): void => {
    addItem(request);
  }, [addItem]);

  const handleFindDuplicate = useCallback((name: string, area: HouseArea) => {
    return stapleLibrary.listAll().find(
      (s) => s.name === name && s.houseArea === area,
    );
  }, [stapleLibrary]);

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

  if (showSettings) {
    return (
      <View style={styles.settingsContainer}>
        <View style={styles.settingsHeader}>
          <Pressable testID="settings-back-button" onPress={handleToggleSettings}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        </View>
        <AreaSettingsScreen />
      </View>
    );
  }

  return (
    <ScrollView testID="home-scroll" style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerRow}>
        <Pressable testID="settings-button" onPress={handleToggleSettings} style={styles.settingsButton}>
          <Text style={styles.settingsButtonText}>Settings</Text>
        </Pressable>
      </View>
      <QuickAdd onAddItem={addItem} onSearch={stapleLibrary.search} onSelectSuggestion={handleSelectSuggestion} onOpenMetadataSheet={handleOpenMetadataSheet} />
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
      <MetadataBottomSheet
        visible={metadataSheetVisible}
        itemName={metadataSheetItemName}
        defaultItemType={sweepProgress.allAreasComplete ? 'One-off' : 'Staple'}
        defaultArea={sweepProgress.allAreasComplete ? null : (activeArea ?? undefined)}
        areas={areas as HouseArea[]}
        existingSections={existingSections}
        onFindDuplicate={handleFindDuplicate}
        onDismiss={handleDismissMetadataSheet}
        onSubmitStaple={handleSubmitStaple}
        onSubmitTripItem={handleSubmitTripItem}
      />
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  settingsButton: {
    padding: 8,
  },
  settingsButtonText: {
    fontSize: 16,
    color: '#2196F3',
  },
  settingsContainer: {
    flex: 1,
  },
  settingsHeader: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 0,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2196F3',
  },
  sweepProgress: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginVertical: 8,
  },
  whiteboardPrompt: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9800',
    textAlign: 'center',
    marginVertical: 8,
  },
});
