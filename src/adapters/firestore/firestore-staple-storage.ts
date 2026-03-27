// Firestore adapter for StapleStorage port
// Cached reads/writes: initialize() hydrates from Firestore, then all ops use in-memory cache.
// Writes update cache synchronously and persist to Firestore in background.

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';
import { StapleItem } from '../../domain/types';
import { StapleStorage } from '../../ports/staple-storage';

export type FirestoreStapleStorage = StapleStorage & {
  readonly initialize: () => Promise<void>;
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

export const createFirestoreStapleStorage = (
  db: Firestore,
  uid: string
): FirestoreStapleStorage => {
  let cache: StapleItem[] = [];

  return {
    initialize: async (): Promise<void> => {
      const snapshot = await getDoc(buildDocRef(db, uid));
      if (snapshot.exists()) {
        const data = snapshot.data() as { items: StapleItem[] };
        cache = data.items ?? [];
      } else {
        cache = [];
      }
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
