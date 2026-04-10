// Firestore adapter for StapleStorage port
// Cached reads/writes: initialize() hydrates from Firestore via onSnapshot, then all ops use in-memory cache.
// Writes update cache synchronously and persist to Firestore in background.
// Optional onChange callback fires when remote data differs from cache (own-write echo detection).

import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';
import { StapleItem } from '../../domain/types';
import { StapleStorage } from '../../ports/staple-storage';

export type FirestoreStapleStorageOptions = {
  readonly onChange?: () => void;
};

export type FirestoreStapleStorage = StapleStorage & {
  readonly initialize: () => Promise<void>;
  readonly unsubscribe: () => void;
};

const buildDocRef = (db: Firestore, uid: string) =>
  doc(db, 'users', uid, 'data', 'staples');

const persistInBackground = (
  db: Firestore,
  uid: string,
  items: StapleItem[]
): void => {
  setDoc(buildDocRef(db, uid), { items });
};

const serializeItems = (items: StapleItem[]): string =>
  JSON.stringify(items);

export const createFirestoreStapleStorage = (
  db: Firestore,
  uid: string,
  options: FirestoreStapleStorageOptions = {}
): FirestoreStapleStorage => {
  let cache: StapleItem[] = [];
  let unsubscribeFn: () => void = () => {};
  let isInitialized = false;
  const { onChange } = options;

  const handleSnapshot = (snapshot: { exists: () => boolean; data: () => { items: StapleItem[] } | undefined }): void => {
    const incomingItems: StapleItem[] = snapshot.exists()
      ? (snapshot.data() as { items: StapleItem[] })?.items ?? []
      : [];

    if (!isInitialized) {
      // First snapshot: hydrate cache
      cache = incomingItems;
      isInitialized = true;
      return;
    }

    // Subsequent snapshots: compare serialized state for echo detection
    const incomingSerialized = serializeItems(incomingItems);
    const currentSerialized = serializeItems(cache);

    if (incomingSerialized !== currentSerialized) {
      cache = incomingItems;
      onChange?.();
    }
  };

  return {
    initialize: async (): Promise<void> => {
      return new Promise<void>((resolve) => {
        let resolved = false;
        unsubscribeFn = onSnapshot(buildDocRef(db, uid), (snapshot) => {
          handleSnapshot(snapshot as { exists: () => boolean; data: () => { items: StapleItem[] } | undefined });
          if (!resolved) {
            resolved = true;
            resolve();
          }
        });
      });
    },

    unsubscribe: (): void => {
      unsubscribeFn();
    },

    loadAll: (): StapleItem[] => [...cache],

    save: (item: StapleItem): void => {
      cache = [...cache, item];
      persistInBackground(db, uid, cache);
    },

    remove: (id: string): void => {
      const index = cache.findIndex((item) => item.id === id);
      if (index !== -1) {
        cache = [...cache.slice(0, index), ...cache.slice(index + 1)];
        persistInBackground(db, uid, cache);
      }
    },

    update: (updatedItem: StapleItem): void => {
      cache = cache.map((item) =>
        item.id === updatedItem.id ? updatedItem : item
      );
      persistInBackground(db, uid, cache);
    },

    search: (query: string): StapleItem[] => {
      if (query.trim() === '') return [];
      const lowerQuery = query.toLowerCase();
      return cache.filter((item) =>
        item.name.toLowerCase().includes(lowerQuery)
      );
    },

    updateArea: (oldName: string, newName: string): void => {
      cache = cache.map((item) =>
        item.houseArea === oldName
          ? { ...item, houseArea: newName }
          : item
      );
      persistInBackground(db, uid, cache);
    },
  };
};
