// Firestore adapter for TripStorage port
// Cached reads/writes: initialize() hydrates from AsyncStorage (durable local
// mirror) then subscribes to Firestore via onSnapshot. All ops use in-memory
// cache. Writes update cache synchronously and persist both to Firestore
// (network, fire-and-forget) and AsyncStorage (disk mirror, fire-and-forget).
// Optional onChange callback fires when remote data differs from cache
// (own-write echo detection).
//
// Why AsyncStorage mirror: Firebase JS SDK v12 has no durable cache on React
// Native (persistentLocalCache() throws UNIMPLEMENTED — see
// firebase-js-sdk#7947). Without this mirror, a cold-start while offline
// returns empty state from onSnapshot and the user loses their trip.

import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// AsyncStorage key namespace: versioned + uid-scoped to avoid collision with
// legacy async-trip-storage keys (e.g. @grocery/active_trip).
const buildTripCacheKey = (uid: string): string =>
  `firestore-cache:v1:${uid}:trip`;

const buildCarryoverCacheKey = (uid: string): string =>
  `firestore-cache:v1:${uid}:carryover`;

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

const mirrorTripToAsyncStorage = (uid: string, trip: Trip): void => {
  // Fire-and-forget: AsyncStorage.setItem is async but we don't await. Matches
  // the existing setDoc fire-and-forget pattern above.
  AsyncStorage.setItem(buildTripCacheKey(uid), JSON.stringify(trip));
};

const mirrorCarryoverToAsyncStorage = (
  uid: string,
  items: readonly TripItem[]
): void => {
  AsyncStorage.setItem(buildCarryoverCacheKey(uid), JSON.stringify(items));
};

const readTripFromAsyncStorage = async (uid: string): Promise<Trip | null> => {
  const raw = await AsyncStorage.getItem(buildTripCacheKey(uid));
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as Trip;
  } catch {
    return null;
  }
};

const readCarryoverFromAsyncStorage = async (
  uid: string
): Promise<readonly TripItem[] | null> => {
  const raw = await AsyncStorage.getItem(buildCarryoverCacheKey(uid));
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as readonly TripItem[];
  } catch {
    return null;
  }
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
  // Tracks whether the current cachedTrip came from the AsyncStorage mirror
  // (as opposed to a Firestore snapshot). When true, an incoming empty
  // snapshot (exists=false) MUST NOT clobber the cache — the server simply
  // has no data yet (offline / cold-start) and our local mirror is the truth.
  let tripHydratedFromLocal = false;
  let carryoverHydratedFromLocal = false;
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

    // Preserve AsyncStorage hydration: if server says "nothing here" but we
    // have a locally-mirrored trip, keep the local copy. Server wins only
    // when it actually has data.
    if (incomingTrip === null && tripHydratedFromLocal && cachedTrip !== null) {
      return;
    }

    const incomingSerialized = serializeTrip(incomingTrip);
    const currentSerialized = serializeTrip(cachedTrip);

    if (incomingSerialized !== currentSerialized) {
      cachedTrip = incomingTrip;
      // Once server data arrives, future empty-snapshot protection is off —
      // the server is now authoritative for this session.
      tripHydratedFromLocal = false;
      if (incomingTrip !== null) {
        mirrorTripToAsyncStorage(uid, incomingTrip);
      }
      onChange?.();
    }
  };

  const handleCarryoverSnapshot = (snapshot: { exists: () => boolean; data: () => { items: TripItem[] } | undefined }): void => {
    const incomingItems: readonly TripItem[] | null = snapshot.exists()
      ? (snapshot.data() as { items: TripItem[] })?.items ?? []
      : null;

    // Preserve AsyncStorage hydration for carryover on empty snapshot — same
    // rationale as the trip path above.
    if (incomingItems === null && carryoverHydratedFromLocal && cachedCarryover.length > 0) {
      return;
    }

    const resolved = incomingItems ?? [];
    cachedCarryover = resolved;
    carryoverHydratedFromLocal = false;
    if (incomingItems !== null) {
      mirrorCarryoverToAsyncStorage(uid, resolved);
    }
  };

  return {
    initialize: async (): Promise<void> => {
      // Step 1: hydrate cache from AsyncStorage BEFORE subscribing to
      // Firestore. This way if the first onSnapshot fires exists=false
      // (offline cold-start, no remote doc yet), the mirrored data is already
      // in memory and the empty-snapshot guard above prevents clobbering.
      const [localTrip, localCarryover] = await Promise.all([
        readTripFromAsyncStorage(uid),
        readCarryoverFromAsyncStorage(uid),
      ]);

      if (localTrip !== null) {
        cachedTrip = localTrip;
        isTripInitialized = true;
        tripHydratedFromLocal = true;
      }
      if (localCarryover !== null) {
        cachedCarryover = localCarryover;
        carryoverHydratedFromLocal = true;
      }

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
      tripHydratedFromLocal = false;
      persistTripInBackground(db, uid, trip);
      mirrorTripToAsyncStorage(uid, trip);
    },

    loadCheckoffs: (): ReadonlyMap<string, string> => {
      if (!cachedTrip) return new Map();
      return deriveCheckoffsFromItems(cachedTrip.items);
    },

    saveCheckoffs: (checkoffs: ReadonlyMap<string, string>): void => {
      if (!cachedTrip) return;
      const updatedItems = applyCheckoffsToItems(cachedTrip.items, checkoffs);
      cachedTrip = { ...cachedTrip, items: updatedItems };
      tripHydratedFromLocal = false;
      persistTripInBackground(db, uid, cachedTrip);
      mirrorTripToAsyncStorage(uid, cachedTrip);
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
      tripHydratedFromLocal = false;
      persistTripInBackground(db, uid, cachedTrip);
      mirrorTripToAsyncStorage(uid, cachedTrip);
    },

    saveCarryover: (items: readonly TripItem[]): void => {
      cachedCarryover = [...items];
      carryoverHydratedFromLocal = false;
      persistCarryoverInBackground(db, uid, items);
      mirrorCarryoverToAsyncStorage(uid, items);
    },

    loadCarryover: (): readonly TripItem[] => [...cachedCarryover],

    clearCarryover: (): void => {
      cachedCarryover = [];
      carryoverHydratedFromLocal = false;
      persistCarryoverInBackground(db, uid, []);
      mirrorCarryoverToAsyncStorage(uid, []);
    },
  };
};
