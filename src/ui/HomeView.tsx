// HomeView - displays trip items grouped by house area
// Composes useTrip hook with groupByArea pure function

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useTrip } from '../hooks/useTrip';
import { useAreas } from '../hooks/useAreas';
import { useServices } from './ServiceProvider';
import { groupByArea } from '../domain/item-grouping';
import { HouseArea, StapleItem, AddStapleRequest, AddTripItemRequest } from '../domain/types';
import { AreaSection } from './AreaSection';
import { QuickAdd } from './QuickAdd';
import { MetadataBottomSheet } from './MetadataBottomSheet';
import { AreaSettingsScreen } from './AreaSettingsScreen';
import { SectionOrderSettingsScreen } from './SectionOrderSettingsScreen';

type SettingsView = 'menu' | 'areas' | 'section-order';

const formatSweepProgress = (completedCount: number, totalAreas: number): string =>
  `${completedCount} of ${totalAreas} areas complete`;

export const HomeView = (): React.JSX.Element => {
  const { areas } = useAreas();
  const { items, addItem, skipItem, unskipItem, completeArea, uncompleteArea, resetSweep, syncStapleUpdate, sweepProgress } = useTrip();
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const { stapleLibrary } = useServices();
  const areaGroups = groupByArea(items, areas);
  const existingSections = useMemo(
    () => [...new Set(stapleLibrary.listAll().map((s) => s.storeLocation.section))],
    [stapleLibrary],
  );
  const [activeArea, setActiveArea] = useState<HouseArea | null>(null);
  const [metadataSheetVisible, setMetadataSheetVisible] = useState(false);
  const [metadataSheetItemName, setMetadataSheetItemName] = useState('');
  const [editStapleId, setEditStapleId] = useState<string | null>(null);
  const [editStapleName, setEditStapleName] = useState<string>('');
  const [editInitialValues, setEditInitialValues] = useState<{ houseArea: HouseArea; section: string; aisleNumber: number | null } | null>(null);
  const [settingsView, setSettingsView] = useState<SettingsView | null>(null);

  const handleToggleSettings = useCallback(() => {
    setSettingsView((prev) => (prev === null ? 'menu' : null));
  }, []);

  const handleSelectArea = useCallback((area: string) => {
    setActiveArea(area as HouseArea);
  }, []);

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

  if (settingsView === 'section-order') {
    return (
      <View style={styles.settingsContainer}>
        <View style={styles.settingsHeader}>
          <Pressable testID="settings-back-button" onPress={() => setSettingsView('menu')}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        </View>
        <SectionOrderSettingsScreen />
      </View>
    );
  }

  if (settingsView === 'menu') {
    return (
      <View style={styles.settingsContainer}>
        <View style={styles.settingsHeader}>
          <Pressable testID="settings-back-button" onPress={handleToggleSettings}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        </View>
        <AreaSettingsScreen />
        <View style={styles.settingsMenuContainer}>
          <Pressable style={styles.settingsMenuItem} onPress={() => setSettingsView('section-order')}>
            <Text style={styles.settingsMenuItemText}>Section Order</Text>
          </Pressable>
        </View>
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
          onUncompleteArea={uncompleteArea}
          onSelectArea={handleSelectArea}
          onEditStaple={handleEditStaple}
          isCompleted={sweepProgress.completedAreas.includes(areaGroup.area)}
          isActive={activeArea === areaGroup.area}
        />
      ))}
      <Pressable
        testID="reset-sweep-button"
        onPress={() => setShowResetConfirmation(true)}
        style={styles.resetSweepButton}
      >
        <Text style={styles.resetSweepButtonText}>Reset Sweep</Text>
      </Pressable>
      {showResetConfirmation && (
        <View style={styles.resetConfirmation}>
          <Text style={styles.resetConfirmationText}>
            Are you sure? This will reset all items and remove one-offs.
          </Text>
          <View style={styles.resetConfirmationButtons}>
            <Pressable
              testID="confirm-reset-sweep"
              onPress={() => {
                resetSweep();
                setShowResetConfirmation(false);
              }}
              style={styles.confirmButton}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </Pressable>
            <Pressable
              testID="cancel-reset-sweep"
              onPress={() => setShowResetConfirmation(false)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}
      <MetadataBottomSheet
        visible={metadataSheetVisible}
        itemName={metadataSheetItemName}
        mode={editStapleId ? 'edit' : 'add'}
        editStapleId={editStapleId}
        initialValues={editInitialValues}
        defaultItemType={sweepProgress.allAreasComplete ? 'One-off' : 'Staple'}
        defaultArea={sweepProgress.allAreasComplete ? null : (activeArea ?? undefined)}
        areas={areas as HouseArea[]}
        existingSections={existingSections}
        onFindDuplicate={handleFindDuplicate}
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
  resetSweepButton: {
    backgroundColor: '#FF5722',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  resetSweepButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resetConfirmation: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  resetConfirmationText: {
    fontSize: 14,
    color: '#E65100',
    textAlign: 'center',
    marginBottom: 8,
  },
  resetConfirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  confirmButton: {
    backgroundColor: '#FF5722',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    color: '#333333',
    fontWeight: '600',
  },
  settingsMenuContainer: {
    padding: 16,
  },
  settingsMenuHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 16,
  },
  settingsMenuItem: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingsMenuItemText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
});
