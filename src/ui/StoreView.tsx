// StoreView - displays trip items grouped by store aisle
// Composes useTrip hook with groupByAisle pure function

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTrip } from '../hooks/useTrip';
import { useAreas } from '../hooks/useAreas';
import { useSectionOrder } from '../hooks/useSectionOrder';
import { useServices } from './ServiceProvider';
import { groupByAisle } from '../domain/item-grouping';
import { sortByCustomOrder, appendNewSections } from '../domain/section-ordering';
import { CompleteTripResult } from '../domain/trip';
import { HouseArea, StapleItem, AddStapleRequest, AddOneOffRequest, AddTripItemRequest } from '../domain/types';
import { AisleSection } from './AisleSection';
import { TripSummaryView } from './TripSummaryView';
import { QuickAdd } from './QuickAdd';
import { MetadataBottomSheet } from './MetadataBottomSheet';
import { theme } from './theme';

export const StoreView = (): React.JSX.Element => {
  const { items, addItem, toggleCheckOff, unskipItem, syncStapleUpdate } = useTrip();
  const { tripService, stapleLibrary } = useServices();
  const { areas } = useAreas();
  const { order: sectionOrder } = useSectionOrder();
  const [tripResult, setTripResult] = useState<CompleteTripResult | null>(null);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<number | undefined>(undefined);
  const [showSummary, setShowSummary] = useState(true);
  const [metadataSheetVisible, setMetadataSheetVisible] = useState(false);
  const [metadataSheetItemName, setMetadataSheetItemName] = useState('');
  const [editStapleId, setEditStapleId] = useState<string | null>(null);
  const [editInitialValues, setEditInitialValues] = useState<{ houseArea: HouseArea; section: string; aisleNumber: number | null } | null>(null);
  // Subscribe to staple-library mutations so existingSections re-derives when
  // a staple introducing a new section is added/edited while StoreView is
  // mounted. Mirrors SectionOrderSettingsScreen's reactive pattern.
  const [stapleRevision, setStapleRevision] = useState(0);
  useEffect(() => {
    const unsubscribe = stapleLibrary.subscribe(() => {
      setStapleRevision((previous) => previous + 1);
    });
    return unsubscribe;
  }, [stapleLibrary]);

  const existingSections = useMemo(
    () => [...new Set(stapleLibrary.listAll().map((s) => s.storeLocation.section))],
    [stapleLibrary, stapleRevision],
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
    setEditInitialValues(null);
  }, []);

  const handleSubmitStaple = useCallback((request: AddStapleRequest): void => {
    stapleLibrary.addStaple(request);
  }, [stapleLibrary]);

  const handleSubmitOneOff = useCallback((request: AddOneOffRequest): void => {
    stapleLibrary.addOneOff(request);
  }, [stapleLibrary]);

  const handleSubmitTripItem = useCallback((request: AddTripItemRequest): void => {
    addItem(request);
  }, [addItem]);

  const handleSaveEdit = useCallback((stapleId: string, changes: { houseArea?: HouseArea; storeLocation?: { section: string; aisleNumber: number | null } }) => {
    stapleLibrary.updateStaple(stapleId, changes);
    syncStapleUpdate(stapleId, changes);
  }, [stapleLibrary, syncStapleUpdate]);

  const handleSelectSuggestion = useCallback((staple: StapleItem): void => {
    const isOneOff = staple.type === 'one-off';
    const existing = isOneOff
      ? items.find((item) => item.name === staple.name && item.itemType === 'one-off')
      : items.find((item) => item.name === staple.name && item.houseArea === staple.houseArea);
    if (existing && !existing.needed) {
      unskipItem(existing.name);
    } else if (!existing) {
      const houseArea = isOneOff && !staple.houseArea ? 'Kitchen Cabinets' : staple.houseArea;
      addItem({
        name: staple.name,
        houseArea,
        storeLocation: staple.storeLocation,
        itemType: isOneOff ? 'one-off' : 'staple',
        source: 'quick-add',
        stapleId: staple.id,
      });
    }
  }, [items, addItem, unskipItem]);

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
  const groups = groupByAisle(neededItems);
  const knownKeys = groups.map((group) => `${group.section}::${group.aisleNumber}`);
  const effectiveOrder = sectionOrder !== null ? appendNewSections(sectionOrder, knownKeys) : null;
  const aisleGroups = sortByCustomOrder(groups, effectiveOrder);

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
        onSubmitOneOff={handleSubmitOneOff}
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
    backgroundColor: theme.color.inverse,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginTop: 16,
    minHeight: 44,
  },
  finishButtonText: {
    color: theme.color.inverseText,
    fontSize: 16,
    fontWeight: '600',
  },
});
