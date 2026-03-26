// Null adapter for TripStorage - in-memory implementation for testing

import { Trip, TripItem } from '../../domain/types';
import { TripStorage } from '../../ports/trip-storage';

export const createNullTripStorage = (): TripStorage => {
  let storedTrip: Trip | null = null;
  let storedCheckoffs: Map<string, string> = new Map();
  let storedCarryover: readonly TripItem[] = [];

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
    saveCarryover: (items: readonly TripItem[]) => {
      storedCarryover = [...items];
    },
    loadCarryover: () => [...storedCarryover],
    clearCarryover: () => {
      storedCarryover = [];
    },
  };
};
