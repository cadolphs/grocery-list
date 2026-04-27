// SectionOrderSettingsScreen - manage store section ordering
// Shows known section names with up/down reorder buttons and reset-to-default

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useServices } from './ServiceProvider';
import { useSectionOrder } from '../hooks/useSectionOrder';
import { appendNewSections } from '../domain/section-ordering';
import { theme } from './theme';

const moveItem = <T,>(items: readonly T[], fromIndex: number, toIndex: number): T[] => {
  const result = [...items];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result;
};

const dedupeInOrder = (values: readonly string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  }
  return result;
};

export const SectionOrderSettingsScreen = (): React.JSX.Element => {
  const { stapleLibrary } = useServices();
  const { order, reorder, reset } = useSectionOrder();
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);

  // Subscribe to staple-library mutations so knownSectionNames re-derives when
  // a staple introducing a new section is added while this screen is mounted.
  // Version counter drives re-render without caching the (mutable) listAll array.
  const [stapleRevision, setStapleRevision] = useState(0);
  useEffect(() => {
    const unsubscribe = stapleLibrary.subscribe(() => {
      setStapleRevision((previous) => previous + 1);
    });
    return unsubscribe;
  }, [stapleLibrary]);

  const knownSectionNames = useMemo(
    () => dedupeInOrder(stapleLibrary.listAll().map((staple) => staple.storeLocation.section)),
    // stapleRevision participates in the dep list so mutations invalidate this memo.
    [stapleLibrary, stapleRevision],
  );

  const orderedSectionNames: string[] = useMemo(() => {
    if (order !== null) {
      return appendNewSections(order, knownSectionNames);
    }
    return knownSectionNames;
  }, [order, knownSectionNames]);

  const moveSection = useCallback(
    (fromIndex: number, toIndex: number) => {
      reorder(moveItem(orderedSectionNames, fromIndex, toIndex));
    },
    [orderedSectionNames, reorder],
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      moveSection(index, index - 1);
    },
    [moveSection],
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= orderedSectionNames.length - 1) return;
      moveSection(index, index + 1);
    },
    [orderedSectionNames.length, moveSection],
  );

  const handleReset = useCallback(() => {
    reset();
    setShowResetConfirmation(false);
  }, [reset]);

  return (
    <ScrollView testID="section-order-settings-scroll" style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.header}>Store Section Order</Text>
      {orderedSectionNames.map((sectionName, index) => (
        <View key={sectionName} testID={`section-row-${sectionName}`} style={styles.sectionCard}>
          <Text style={styles.sectionName}>{sectionName}</Text>
          <View style={styles.rowActions}>
            {index > 0 && (
              <Pressable testID={`move-up-${sectionName}`} onPress={() => handleMoveUp(index)}>
                <Text style={styles.actionText}>Up</Text>
              </Pressable>
            )}
            {index < orderedSectionNames.length - 1 && (
              <Pressable testID={`move-down-${sectionName}`} onPress={() => handleMoveDown(index)}>
                <Text style={styles.actionText}>Down</Text>
              </Pressable>
            )}
          </View>
        </View>
      ))}
      <Pressable style={styles.resetButton} onPress={() => setShowResetConfirmation(true)}>
        <Text style={styles.resetButtonText}>Reset to Default Order</Text>
      </Pressable>
      {showResetConfirmation && (
        <View style={styles.confirmationDialog}>
          <Text style={styles.confirmationText}>Reset sections to default order?</Text>
          <View style={styles.confirmationButtons}>
            <Pressable testID="confirm-reset-section-order" style={styles.confirmButton} onPress={handleReset}>
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </Pressable>
            <Pressable style={styles.cancelButton} onPress={() => setShowResetConfirmation(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}
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
  header: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.color.text,
    marginBottom: 16,
  },
  sectionCard: {
    backgroundColor: theme.color.tile,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionName: {
    fontSize: 16,
    color: theme.color.text,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionText: {
    color: theme.color.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: theme.color.accentDark,
    borderRadius: theme.radius.md,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  resetButtonText: {
    color: theme.color.inverseText,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmationDialog: {
    backgroundColor: theme.color.tileAlt,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginTop: 8,
  },
  confirmationText: {
    fontSize: 16,
    color: theme.color.text,
    marginBottom: 12,
  },
  confirmationButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmButton: {
    backgroundColor: theme.color.accentDark,
    borderRadius: theme.radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  confirmButtonText: {
    color: theme.color.inverseText,
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: theme.color.tileAlt,
    borderRadius: theme.radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelButtonText: {
    color: theme.color.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
