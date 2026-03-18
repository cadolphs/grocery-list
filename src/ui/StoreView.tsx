// StoreView - displays trip items grouped by store aisle
// Composes useTrip hook with groupByAisle pure function

import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTrip } from '../hooks/useTrip';
import { useServices } from './ServiceProvider';
import { groupByAisle } from '../domain/item-grouping';
import { completeTrip, CompleteTripResult } from '../domain/trip';
import { AisleSection } from './AisleSection';
import { TripSummaryView } from './TripSummaryView';

export const StoreView = (): React.JSX.Element => {
  const { items, checkOff } = useTrip();
  const { tripService, stapleLibrary } = useServices();
  const [tripResult, setTripResult] = useState<CompleteTripResult | null>(null);

  const handleFinishTrip = (): void => {
    const result = completeTrip(tripService, stapleLibrary);
    setTripResult(result);
  };

  if (tripResult !== null) {
    return <TripSummaryView result={tripResult} />;
  }

  const aisleGroups = groupByAisle(items);

  return (
    <View>
      {aisleGroups.map((aisleGroup) => (
        <AisleSection
          key={`${aisleGroup.aisleNumber}-${aisleGroup.section}`}
          aisleGroup={aisleGroup}
          onItemPress={checkOff}
        />
      ))}
      <Pressable onPress={handleFinishTrip}>
        <Text>Finish Trip</Text>
      </Pressable>
    </View>
  );
};
