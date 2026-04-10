// Firestore adapter for SectionOrderStorage port
// Cached reads/writes: initialize() hydrates from Firestore via onSnapshot, then all ops use in-memory cache.
// Writes update cache synchronously and persist to Firestore in background.
// Optional onChange callback fires when remote data differs from cache (own-write echo detection).

import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';
import { SectionOrderStorage } from '../../ports/section-order-storage';

export type FirestoreSectionOrderStorageOptions = {
  readonly onChange?: () => void;
};

export type FirestoreSectionOrderStorage = SectionOrderStorage & {
  readonly initialize: () => Promise<void>;
  readonly unsubscribe: () => void;
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

const serializeOrder = (order: string[] | null): string =>
  JSON.stringify(order);

export const createFirestoreSectionOrderStorage = (
  db: Firestore,
  uid: string,
  options: FirestoreSectionOrderStorageOptions = {}
): FirestoreSectionOrderStorage => {
  let cache: string[] | null = null;
  let unsubscribeFn: () => void = () => {};
  let isInitialized = false;
  const { onChange } = options;

  const handleSnapshot = (snapshot: { exists: () => boolean; data: () => { order: string[] | null } | undefined }): void => {
    const incomingOrder: string[] | null = snapshot.exists()
      ? (snapshot.data() as { order: string[] | null })?.order ?? null
      : null;

    if (!isInitialized) {
      cache = incomingOrder;
      isInitialized = true;
      return;
    }

    const incomingSerialized = serializeOrder(incomingOrder);
    const currentSerialized = serializeOrder(cache);

    if (incomingSerialized !== currentSerialized) {
      cache = incomingOrder;
      onChange?.();
    }
  };

  return {
    initialize: async (): Promise<void> => {
      return new Promise<void>((resolve) => {
        let resolved = false;
        unsubscribeFn = onSnapshot(buildDocRef(db, uid), (snapshot) => {
          handleSnapshot(snapshot as { exists: () => boolean; data: () => { order: string[] | null } | undefined });
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
