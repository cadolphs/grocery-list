// Firestore adapter for AreaStorage port
// Cached reads/writes: initialize() hydrates from Firestore, then all ops use in-memory cache.
// Writes update cache synchronously and persist to Firestore in background.

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';
import { AreaStorage } from '../../ports/area-storage';

export type FirestoreAreaStorage = AreaStorage & {
  readonly initialize: () => Promise<void>;
};

const buildDocRef = (db: Firestore, uid: string) =>
  doc(db, 'users', uid, 'data', 'areas');

const persistInBackground = (
  db: Firestore,
  uid: string,
  areas: string[]
): void => {
  setDoc(buildDocRef(db, uid), { items: areas });
};

export const createFirestoreAreaStorage = (
  db: Firestore,
  uid: string
): FirestoreAreaStorage => {
  let cache: string[] = [];

  return {
    initialize: async (): Promise<void> => {
      const snapshot = await getDoc(buildDocRef(db, uid));
      if (snapshot.exists()) {
        const data = snapshot.data() as { items: string[] };
        cache = data.items ?? [];
      } else {
        cache = [];
      }
    },

    loadAll: (): string[] => [...cache],

    saveAll: (areas: string[]): void => {
      cache = [...areas];
      persistInBackground(db, uid, cache);
    },
  };
};
