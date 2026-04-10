// Null adapter for TripStorage - in-memory implementation for testing

import { Trip, TripItem } from '../../domain/types';
import { TripStorage } from '../../ports/trip-storage';

type NullTripStorageOptions = {
  readonly onChange?: () => void;
};

export type NullTripStorageWithSync = TripStorage & {
  readonly simulateRemoteChange: (updater: (storage: TripStorage) => void) => void;
  readonly unsubscribe: () => void;
};

export const createNullTripStorage = (
  options: NullTripStorageOptions = {}
): NullTripStorageWithSync => {
  let storedTrip: Trip | null = null;
  let storedCheckoffs: Map<string, string> = new Map();
  let storedCarryover: readonly TripItem[] = [];
  const { onChange } = options;

  const storage: NullTripStorageWithSync = {
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
    simulateRemoteChange: (updater: (storage: TripStorage) => void) => {
      updater(storage);
      onChange?.();
    },
    unsubscribe: () => {},
  };

  return storage;
};
