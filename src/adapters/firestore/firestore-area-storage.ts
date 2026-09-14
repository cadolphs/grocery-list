// Firestore adapter for AreaStorage port
// Cached reads/writes: initialize() hydrates from AsyncStorage (durable local
// mirror) then subscribes to Firestore via onSnapshot. All ops use the in-memory
// cache. Writes update the cache synchronously and persist both to Firestore
// (network, fire-and-forget) and AsyncStorage (disk mirror, fire-and-forget).
// Optional onChange callback fires when remote data differs from cache
// (own-write echo detection); subscribe() listeners fire on the same deltas.
//
// Why the AsyncStorage mirror: the Firebase JS SDK has no durable cache on React
// Native (persistentLocalCache() throws UNIMPLEMENTED — firebase-js-sdk#7947),
// so the network is otherwise the only source of truth. This adapter's failure
// mode is worse than an empty list: an absent snapshot used to resolve to
// DEFAULT_HOUSE_AREAS, so a cold start on dead wifi replaced a custom-area user's
// areas with the defaults, and groupByArea then silently dropped every trip item
// whose houseArea was no longer listed.
//
// The defaults are a NEW-USER fallback, not an override. Resolution order is:
// mirrored areas, then server areas, then DEFAULT_HOUSE_AREAS when neither has
// anything to say.

import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AreaStorage } from '../../ports/area-storage';
import { DEFAULT_HOUSE_AREAS } from '../async-storage/async-area-storage';

export type FirestoreAreaStorageOptions = {
  readonly onChange?: () => void;
};

export type FirestoreAreaStorage = AreaStorage & {
  readonly initialize: () => Promise<void>;
  readonly unsubscribe: () => void;
};

const buildDocRef = (db: Firestore, uid: string) =>
  doc(db, 'users', uid, 'data', 'areas');

// AsyncStorage key namespace: versioned + uid-scoped, matching buildTripCacheKey
// and buildStapleCacheKey, so mirrors never collide with legacy
// async-area-storage keys or across users.
const buildAreaCacheKey = (uid: string): string =>
  `firestore-cache:v1:${uid}:areas`;

const persistInBackground = (
  db: Firestore,
  uid: string,
  areas: string[]
): void => {
  setDoc(buildDocRef(db, uid), { items: areas });
};

const mirrorAreasToAsyncStorage = (uid: string, areas: string[]): void => {
  // Fire-and-forget: setItem is async but we don't await. Matches the existing
  // setDoc fire-and-forget pattern above.
  AsyncStorage.setItem(buildAreaCacheKey(uid), JSON.stringify(areas));
};

// null means "no usable mirror entry" — the defaults fallback applies.
const readAreasFromAsyncStorage = async (
  uid: string
): Promise<string[] | null> => {
  const raw = await AsyncStorage.getItem(buildAreaCacheKey(uid));
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed as string[];
  } catch {
    return null;
  }
};

// null means "the server has nothing to say" — an absent document, a missing
// field, or an empty list. It is deliberately NOT read as "the user has no areas".
const extractIncomingAreas = (snapshot: {
  exists: () => boolean;
  data: () => { items: string[] } | undefined;
}): string[] | null => {
  if (!snapshot.exists()) return null;
  const parsed = (snapshot.data() as { items?: string[] } | undefined)?.items;
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  return parsed;
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
  // True while the cache came from the AsyncStorage mirror and the server has
  // not yet sent anything of its own. While armed, a snapshot reporting "no
  // areas" means "the server has nothing to say" (offline cold start), not "the
  // user reset to defaults", so it MUST NOT clobber the mirror. Only a snapshot
  // actually carrying areas disarms it — local writes deliberately do not,
  // because a local write is no evidence about server state.
  let hydratedFromLocal = false;
  const { onChange } = options;
  const listeners = new Set<() => void>();

  const notifyListeners = (): void => {
    listeners.forEach((listener) => listener());
  };

  const commitLocalChange = (updatedAreas: string[]): void => {
    cache = updatedAreas;
    persistInBackground(db, uid, cache);
    mirrorAreasToAsyncStorage(uid, cache);
  };

  const handleSnapshot = (snapshot: { exists: () => boolean; data: () => { items: string[] } | undefined }): void => {
    const incomingAreas = extractIncomingAreas(snapshot);
    const serverHasAreas = incomingAreas !== null;

    // Preserve AsyncStorage hydration: if the server says "nothing here" but we
    // have a locally-mirrored list, keep the local copy. The server wins only
    // when it actually carries areas.
    if (!serverHasAreas && hydratedFromLocal && cache.length > 0) {
      return;
    }

    // Neither the mirror nor the server has anything: this is a first-run user.
    const resolvedAreas = incomingAreas ?? [...DEFAULT_HOUSE_AREAS];

    if (!isInitialized) {
      // First snapshot for a uid with no mirror entry: the server is all we have.
      cache = resolvedAreas;
      isInitialized = true;
      return;
    }

    // Subsequent snapshots: compare serialized state for echo detection.
    if (serializeAreas(resolvedAreas) === serializeAreas(cache)) {
      return;
    }

    cache = resolvedAreas;
    if (serverHasAreas) {
      // Server data has arrived — it is authoritative for the rest of this
      // session, so the empty-snapshot guard stands down.
      hydratedFromLocal = false;
      mirrorAreasToAsyncStorage(uid, cache);
    }
    onChange?.();
    notifyListeners();
  };

  return {
    initialize: async (): Promise<void> => {
      // Step 1: hydrate from the local mirror BEFORE subscribing. If the first
      // snapshot then reports the document absent — or never arrives at all,
      // which is what connected-but-dead wifi produces — the mirrored areas are
      // already readable and the guard above protects them. Hydration runs
      // before any listener can register, so it must not notify.
      const localAreas = await readAreasFromAsyncStorage(uid);
      if (localAreas !== null) {
        cache = localAreas;
        isInitialized = true;
        hydratedFromLocal = true;
      }

      // Step 2: readiness. A usable mirror entry (the reader already maps an
      // empty or invalid one to null, so the defaults fallback stays a
      // genuine-no-data fallback) means the cache already holds what the app
      // needs to render, so initialize() resolves without waiting for the
      // network: the Firestore SDK withholds the first snapshot on
      // connected-but-dead wifi until its offline timer fires. With no mirror
      // (first install / new uid) the first snapshot remains the only source of
      // truth, so initialize() awaits it. The subscription is registered in
      // both cases; only the await is skipped.
      const hydratedFromMirror = localAreas !== null;

      // Settles on the first snapshot; later resolve() calls are no-ops.
      const firstSnapshot = new Promise<void>((resolve) => {
        unsubscribeFn = onSnapshot(buildDocRef(db, uid), (snapshot) => {
          handleSnapshot(snapshot as { exists: () => boolean; data: () => { items: string[] } | undefined });
          resolve();
        });
      });

      return hydratedFromMirror ? undefined : firstSnapshot;
    },

    unsubscribe: (): void => {
      unsubscribeFn();
    },

    loadAll: (): string[] => [...cache],

    saveAll: (areas: string[]): void => {
      commitLocalChange([...areas]);
    },

    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};
