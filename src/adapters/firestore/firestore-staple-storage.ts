// Firestore adapter for StapleStorage port
// Cached reads/writes: initialize() hydrates from AsyncStorage (durable local
// mirror) then subscribes to Firestore via onSnapshot. All ops use the in-memory
// cache. Writes update the cache synchronously and persist both to Firestore
// (network, fire-and-forget) and AsyncStorage (disk mirror, fire-and-forget).
// Optional onChange callback fires when remote data differs from cache
// (own-write echo detection).
//
// Why the AsyncStorage mirror: the Firebase JS SDK has no durable cache on React
// Native (persistentLocalCache() throws UNIMPLEMENTED — firebase-js-sdk#7947),
// so the network is otherwise the only source of truth. Without the mirror a
// cold start on dead or flapping wifi yields an empty staple library, which then
// propagates into the completed-trip rebuild and erases stored trip items.
// Mirrors the contract already shipped in firestore-trip-storage.ts.

import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// AsyncStorage key namespace: versioned + uid-scoped, matching buildTripCacheKey,
// so mirrors never collide with legacy async-staple-storage keys or across users.
const buildStapleCacheKey = (uid: string): string =>
  `firestore-cache:v1:${uid}:staples`;

const persistInBackground = (
  db: Firestore,
  uid: string,
  items: StapleItem[]
): void => {
  setDoc(buildDocRef(db, uid), { items });
};

const mirrorStaplesToAsyncStorage = (uid: string, items: StapleItem[]): void => {
  // Fire-and-forget: setItem is async but we don't await. Matches the existing
  // setDoc fire-and-forget pattern above.
  AsyncStorage.setItem(buildStapleCacheKey(uid), JSON.stringify(items));
};

const readStaplesFromAsyncStorage = async (
  uid: string
): Promise<StapleItem[] | null> => {
  const raw = await AsyncStorage.getItem(buildStapleCacheKey(uid));
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as StapleItem[];
  } catch {
    return null;
  }
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
  // True while the cache came from the AsyncStorage mirror and the server has
  // not yet sent anything of its own. While armed, a snapshot reporting "no
  // staples" means "the server has nothing to say" (offline cold start), not
  // "the user deleted everything", so it MUST NOT clobber the mirror. Only a
  // snapshot actually carrying data disarms it — local writes deliberately do
  // not, because a local write is no evidence about server state.
  let hydratedFromLocal = false;
  const { onChange } = options;

  const commitLocalChange = (updatedItems: StapleItem[]): void => {
    cache = updatedItems;
    persistInBackground(db, uid, cache);
    mirrorStaplesToAsyncStorage(uid, cache);
  };

  const handleSnapshot = (snapshot: { exists: () => boolean; data: () => { items: StapleItem[] } | undefined }): void => {
    const incomingItems: StapleItem[] | null = snapshot.exists()
      ? (snapshot.data() as { items: StapleItem[] })?.items ?? null
      : null;
    const serverHasStaples = incomingItems !== null && incomingItems.length > 0;

    // Preserve AsyncStorage hydration: if the server says "nothing here" but we
    // have a locally-mirrored library, keep the local copy. The server wins only
    // when it actually carries data.
    if (!serverHasStaples && hydratedFromLocal && cache.length > 0) {
      return;
    }

    const resolvedItems = incomingItems ?? [];

    if (!isInitialized) {
      // First snapshot for a uid with no mirror entry: the server is all we have.
      cache = resolvedItems;
      isInitialized = true;
      return;
    }

    // Subsequent snapshots: compare serialized state for echo detection.
    if (serializeItems(resolvedItems) === serializeItems(cache)) {
      return;
    }

    cache = resolvedItems;
    if (serverHasStaples) {
      // Server data has arrived — it is authoritative for the rest of this
      // session, so the empty-snapshot guard stands down.
      hydratedFromLocal = false;
      mirrorStaplesToAsyncStorage(uid, cache);
    }
    onChange?.();
  };

  return {
    initialize: async (): Promise<void> => {
      // Step 1: hydrate from the local mirror BEFORE subscribing. If the first
      // snapshot then reports the document absent — or never arrives at all,
      // which is what connected-but-dead wifi produces — the mirrored library is
      // already readable and the guard above protects it.
      const localStaples = await readStaplesFromAsyncStorage(uid);
      if (localStaples !== null) {
        cache = localStaples;
        isInitialized = true;
        hydratedFromLocal = true;
      }

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
      commitLocalChange([...cache, item]);
    },

    remove: (id: string): void => {
      const index = cache.findIndex((item) => item.id === id);
      if (index === -1) return;
      commitLocalChange([...cache.slice(0, index), ...cache.slice(index + 1)]);
    },

    update: (updatedItem: StapleItem): void => {
      commitLocalChange(
        cache.map((item) => (item.id === updatedItem.id ? updatedItem : item))
      );
    },

    search: (query: string): StapleItem[] => {
      if (query.trim() === '') return [];
      const lowerQuery = query.toLowerCase();
      return cache.filter((item) =>
        item.name.toLowerCase().includes(lowerQuery)
      );
    },

    updateArea: (oldName: string, newName: string): void => {
      commitLocalChange(
        cache.map((item) =>
          item.houseArea === oldName ? { ...item, houseArea: newName } : item
        )
      );
    },
  };
};
