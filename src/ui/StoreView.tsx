// StoreView - displays trip items grouped by store aisle
// Composes useTrip hook with groupByAisle pure function

import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTrip } from '../hooks/useTrip';
import { useSectionOrder } from '../hooks/useSectionOrder';
import { useServices } from './ServiceProvider';
import { groupByAisle } from '../domain/item-grouping';
import { sortByCustomOrder } from '../domain/section-ordering';
import { CompleteTripResult } from '../domain/trip';
import { AisleSection } from './AisleSection';
import { TripSummaryView } from './TripSummaryView';

export const StoreView = (): React.JSX.Element => {
  const { items, toggleCheckOff } = useTrip();
  const { tripService } = useServices();
  const { order: sectionOrder } = useSectionOrder();
  const [tripResult, setTripResult] = useState<CompleteTripResult | null>(null);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<number | undefined>(undefined);
  const [showSummary, setShowSummary] = useState(true);

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
      {aisleGroups.map((aisleGroup) => (
        <AisleSection
          key={`${aisleGroup.aisleNumber}-${aisleGroup.section}`}
          aisleGroup={aisleGroup}
          onItemPress={toggleCheckOff}
        />
      ))}
      <Pressable style={styles.finishButton} onPress={handleFinishTrip}>
        <Text style={styles.finishButtonText}>Finish Trip</Text>
      </Pressable>
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
