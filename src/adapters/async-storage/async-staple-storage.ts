// AsyncStorage adapter for StapleStorage port
// Cached reads/writes: initialize() hydrates from disk, then all ops use in-memory cache.
// Writes update cache synchronously and persist to AsyncStorage in background.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StapleItem } from '../../domain/types';
import { StapleStorage } from '../../ports/staple-storage';

const STORAGE_KEY = '@grocery/staple_library';

export type AsyncStapleStorage = StapleStorage & {
  readonly initialize: () => Promise<void>;
};

const parseItems = (raw: string | null): StapleItem[] => {
  if (raw === null) return [];
  try {
    return JSON.parse(raw) as StapleItem[];
  } catch {
    return [];
  }
};

const persistInBackground = (items: StapleItem[]): void => {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

export const createAsyncStapleStorage = (): AsyncStapleStorage => {
  let cache: StapleItem[] = [];

  return {
    initialize: async (): Promise<void> => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      cache = parseItems(raw);
    },

    loadAll: (): StapleItem[] => [...cache],

    save: (item: StapleItem): void => {
      cache = [...cache, item];
      persistInBackground(cache);
    },

    remove: (id: string): void => {
      const index = cache.findIndex((item) => item.id === id);
      if (index !== -1) {
        cache = [...cache.slice(0, index), ...cache.slice(index + 1)];
        persistInBackground(cache);
      }
    },

    update: (updatedItem: StapleItem): void => {
      cache = cache.map(item =>
        item.id === updatedItem.id ? updatedItem : item
      );
      persistInBackground(cache);
    },

    search: (query: string): StapleItem[] => {
      if (query.trim() === '') return [];
      const lowerQuery = query.toLowerCase();
      return cache.filter((item) =>
        item.name.toLowerCase().includes(lowerQuery)
      );
    },

    updateArea: (oldName: string, newName: string): void => {
      cache = cache.map(item =>
        item.houseArea === oldName
          ? { ...item, houseArea: newName }
          : item
      );
      persistInBackground(cache);
    },
  };
};
