// AsyncStorage adapter for TripStorage port
// Cached reads/writes: initialize() hydrates from disk, then all ops use in-memory cache.
// Writes update cache synchronously and persist to AsyncStorage in background.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trip } from '../../domain/types';
import { TripStorage } from '../../ports/trip-storage';

const TRIP_KEY = '@grocery/active_trip';
const CHECKOFFS_KEY = '@grocery/trip_checkoffs';

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

const parseCheckoffs = (raw: string | null): Map<string, string> => {
  if (raw === null) return new Map();
  try {
    const obj = JSON.parse(raw) as Record<string, string>;
    return new Map(Object.entries(obj));
  } catch {
    return new Map();
  }
};

const checkoffsToJson = (checkoffs: ReadonlyMap<string, string>): string => {
  const obj: Record<string, string> = {};
  checkoffs.forEach((value, key) => {
    obj[key] = value;
  });
  return JSON.stringify(obj);
};

export const createAsyncTripStorage = (): AsyncTripStorage => {
  let cachedTrip: Trip | null = null;
  let cachedCheckoffs: Map<string, string> = new Map();

  return {
    initialize: async (): Promise<void> => {
      const [tripRaw, checkoffsRaw] = await Promise.all([
        AsyncStorage.getItem(TRIP_KEY),
        AsyncStorage.getItem(CHECKOFFS_KEY),
      ]);
      cachedTrip = parseTrip(tripRaw);
      cachedCheckoffs = parseCheckoffs(checkoffsRaw);
    },

    loadTrip: (): Trip | null => cachedTrip,

    saveTrip: (trip: Trip): void => {
      cachedTrip = trip;
      AsyncStorage.setItem(TRIP_KEY, JSON.stringify(trip));
    },

    loadCheckoffs: (): ReadonlyMap<string, string> => new Map(cachedCheckoffs),

    saveCheckoffs: (checkoffs: ReadonlyMap<string, string>): void => {
      cachedCheckoffs = new Map(checkoffs);
      AsyncStorage.setItem(CHECKOFFS_KEY, checkoffsToJson(checkoffs));
    },
  };
};
