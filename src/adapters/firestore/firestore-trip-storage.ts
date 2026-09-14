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
  // True while the cache came from the AsyncStorage mirror and the server has
  // not yet sent anything of its own. While armed, a snapshot reporting "no
  // trip" / "no carryover" means "the server has nothing to say" (offline cold
  // start), not "the user deleted everything", so it MUST NOT clobber the
  // mirror. Only a snapshot actually carrying data disarms it — local writes
  // deliberately do not, because a local write is no evidence about server
  // state. For carryover, an existing document with items: [] IS server data
  // (clearCarryover persists []) and disarms; exists=false is silence.
  let tripHydratedFromLocal = false;
  let carryoverHydratedFromLocal = false;
  const { onChange } = options;

  const commitTripChange = (updatedTrip: Trip): void => {
    cachedTrip = updatedTrip;
    persistTripInBackground(db, uid, updatedTrip);
    mirrorTripToAsyncStorage(uid, updatedTrip);
  };

  const commitCarryoverChange = (updatedItems: readonly TripItem[]): void => {
    cachedCarryover = updatedItems;
    persistCarryoverInBackground(db, uid, updatedItems);
    mirrorCarryoverToAsyncStorage(uid, updatedItems);
  };

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
      if (incomingTrip !== null) {
        // Server data has arrived — it is authoritative for the rest of this
        // session, so the empty-snapshot guard stands down.
        tripHydratedFromLocal = false;
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

    cachedCarryover = incomingItems ?? [];
    if (incomingItems !== null) {
      // An existing document (even with items: []) is a stored decision, so
      // the guard stands down; an absent document is silence and leaves it armed.
      carryoverHydratedFromLocal = false;
      mirrorCarryoverToAsyncStorage(uid, cachedCarryover);
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
      commitTripChange(trip);
    },

    loadCheckoffs: (): ReadonlyMap<string, string> => {
      if (!cachedTrip) return new Map();
      return deriveCheckoffsFromItems(cachedTrip.items);
    },

    saveCheckoffs: (checkoffs: ReadonlyMap<string, string>): void => {
      if (!cachedTrip) return;
      const updatedItems = applyCheckoffsToItems(cachedTrip.items, checkoffs);
      commitTripChange({ ...cachedTrip, items: updatedItems });
    },

    updateItemArea: (oldName: string, newName: string): void => {
      if (!cachedTrip) return;
      commitTripChange({
        ...cachedTrip,
        items: cachedTrip.items.map((item) =>
          item.houseArea === oldName
            ? { ...item, houseArea: newName }
            : item
        ),
      });
    },

    saveCarryover: (items: readonly TripItem[]): void => {
      commitCarryoverChange([...items]);
    },

    loadCarryover: (): readonly TripItem[] => [...cachedCarryover],

    clearCarryover: (): void => {
      commitCarryoverChange([]);
    },
  };
};
