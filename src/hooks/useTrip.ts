// useTrip - hook bridging TripService to React state
// Reads items from context and exposes them as reactive state

import { useState, useEffect } from 'react';
import { TripItem } from '../domain/types';
import { useServices } from '../ui/ServiceProvider';

export type UseTripResult = {
  readonly items: TripItem[];
};

export const useTrip = (): UseTripResult => {
  const { tripService } = useServices();
  const [items] = useState<TripItem[]>(() => tripService.getItems());

  return { items };
};
