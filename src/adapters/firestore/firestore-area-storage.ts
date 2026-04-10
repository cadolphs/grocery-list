// Firestore adapter for AreaStorage port
// Cached reads/writes: initialize() hydrates from Firestore via onSnapshot, then all ops use in-memory cache.
// Writes update cache synchronously and persist to Firestore in background.
// Optional onChange callback fires when remote data differs from cache (own-write echo detection).

import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';
import { AreaStorage } from '../../ports/area-storage';

export type FirestoreAreaStorageOptions = {
  readonly onChange?: () => void;
};

export type FirestoreAreaStorage = AreaStorage & {
  readonly initialize: () => Promise<void>;
  readonly unsubscribe: () => void;
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

const serializeAreas = (areas: string[]): string =>
  JSON.stringify(areas);

export const createFirestoreAreaStorage = (
  db: Firestore,
  uid: string,
  options: FirestoreAreaStorageOptions = {}
): FirestoreAreaStorage => {
  let cache: string[] = [];
  let unsubscribeFn: () => void = () => {};
  let isInitialized = false;
  const { onChange } = options;

  const handleSnapshot = (snapshot: { exists: () => boolean; data: () => { items: string[] } | undefined }): void => {
    const incomingAreas: string[] = snapshot.exists()
      ? (snapshot.data() as { items: string[] })?.items ?? []
      : [];

    if (!isInitialized) {
      cache = incomingAreas;
      isInitialized = true;
      return;
    }

    const incomingSerialized = serializeAreas(incomingAreas);
    const currentSerialized = serializeAreas(cache);

    if (incomingSerialized !== currentSerialized) {
      cache = incomingAreas;
      onChange?.();
    }
  };

  return {
    initialize: async (): Promise<void> => {
      return new Promise<void>((resolve) => {
        let resolved = false;
        unsubscribeFn = onSnapshot(buildDocRef(db, uid), (snapshot) => {
          handleSnapshot(snapshot as { exists: () => boolean; data: () => { items: string[] } | undefined });
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

    loadAll: (): string[] => [...cache],

    saveAll: (areas: string[]): void => {
      cache = [...areas];
      persistInBackground(db, uid, cache);
    },
  };
};
