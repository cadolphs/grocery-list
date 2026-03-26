// StoreView - displays trip items grouped by store aisle
// Composes useTrip hook with groupByAisle pure function

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTrip } from '../hooks/useTrip';
import { useAreas } from '../hooks/useAreas';
import { useSectionOrder } from '../hooks/useSectionOrder';
import { useServices } from './ServiceProvider';
import { groupByAisle } from '../domain/item-grouping';
import { sortByCustomOrder } from '../domain/section-ordering';
import { CompleteTripResult } from '../domain/trip';
import { HouseArea, StapleItem, AddStapleRequest, AddTripItemRequest } from '../domain/types';
import { AisleSection } from './AisleSection';
import { TripSummaryView } from './TripSummaryView';
import { QuickAdd } from './QuickAdd';
import { MetadataBottomSheet } from './MetadataBottomSheet';

export const StoreView = (): React.JSX.Element => {
  const { items, addItem, toggleCheckOff, syncStapleUpdate } = useTrip();
  const { tripService, stapleLibrary } = useServices();
  const { areas } = useAreas();
  const { order: sectionOrder } = useSectionOrder();
  const [tripResult, setTripResult] = useState<CompleteTripResult | null>(null);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<number | undefined>(undefined);
  const [showSummary, setShowSummary] = useState(true);
  const [metadataSheetVisible, setMetadataSheetVisible] = useState(false);
  const [metadataSheetItemName, setMetadataSheetItemName] = useState('');
  const [editStapleId, setEditStapleId] = useState<string | null>(null);
  const [editStapleName, setEditStapleName] = useState<string>('');
  const [editInitialValues, setEditInitialValues] = useState<{ houseArea: HouseArea; section: string; aisleNumber: number | null } | null>(null);
  const existingSections = useMemo(
    () => [...new Set(stapleLibrary.listAll().map((s) => s.storeLocation.section))],
    [stapleLibrary],
  );

  const handleFinishTrip = (): void => {
    const summary = tripService.getSummary();
    setPrepTimeMinutes(summary.prepTimeMinutes);
    const result = tripService.complete();
    setTripResult(result);
    setShowSummary(true);
  };

  const handleSwitchToStoreView = (): void => {
    setShowSummary(false);
  };

  const handleOpenMetadataSheet = useCallback((name: string) => {
    setMetadataSheetItemName(name);
    setMetadataSheetVisible(true);
  }, []);

  const handleEditStaple = useCallback((name: string, area: string) => {
    const staple = stapleLibrary.listAll().find((s) => s.name === name && s.houseArea === area);
    if (!staple) return;
    setEditStapleId(staple.id);
    setEditStapleName(staple.name);
    setEditInitialValues({
      houseArea: staple.houseArea,
      section: staple.storeLocation.section,
      aisleNumber: staple.storeLocation.aisleNumber,
    });
    setMetadataSheetItemName(staple.name);
    setMetadataSheetVisible(true);
  }, [stapleLibrary]);

  const handleDismissMetadataSheet = useCallback(() => {
    setMetadataSheetVisible(false);
    setMetadataSheetItemName('');
    setEditStapleId(null);
    setEditStapleName('');
    setEditInitialValues(null);
  }, []);

  const handleSubmitStaple = useCallback((request: AddStapleRequest): void => {
    stapleLibrary.addStaple(request);
  }, [stapleLibrary]);

  const handleSubmitTripItem = useCallback((request: AddTripItemRequest): void => {
    addItem(request);
  }, [addItem]);

  const handleSaveEdit = useCallback((stapleId: string, changes: { houseArea?: HouseArea; storeLocation?: { section: string; aisleNumber: number | null } }) => {
    stapleLibrary.updateStaple(stapleId, changes);
    syncStapleUpdate(stapleId, changes);
  }, [stapleLibrary, syncStapleUpdate]);

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

  if (tripResult !== null && showSummary) {
    return (
      <TripSummaryView
        result={tripResult}
        prepTimeMinutes={prepTimeMinutes}
        onSwitchToStoreView={handleSwitchToStoreView}
      />
    );
  }

  const neededItems = items.filter((item) => item.needed);
  const aisleGroups = sortByCustomOrder(groupByAisle(neededItems), sectionOrder);

  return (
    <ScrollView testID="store-scroll" style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
      <QuickAdd onAddItem={addItem} onSearch={stapleLibrary.search} onSelectSuggestion={handleSelectSuggestion} onOpenMetadataSheet={handleOpenMetadataSheet} />
      {aisleGroups.map((aisleGroup) => (
        <AisleSection
          key={`${aisleGroup.aisleNumber}-${aisleGroup.section}`}
          aisleGroup={aisleGroup}
          onItemPress={toggleCheckOff}
          onItemLongPress={handleEditStaple}
        />
      ))}
      <Pressable style={styles.finishButton} onPress={handleFinishTrip}>
        <Text style={styles.finishButtonText}>Finish Trip</Text>
      </Pressable>
      <MetadataBottomSheet
        visible={metadataSheetVisible}
        itemName={metadataSheetItemName}
        mode={editStapleId ? 'edit' : 'add'}
        editStapleId={editStapleId}
        initialValues={editInitialValues}
        defaultItemType="One-off"
        defaultArea={null}
        areas={areas as HouseArea[]}
        existingSections={existingSections}
        onDismiss={handleDismissMetadataSheet}
        onSubmitStaple={handleSubmitStaple}
        onSubmitTripItem={handleSubmitTripItem}
        onSaveEdit={handleSaveEdit}
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
  finishButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    minHeight: 44,
  },
  finishButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
