// useTrip - hook bridging TripService to React state
// Reads items from context and exposes them as reactive state

import { useState, useCallback } from 'react';
import { TripItem, AddTripItemRequest, AddTripItemResult } from '../domain/types';
import { useServices } from '../ui/ServiceProvider';

export type UseTripResult = {
  readonly items: TripItem[];
  readonly addItem: (request: AddTripItemRequest) => AddTripItemResult;
};

export const useTrip = (): UseTripResult => {
  const { tripService } = useServices();
  const [items, setItems] = useState<TripItem[]>(() => tripService.getItems());

  const addItem = useCallback(
    (request: AddTripItemRequest): AddTripItemResult => {
      const result = tripService.addItem(request);
      if (result.success) {
        setItems(tripService.getItems());
      }
      return result;
    },
    [tripService]
  );

  return { items, addItem };
};
