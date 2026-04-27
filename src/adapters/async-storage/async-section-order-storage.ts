// AsyncStorage adapter for SectionOrderStorage port
// Cached reads/writes: initialize() hydrates from disk, then all ops use in-memory cache.
// Writes update cache synchronously and persist to AsyncStorage in background.
// null = no custom order (default sort).
// Reactive subscribers via subscribe() are notified on every saveOrder/clearOrder.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SectionOrderStorage } from '../../ports/section-order-storage';

const STORAGE_KEY = '@grocery/section_order';

export type AsyncSectionOrderStorage = SectionOrderStorage & {
  readonly initialize: () => Promise<void>;
};

const parseOrder = (raw: string | null): string[] | null => {
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as string[];
    return null;
  } catch {
    return null;
  }
};

const persistInBackground = (order: string[] | null): void => {
  if (order === null) {
    AsyncStorage.removeItem(STORAGE_KEY);
  } else {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  }
};

export const createAsyncSectionOrderStorage = (): AsyncSectionOrderStorage => {
  let cache: string[] | null = null;
  const listeners = new Set<() => void>();

  const notifySubscribers = (): void => {
    listeners.forEach((listener) => listener());
  };

  return {
    initialize: async (): Promise<void> => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      cache = parseOrder(raw);
    },

    loadOrder: (): string[] | null => (cache === null ? null : [...cache]),

    saveOrder: (order: string[]): void => {
      cache = [...order];
      persistInBackground(cache);
      notifySubscribers();
    },

    clearOrder: (): void => {
      cache = null;
      persistInBackground(null);
      notifySubscribers();
    },

    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};
