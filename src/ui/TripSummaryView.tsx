// TripSummaryView - displays trip completion summary
// Shows purchased count and carryover items

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { CompleteTripResult } from '../domain/trip';

type TripSummaryViewProps = {
  readonly result: CompleteTripResult;
  readonly prepTimeMinutes?: number;
  readonly onSwitchToStoreView?: () => void;
};

export const TripSummaryView = ({ result, prepTimeMinutes, onSwitchToStoreView }: TripSummaryViewProps): React.JSX.Element => {
  const stapleCount = result.purchasedStaples.length;
  const oneOffCount = result.purchasedOneOffs.length;
  const purchasedCount = stapleCount + oneOffCount;
  const carryoverItems = result.unboughtItems;

  return (
    <View>
      <Text>{purchasedCount} items purchased</Text>
      <Text>{stapleCount} staples</Text>
      {oneOffCount > 0 && <Text>{oneOffCount} one-offs</Text>}
      {prepTimeMinutes !== undefined && (
        <Text>{prepTimeMinutes} min</Text>
      )}
      {carryoverItems.length > 0 && (
        <View>
          <Text>Items that will carry over</Text>
          {carryoverItems.map((item) => (
            <Text key={item.id}>{item.name}</Text>
          ))}
        </View>
      )}
      {onSwitchToStoreView && (
        <Pressable onPress={onSwitchToStoreView}>
          <Text>Switch to Store View</Text>
        </Pressable>
      )}
    </View>
  );
};
