// AsyncStorage adapter for LibraryStorage port
// Cached reads/writes: initialize() hydrates from disk, then all ops use in-memory cache.
// Writes update cache synchronously and persist to AsyncStorage in background.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LibraryItem } from '../../domain/types';
import { LibraryStorage } from '../../ports/library-storage';

const STORAGE_KEY = '@grocery/staple_library';

export type AsyncLibraryStorage = LibraryStorage & {
  readonly initialize: () => Promise<void>;
};

const parseItems = (raw: string | null): LibraryItem[] => {
  if (raw === null) return [];
  try {
    return JSON.parse(raw) as LibraryItem[];
  } catch {
    return [];
  }
};

const persistInBackground = (items: LibraryItem[]): void => {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

export const createAsyncLibraryStorage = (): AsyncLibraryStorage => {
  let cache: LibraryItem[] = [];

  return {
    initialize: async (): Promise<void> => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      cache = parseItems(raw);
    },

    loadAll: (): LibraryItem[] => [...cache],

    save: (item: LibraryItem): void => {
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

    update: (updatedItem: LibraryItem): void => {
      cache = cache.map((item) =>
        item.id === updatedItem.id ? updatedItem : item,
      );
      persistInBackground(cache);
    },

    search: (query: string): LibraryItem[] => {
      if (query.trim() === '') return [];
      const lowerQuery = query.toLowerCase();
      return cache.filter((item) =>
        item.name.toLowerCase().includes(lowerQuery),
      );
    },

    updateArea: (oldName: string, newName: string): void => {
      cache = cache.map((item) =>
        item.houseArea === oldName ? { ...item, houseArea: newName } : item,
      );
      persistInBackground(cache);
    },
  };
};
