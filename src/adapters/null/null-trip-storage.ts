// Null adapter for TripStorage - in-memory implementation for testing

import { Trip } from '../../domain/types';
import { TripStorage } from '../../ports/trip-storage';

export const createNullTripStorage = (): TripStorage => {
  let storedTrip: Trip | null = null;
  let storedCheckoffs: Map<string, string> = new Map();

  return {
    loadTrip: () => storedTrip,
    saveTrip: (trip: Trip) => {
      storedTrip = trip;
    },
    loadCheckoffs: () => new Map(storedCheckoffs),
    saveCheckoffs: (checkoffs: ReadonlyMap<string, string>) => {
      storedCheckoffs = new Map(checkoffs);
    },
    updateItemArea: (oldName: string, newName: string) => {
      if (storedTrip) {
        storedTrip = {
          ...storedTrip,
          items: storedTrip.items.map(item =>
            item.houseArea === oldName
              ? { ...item, houseArea: newName }
              : item
          ),
        };
      }
    },
  };
};
