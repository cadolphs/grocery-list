// AsyncStorage adapter for TripStorage port
// Cached reads/writes: initialize() hydrates from disk, then all ops use in-memory cache.
// Writes update cache synchronously and persist to AsyncStorage in background.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trip, TripItem } from '../../domain/types';
import { TripStorage } from '../../ports/trip-storage';

const TRIP_KEY = '@grocery/active_trip';
const CARRYOVER_KEY = '@grocery/trip_carryover';

export type AsyncTripStorage = TripStorage & {
  readonly initialize: () => Promise<void>;
};

const parseTrip = (raw: string | null): Trip | null => {
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as Trip;
  } catch {
    return null;
  }
};

const parseCarryover = (raw: string | null): readonly TripItem[] => {
  if (raw === null) return [];
  try {
    return JSON.parse(raw) as TripItem[];
  } catch {
    return [];
  }
};

export const createAsyncTripStorage = (): AsyncTripStorage => {
  let cachedTrip: Trip | null = null;
  let cachedCarryover: readonly TripItem[] = [];

  return {
    initialize: async (): Promise<void> => {
      const [tripRaw, carryoverRaw] = await Promise.all([
        AsyncStorage.getItem(TRIP_KEY),
        AsyncStorage.getItem(CARRYOVER_KEY),
      ]);
      cachedTrip = parseTrip(tripRaw);
      cachedCarryover = parseCarryover(carryoverRaw);
    },

    loadTrip: (): Trip | null => cachedTrip,

    saveTrip: (trip: Trip): void => {
      cachedTrip = trip;
      AsyncStorage.setItem(TRIP_KEY, JSON.stringify(trip));
    },

    updateItemArea: (oldName: string, newName: string): void => {
      if (cachedTrip) {
        cachedTrip = {
          ...cachedTrip,
          items: cachedTrip.items.map((item) =>
            item.houseArea === oldName ? { ...item, houseArea: newName } : item,
          ),
        };
        AsyncStorage.setItem(TRIP_KEY, JSON.stringify(cachedTrip));
      }
    },
    saveCarryover: (items: readonly TripItem[]): void => {
      cachedCarryover = [...items];
      AsyncStorage.setItem(CARRYOVER_KEY, JSON.stringify(items));
    },
    loadCarryover: (): readonly TripItem[] => [...cachedCarryover],
    clearCarryover: (): void => {
      cachedCarryover = [];
      AsyncStorage.removeItem(CARRYOVER_KEY);
    },
  };
};
