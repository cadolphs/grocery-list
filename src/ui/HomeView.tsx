// HomeView - displays trip items grouped by house area
// Composes useTrip hook with groupByArea pure function

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  type ScrollViewInstance,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useTrip } from '../hooks/useTrip';
import { useAreas } from '../hooks/useAreas';
import { useServices } from './ServiceProvider';
import { groupByArea, getOneOffItems, isNeeded } from '../domain/item-grouping';
import { matchesStapleIdentity, neededStapleIds } from '../domain/trip';
import {
  HouseArea,
  StapleItem,
  AddOneOffRequest,
  AddTripItemRequest,
} from '../domain/types';
import { AreaSection } from './AreaSection';
import { TripItemRow } from './TripItemRow';
import { QuickAdd } from './QuickAdd';
import { MetadataBottomSheet } from './MetadataBottomSheet';
import { StapleChecklist } from './StapleChecklist';
import { AreaSettingsScreen } from './AreaSettingsScreen';
import { SectionOrderSettingsScreen } from './SectionOrderSettingsScreen';
import { useStaples } from '../hooks/useStaples';
import { theme } from './theme';
import { surfaces, linkHit } from './surfaces';

type SettingsView = 'menu' | 'areas' | 'section-order';
type HomeMode = 'sweep' | 'checklist';

const formatSweepProgress = (
  completedCount: number,
  totalAreas: number,
): string => `${completedCount} of ${totalAreas} areas complete`;

export const HomeView = (): React.JSX.Element => {
  const { areas } = useAreas();
  const {
    items,
    addItem,
    setDecision,
    stepTowardNeeded,
    stepTowardNotNeeded,
    addStapleAsNeeded,
    markAreaDone,
    undoArea,
    resetSweep,
    syncStapleUpdate,
    sweepProgress,
  } = useTrip();
  const [homeMode, setHomeMode] = useState<HomeMode>('sweep');
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const { stapleLibrary } = useServices();
  const areaGroups = groupByArea(items, areas);
  const oneOffItems = getOneOffItems(items);

  // Subscribe to staple-library mutations so derived data (allStaples,
  // checklistStaples, existingSections) refreshes on every add/update/remove.
  // Mirrors the reactive pattern in SectionOrderSettingsScreen.
  const allStaples = useStaples(stapleLibrary);

  const checklistStaples = useMemo(
    () => allStaples.filter((s) => s.type === 'staple'),
    [allStaples],
  );
  const existingSections = useMemo(
    () => [...new Set(allStaples.map((s) => s.storeLocation.section))],
    [allStaples],
  );
  const checklistNeededIds = useMemo(
    () => neededStapleIds(checklistStaples, items),
    [checklistStaples, items],
  );
  const [activeArea, setActiveArea] = useState<HouseArea | null>(null);
  const [metadataSheetVisible, setMetadataSheetVisible] = useState(false);
  const [metadataSheetItemName, setMetadataSheetItemName] = useState('');
  const [editStapleId, setEditStapleId] = useState<string | null>(null);
  const [editInitialValues, setEditInitialValues] = useState<{
    houseArea: HouseArea;
    section: string;
    aisleNumber: number | null;
  } | null>(null);
  const [settingsView, setSettingsView] = useState<SettingsView | null>(null);
  const scrollViewRef = useRef<ScrollViewInstance>(null);

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

  const handleEditStaple = useCallback(
    (name: string, area: string) => {
      const staple = stapleLibrary
        .listAll()
        .find((s) => s.name === name && s.houseArea === area);
      if (!staple) return;
      setEditStapleId(staple.id);
      setEditInitialValues({
        houseArea: staple.houseArea,
        section: staple.storeLocation.section,
        aisleNumber: staple.storeLocation.aisleNumber,
      });
      setMetadataSheetItemName(staple.name);
      setMetadataSheetVisible(true);
    },
    [stapleLibrary],
  );

  const handleDismissMetadataSheet = useCallback(() => {
    setMetadataSheetVisible(false);
    setMetadataSheetItemName('');
    setEditStapleId(null);
    setEditInitialValues(null);
  }, []);

  const handleSubmitOneOff = useCallback(
    (request: AddOneOffRequest): void => {
      stapleLibrary.addOneOff(request);
    },
    [stapleLibrary],
  );

  const handleSubmitTripItem = useCallback(
    (request: AddTripItemRequest): void => {
      addItem(request);
    },
    [addItem],
  );

  const handleSaveEdit = useCallback(
    (
      stapleId: string,
      changes: {
        houseArea?: HouseArea;
        storeLocation?: { section: string; aisleNumber: number | null };
      },
    ) => {
      stapleLibrary.updateStaple(stapleId, changes);
      syncStapleUpdate(stapleId, changes);
    },
    [stapleLibrary, syncStapleUpdate],
  );

  const handleDeleteStaple = useCallback(
    (stapleId: string) => {
      // Trip cleanup flows through stapleLibrary.subscribe -> handleStapleChange
      // (wired in useAppInitialization, step 01-02). Removing the dual-write
      // here is intentional — it was redundant and masked the stapleId-null
      // fallback path delivered in step 01-01.
      stapleLibrary.remove(stapleId);
    },
    [stapleLibrary],
  );

  const handleQuickAddSearch = useCallback(
    (query: string): StapleItem[] => {
      return stapleLibrary.search(query).filter((s) => s.type === 'one-off');
    },
    [stapleLibrary],
  );

  const handleFindDuplicate = useCallback(
    (name: string, area: HouseArea) => {
      return stapleLibrary
        .listAll()
        .find((s) => s.name === name && s.houseArea === area);
    },
    [stapleLibrary],
  );

  const handleAddFromChecklist = useCallback(
    (staple: StapleItem): void => {
      const existingItem = items.find(matchesStapleIdentity(staple));
      if (existingItem && !isNeeded(existingItem)) {
        setDecision(existingItem.id, 'needed');
      } else if (!existingItem) {
        addItem({
          name: staple.name,
          houseArea: staple.houseArea,
          storeLocation: staple.storeLocation,
          itemType: 'staple',
          source: 'whiteboard',
          stapleId: staple.id,
        });
      }
    },
    [items, addItem, setDecision],
  );

  // Unticks only this staple's own trip item: another staple with the same
  // name in a different house area keeps its decision (#104).
  const handleRemoveFromChecklist = useCallback(
    (staple: StapleItem): void => {
      items
        .filter(matchesStapleIdentity(staple))
        .forEach((i) => setDecision(i.id, 'not-needed'));
    },
    [items, setDecision],
  );

  const handleSelectSuggestion = useCallback(
    (staple: StapleItem): void => {
      const isOneOff = staple.type === 'one-off';
      const existing = isOneOff
        ? items.find(
            (item) => item.name === staple.name && item.itemType === 'one-off',
          )
        : items.find(
            (item) =>
              item.name === staple.name && item.houseArea === staple.houseArea,
          );
      // Same rule as StoreView.handleSelectSuggestion and
      // handleAddFromChecklist above: a row not yet Needed is set Needed, a
      // missing row is added, and a Needed row is left alone (no duplicate).
      if (existing && !isNeeded(existing)) {
        setDecision(existing.id, 'needed');
      } else if (!existing) {
        const houseArea =
          isOneOff && !staple.houseArea ? 'Kitchen Cabinets' : staple.houseArea;
        addItem({
          name: staple.name,
          houseArea,
          storeLocation: staple.storeLocation,
          itemType: isOneOff ? 'one-off' : 'staple',
          source: 'quick-add',
          stapleId: staple.id,
        });
      }
    },
    [items, addItem, setDecision],
  );

  if (settingsView === 'section-order') {
    return (
      <View style={styles.settingsContainer}>
        <View style={styles.settingsHeader}>
          <Pressable
            hitSlop={linkHit}
            testID="settings-back-button"
            onPress={() => setSettingsView('menu')}
          >
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
          <Pressable
            hitSlop={linkHit}
            testID="settings-back-button"
            onPress={handleToggleSettings}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        </View>
        <AreaSettingsScreen />
        <View style={styles.settingsMenuContainer}>
          <Pressable
            style={styles.settingsMenuItem}
            onPress={() => setSettingsView('section-order')}
          >
            <Text style={styles.settingsMenuItemText}>Section Order</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollViewRef}
      testID="home-scroll"
      style={styles.scrollView}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.headerRow}>
        <Pressable
          hitSlop={linkHit}
          testID="settings-button"
          onPress={handleToggleSettings}
          style={styles.settingsButton}
        >
          <Text style={styles.settingsButtonText}>Settings</Text>
        </Pressable>
      </View>
      <View style={styles.modeToggleRow}>
        <Pressable
          testID="home-mode-sweep"
          onPress={() => setHomeMode('sweep')}
          style={[
            styles.modeToggleButton,
            homeMode === 'sweep' && styles.modeToggleButtonActive,
          ]}
        >
          <Text
            style={[
              styles.modeToggleText,
              homeMode === 'sweep' && styles.modeToggleTextActive,
            ]}
          >
            Sweep
          </Text>
        </Pressable>
        <Pressable
          testID="home-mode-checklist"
          onPress={() => setHomeMode('checklist')}
          style={[
            styles.modeToggleButton,
            homeMode === 'checklist' && styles.modeToggleButtonActive,
          ]}
        >
          <Text
            style={[
              styles.modeToggleText,
              homeMode === 'checklist' && styles.modeToggleTextActive,
            ]}
          >
            Checklist
          </Text>
        </Pressable>
      </View>
      <QuickAdd
        onAddItem={addItem}
        onSearch={handleQuickAddSearch}
        onSelectSuggestion={handleSelectSuggestion}
        onOpenMetadataSheet={handleOpenMetadataSheet}
      />
      {homeMode === 'checklist' && (
        <StapleChecklist
          staples={checklistStaples}
          neededStapleIds={checklistNeededIds}
          onAddStaple={handleAddFromChecklist}
          onRemoveStaple={handleRemoveFromChecklist}
          onLongPress={handleEditStaple}
        />
      )}
      {homeMode === 'sweep' && (
        <>
          <Text style={styles.sweepProgress}>
            {formatSweepProgress(
              sweepProgress.completedCount,
              sweepProgress.totalAreas,
            )}
          </Text>
          {areaGroups.map((areaGroup) => (
            <AreaSection
              key={areaGroup.area}
              areaGroup={areaGroup}
              onItemLongPress={handleEditStaple}
              onSetItemDecision={setDecision}
              onStepItemTowardNeeded={stepTowardNeeded}
              onStepItemTowardNotNeeded={stepTowardNotNeeded}
              onMarkAreaDone={markAreaDone}
              onUndoArea={undoArea}
              onSelectArea={handleSelectArea}
              isActive={activeArea === areaGroup.area}
              undecidedCount={
                sweepProgress.undecidedCountByArea[areaGroup.area] ?? 0
              }
            />
          ))}
          {oneOffItems.length > 0 && (
            <View style={styles.oneOffsSection}>
              <Text style={styles.oneOffsHeading}>
                One-offs ({oneOffItems.length})
              </Text>
              {oneOffItems.map((item) => (
                <TripItemRow key={item.id} item={item} mode="home" />
              ))}
            </View>
          )}
          <Pressable
            testID="reset-sweep-button"
            onPress={() => {
              setShowResetConfirmation(true);
              setTimeout(
                () => scrollViewRef.current?.scrollToEnd({ animated: true }),
                100,
              );
            }}
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
        </>
      )}
      <MetadataBottomSheet
        visible={metadataSheetVisible}
        itemName={metadataSheetItemName}
        mode={editStapleId ? 'edit' : 'add'}
        editStapleId={editStapleId}
        initialValues={editInitialValues}
        defaultItemType={sweepProgress.allAreasComplete ? 'One-off' : 'Staple'}
        defaultArea={
          sweepProgress.allAreasComplete ? null : (activeArea ?? undefined)
        }
        areas={areas as HouseArea[]}
        existingSections={existingSections}
        onFindDuplicate={handleFindDuplicate}
        onDismiss={handleDismissMetadataSheet}
        onSubmitStaple={addStapleAsNeeded}
        onSubmitOneOff={handleSubmitOneOff}
        onSubmitTripItem={handleSubmitTripItem}
        onSaveEdit={handleSaveEdit}
        onDeleteStaple={handleDeleteStaple}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.space.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: theme.space.sm,
  },
  settingsButton: {
    padding: theme.space.sm,
  },
  modeToggleRow: {
    flexDirection: 'row',
    borderWidth: theme.border.width,
    borderColor: theme.color.border,
    marginBottom: theme.space.sm,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  modeToggleButton: {
    flex: 1,
    minHeight: theme.target.min,
    justifyContent: 'center',
    paddingVertical: theme.space.sm,
    alignItems: 'center',
    backgroundColor: theme.color.accentSoft,
  },
  modeToggleButtonActive: {
    backgroundColor: theme.color.inverse,
  },
  modeToggleText: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.bold,
    color: theme.color.text,
  },
  modeToggleTextActive: {
    color: theme.color.inverseText,
  },
  settingsButtonText: {
    textDecorationLine: 'underline',
    fontSize: theme.font.size.md,
    color: theme.color.text,
  },
  settingsContainer: {
    flex: 1,
  },
  settingsHeader: {
    flexDirection: 'row',
    padding: theme.space.lg,
    paddingBottom: 0,
  },
  backButtonText: {
    textDecorationLine: 'underline',
    fontSize: theme.font.size.md,
    color: theme.color.text,
  },
  sweepProgress: {
    fontSize: theme.font.size.sm,
    color: theme.color.textMuted,
    textAlign: 'center',
    marginVertical: theme.space.sm,
  },
  oneOffsSection: {
    ...surfaces.card,
    padding: theme.space.lg,
    marginTop: theme.space.sm,
  },
  oneOffsHeading: {
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.bold,
    color: theme.color.text,
    marginBottom: theme.space.xs,
  },
  resetSweepButton: {
    ...surfaces.dangerButton,
    padding: theme.space.md,
    marginTop: theme.space.lg,
    alignItems: 'center',
  },
  resetSweepButtonText: {
    color: theme.color.inverseText,
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.bold,
  },
  resetConfirmation: {
    ...surfaces.dialog,
    padding: theme.space.md,
    marginTop: theme.space.sm,
  },
  resetConfirmationText: {
    fontSize: theme.font.size.sm,
    color: theme.color.text,
    textAlign: 'center',
    marginBottom: theme.space.sm,
  },
  resetConfirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.space.md,
  },
  confirmButton: {
    ...surfaces.dangerButton,
    paddingVertical: theme.space.sm,
    paddingHorizontal: theme.space.lg,
  },
  confirmButtonText: {
    color: theme.color.inverseText,
    fontWeight: theme.font.weight.bold,
  },
  cancelButton: {
    ...surfaces.secondaryButton,
    paddingVertical: theme.space.sm,
    paddingHorizontal: theme.space.lg,
  },
  cancelButtonText: {
    color: theme.color.text,
    fontWeight: theme.font.weight.bold,
  },
  settingsMenuContainer: {
    padding: theme.space.lg,
  },
  settingsMenuItem: {
    ...surfaces.card,
    padding: theme.space.lg,
    marginBottom: theme.space.sm,
  },
  settingsMenuItemText: {
    fontSize: theme.font.size.md,
    color: theme.color.text,
    fontWeight: theme.font.weight.bold,
  },
});
