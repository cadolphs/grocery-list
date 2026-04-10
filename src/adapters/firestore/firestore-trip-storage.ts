// Firestore adapter for TripStorage port
// Cached reads/writes: initialize() hydrates from Firestore via onSnapshot, then all ops use in-memory cache.
// Writes update cache synchronously and persist to Firestore in background.
// Optional onChange callback fires when remote data differs from cache (own-write echo detection).

import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';
import { Trip, TripItem } from '../../domain/types';
import { TripStorage } from '../../ports/trip-storage';

export type FirestoreTripStorageOptions = {
  readonly onChange?: () => void;
};

export type FirestoreTripStorage = TripStorage & {
  readonly initialize: () => Promise<void>;
  readonly unsubscribe: () => void;
};

const buildTripDocRef = (db: Firestore, uid: string) =>
  doc(db, 'users', uid, 'data', 'trip');

const buildCarryoverDocRef = (db: Firestore, uid: string) =>
  doc(db, 'users', uid, 'data', 'carryover');

const persistTripInBackground = (
  db: Firestore,
  uid: string,
  trip: Trip
): void => {
  setDoc(buildTripDocRef(db, uid), { trip });
};

const persistCarryoverInBackground = (
  db: Firestore,
  uid: string,
  items: readonly TripItem[]
): void => {
  setDoc(buildCarryoverDocRef(db, uid), { items: [...items] });
};

const serializeTrip = (trip: Trip | null): string =>
  JSON.stringify(trip);

const deriveCheckoffsFromItems = (
  items: readonly TripItem[]
): ReadonlyMap<string, string> => {
  const checkoffs = new Map<string, string>();
  for (const item of items) {
    if (item.checked && item.checkedAt !== null) {
      checkoffs.set(item.name, item.checkedAt);
    }
  }
  return checkoffs;
};

const applyCheckoffsToItems = (
  items: TripItem[],
  checkoffs: ReadonlyMap<string, string>
): TripItem[] =>
  items.map((item) => {
    const checkedAt = checkoffs.get(item.name);
    if (checkedAt !== undefined) {
      return { ...item, checked: true, checkedAt };
    }
    return { ...item, checked: false, checkedAt: null };
  });

export const createFirestoreTripStorage = (
  db: Firestore,
  uid: string,
  options: FirestoreTripStorageOptions = {}
): FirestoreTripStorage => {
  let cachedTrip: Trip | null = null;
  let cachedCarryover: readonly TripItem[] = [];
  let unsubscribeTripFn: () => void = () => {};
  let unsubscribeCarryoverFn: () => void = () => {};
  let isTripInitialized = false;
  const { onChange } = options;

  const handleTripSnapshot = (snapshot: { exists: () => boolean; data: () => { trip: Trip } | undefined }): void => {
    const incomingTrip: Trip | null = snapshot.exists()
      ? (snapshot.data() as { trip: Trip })?.trip ?? null
      : null;

    if (!isTripInitialized) {
      cachedTrip = incomingTrip;
      isTripInitialized = true;
      return;
    }

    const incomingSerialized = serializeTrip(incomingTrip);
    const currentSerialized = serializeTrip(cachedTrip);

    if (incomingSerialized !== currentSerialized) {
      cachedTrip = incomingTrip;
      onChange?.();
    }
  };

  const handleCarryoverSnapshot = (snapshot: { exists: () => boolean; data: () => { items: TripItem[] } | undefined }): void => {
    const incomingItems: readonly TripItem[] = snapshot.exists()
      ? (snapshot.data() as { items: TripItem[] })?.items ?? []
      : [];

    cachedCarryover = incomingItems;
  };

  return {
    initialize: async (): Promise<void> => {
      return new Promise<void>((resolve) => {
        let tripResolved = false;
        let carryoverResolved = false;

        const maybeResolve = () => {
          if (tripResolved && carryoverResolved) {
            resolve();
          }
        };

        unsubscribeTripFn = onSnapshot(buildTripDocRef(db, uid), (snapshot) => {
          handleTripSnapshot(snapshot as { exists: () => boolean; data: () => { trip: Trip } | undefined });
          if (!tripResolved) {
            tripResolved = true;
            maybeResolve();
          }
        });

        unsubscribeCarryoverFn = onSnapshot(buildCarryoverDocRef(db, uid), (snapshot) => {
          handleCarryoverSnapshot(snapshot as { exists: () => boolean; data: () => { items: TripItem[] } | undefined });
          if (!carryoverResolved) {
            carryoverResolved = true;
            maybeResolve();
          }
        });
      });
    },

    unsubscribe: (): void => {
      unsubscribeTripFn();
      unsubscribeCarryoverFn();
    },

    loadTrip: (): Trip | null => cachedTrip ? { ...cachedTrip, items: [...cachedTrip.items] } : null,

    saveTrip: (trip: Trip): void => {
      cachedTrip = trip;
      persistTripInBackground(db, uid, trip);
    },

    loadCheckoffs: (): ReadonlyMap<string, string> => {
      if (!cachedTrip) return new Map();
      return deriveCheckoffsFromItems(cachedTrip.items);
    },

    saveCheckoffs: (checkoffs: ReadonlyMap<string, string>): void => {
      if (!cachedTrip) return;
      const updatedItems = applyCheckoffsToItems(cachedTrip.items, checkoffs);
      cachedTrip = { ...cachedTrip, items: updatedItems };
      persistTripInBackground(db, uid, cachedTrip);
    },

    updateItemArea: (oldName: string, newName: string): void => {
      if (!cachedTrip) return;
      cachedTrip = {
        ...cachedTrip,
        items: cachedTrip.items.map((item) =>
          item.houseArea === oldName
            ? { ...item, houseArea: newName }
            : item
        ),
      };
      persistTripInBackground(db, uid, cachedTrip);
    },

    saveCarryover: (items: readonly TripItem[]): void => {
      cachedCarryover = [...items];
      persistCarryoverInBackground(db, uid, items);
    },

    loadCarryover: (): readonly TripItem[] => [...cachedCarryover],

    clearCarryover: (): void => {
      cachedCarryover = [];
      persistCarryoverInBackground(db, uid, []);
    },
  };
};
