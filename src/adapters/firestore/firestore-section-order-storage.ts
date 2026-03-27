// Firestore adapter for SectionOrderStorage port
// Cached reads/writes: initialize() hydrates from Firestore, then all ops use in-memory cache.
// Writes update cache synchronously and persist to Firestore in background.

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';
import { SectionOrderStorage } from '../../ports/section-order-storage';

export type FirestoreSectionOrderStorage = SectionOrderStorage & {
  readonly initialize: () => Promise<void>;
};

const buildDocRef = (db: Firestore, uid: string) =>
  doc(db, 'users', uid, 'data', 'sectionOrder');

const persistInBackground = (
  db: Firestore,
  uid: string,
  order: string[] | null
): void => {
  setDoc(buildDocRef(db, uid), { order });
};

export const createFirestoreSectionOrderStorage = (
  db: Firestore,
  uid: string
): FirestoreSectionOrderStorage => {
  let cache: string[] | null = null;

  return {
    initialize: async (): Promise<void> => {
      const snapshot = await getDoc(buildDocRef(db, uid));
      if (snapshot.exists()) {
        const data = snapshot.data() as { order: string[] | null };
        cache = data.order ?? null;
      } else {
        cache = null;
      }
    },

    loadOrder: (): string[] | null =>
      cache === null ? null : [...cache],

    saveOrder: (order: string[]): void => {
      cache = [...order];
      persistInBackground(db, uid, cache);
    },

    clearOrder: (): void => {
      cache = null;
      persistInBackground(db, uid, null);
    },
  };
};
