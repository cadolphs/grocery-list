// TripSummaryView - displays trip completion summary
// Shows purchased count and carryover items

import React from 'react';
import { View, Text } from 'react-native';
import { CompleteTripResult } from '../domain/trip';

type TripSummaryViewProps = {
  readonly result: CompleteTripResult;
};

export const TripSummaryView = ({ result }: TripSummaryViewProps): React.JSX.Element => {
  const purchasedCount = result.purchasedStaples.length + result.purchasedOneOffs.length;
  const carryoverItems = result.unboughtItems;

  return (
    <View>
      <Text>{purchasedCount} items purchased</Text>
      {carryoverItems.length > 0 && (
        <View>
          <Text>Items that will carry over</Text>
          {carryoverItems.map((item) => (
            <Text key={item.id}>{item.name}</Text>
          ))}
        </View>
      )}
    </View>
  );
};
