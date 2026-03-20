// AsyncStorage adapter for AreaStorage port
// Cached reads/writes: initialize() hydrates from disk, then all ops use in-memory cache.
// Writes update cache synchronously and persist to AsyncStorage in background.
// On fresh install (null in storage), seeds with default house areas.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AreaStorage } from '../../ports/area-storage';

const STORAGE_KEY = '@grocery/house_areas';

const DEFAULT_AREAS: readonly string[] = [
  'Bathroom',
  'Garage Pantry',
  'Kitchen Cabinets',
  'Fridge',
  'Freezer',
];

export type AsyncAreaStorage = AreaStorage & {
  readonly initialize: () => Promise<void>;
};

const parseAreas = (raw: string | null): string[] | null => {
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as string[];
    return null;
  } catch {
    return null;
  }
};

const persistInBackground = (areas: string[]): void => {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(areas));
};

export const createAsyncAreaStorage = (): AsyncAreaStorage => {
  let cache: string[] = [];

  return {
    initialize: async (): Promise<void> => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = parseAreas(raw);

      if (parsed !== null) {
        cache = parsed;
      } else {
        // Fresh install or corrupt data: seed defaults
        cache = [...DEFAULT_AREAS];
        persistInBackground(cache);
      }
    },

    loadAll: (): string[] => [...cache],

    saveAll: (areas: string[]): void => {
      cache = [...areas];
      persistInBackground(cache);
    },
  };
};
