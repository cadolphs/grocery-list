// Firestore adapter for SectionOrderStorage port
// Cached reads/writes: initialize() hydrates from AsyncStorage (durable local
// mirror) then subscribes to Firestore via onSnapshot. All ops use the in-memory
// cache. Writes update the cache synchronously and persist both to Firestore
// (network, fire-and-forget) and AsyncStorage (disk mirror, fire-and-forget).
// Optional onChange callback fires when remote data differs from cache
// (own-write echo detection). Reactive subscribers via subscribe() also fire on
// local saveOrder/clearOrder and on remote-delta snapshots; echoes
// (serialized-equal snapshots) do NOT notify.
//
// Why the AsyncStorage mirror: the Firebase JS SDK has no durable cache on React
// Native (persistentLocalCache() throws UNIMPLEMENTED — firebase-js-sdk#7947),
// so the network is otherwise the only source of truth and a cold start on dead
// wifi reset a saved section order to null.
//
// Absence semantics differ from the staple and area adapters: here `null` is a
// legitimate stored value — the user can deliberately clear the order. The mirror
// therefore stores an ENVELOPE, so "no mirror entry" (AsyncStorage returns null)
// stays distinguishable from "mirrored null" (envelope with order: null). Without
// that distinction the fix would trade a silent wipe for a silent resurrection of
// an order the user cleared.

import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SectionOrderStorage } from '../../ports/section-order-storage';

export type FirestoreSectionOrderStorageOptions = {
  readonly onChange?: () => void;
};

export type FirestoreSectionOrderStorage = SectionOrderStorage & {
  readonly initialize: () => Promise<void>;
  readonly unsubscribe: () => void;
};

// The mirror envelope. Its presence means "this uid has a mirrored decision";
// its `order` field carries that decision, which may legitimately be null.
type MirroredSectionOrder = {
  readonly order: string[] | null;
};

const buildDocRef = (db: Firestore, uid: string) =>
  doc(db, 'users', uid, 'data', 'sectionOrder');

// AsyncStorage key namespace: versioned + uid-scoped, matching buildTripCacheKey
// and buildStapleCacheKey, so mirrors never collide across users.
const buildSectionOrderCacheKey = (uid: string): string =>
  `firestore-cache:v1:${uid}:sectionOrder`;

const persistInBackground = (
  db: Firestore,
  uid: string,
  order: string[] | null
): void => {
  setDoc(buildDocRef(db, uid), { order });
};

const mirrorOrderToAsyncStorage = (uid: string, order: string[] | null): void => {
  // Fire-and-forget: setItem is async but we don't await. Matches the existing
  // setDoc fire-and-forget pattern above.
  const envelope: MirroredSectionOrder = { order };
  AsyncStorage.setItem(buildSectionOrderCacheKey(uid), JSON.stringify(envelope));
};

// Returns null for "no mirror entry", an envelope for "mirrored decision".
const readOrderFromAsyncStorage = async (
  uid: string
): Promise<MirroredSectionOrder | null> => {
  const raw = await AsyncStorage.getItem(buildSectionOrderCacheKey(uid));
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as { order?: unknown } | null;
    if (parsed === null || typeof parsed !== 'object') return null;
    const { order } = parsed;
    if (order === null) return { order: null };
    if (!Array.isArray(order)) return null;
    return { order: order as string[] };
  } catch {
    return null;
  }
};

// null means "the server has nothing to say" — an absent document or a missing
// order field. A remote clear is indistinguishable from silence at this level and
// is deliberately resolved in favour of keeping data (see the guard below).
const extractIncomingOrder = (snapshot: {
  exists: () => boolean;
  data: () => { order: string[] | null } | undefined;
}): string[] | null =>
  snapshot.exists()
    ? (snapshot.data() as { order: string[] | null } | undefined)?.order ?? null
    : null;

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
  // True while the cache came from the AsyncStorage mirror and the server has
  // not yet sent an order of its own. While armed, a snapshot reporting "no
  // order" means "the server has nothing to say" (offline cold start), not "the
  // user cleared the order", so it MUST NOT clobber the mirror. Only a snapshot
  // actually carrying an order disarms it — local writes deliberately do not,
  // because a local write is no evidence about server state.
  let hydratedFromLocal = false;
  const { onChange } = options;
  const listeners = new Set<() => void>();

  const notifySubscribers = (): void => {
    listeners.forEach((listener) => listener());
  };

  const commitLocalChange = (updatedOrder: string[] | null): void => {
    cache = updatedOrder;
    persistInBackground(db, uid, cache);
    mirrorOrderToAsyncStorage(uid, cache);
    notifySubscribers();
  };

  const handleSnapshot = (snapshot: { exists: () => boolean; data: () => { order: string[] | null } | undefined }): void => {
    const incomingOrder = extractIncomingOrder(snapshot);
    const serverHasOrder = incomingOrder !== null;

    // Preserve AsyncStorage hydration: if the server says "nothing here" but we
    // have a locally-mirrored order, keep the local copy. The server wins only
    // when it actually carries an order.
    if (!serverHasOrder && hydratedFromLocal && cache !== null) {
      return;
    }

    if (!isInitialized) {
      // First snapshot for a uid with no mirror entry: the server is all we have.
      cache = incomingOrder;
      isInitialized = true;
      return;
    }

    // Subsequent snapshots: compare serialized state for echo detection.
    if (serializeOrder(incomingOrder) === serializeOrder(cache)) {
      return;
    }

    cache = incomingOrder;
    if (serverHasOrder) {
      // Server data has arrived — it is authoritative for the rest of this
      // session, so the empty-snapshot guard stands down.
      hydratedFromLocal = false;
      mirrorOrderToAsyncStorage(uid, cache);
    }
    onChange?.();
    notifySubscribers();
  };

  return {
    initialize: async (): Promise<void> => {
      // Step 1: hydrate from the local mirror BEFORE subscribing. If the first
      // snapshot then reports the document absent — or never arrives at all,
      // which is what connected-but-dead wifi produces — the mirrored order is
      // already readable and the guard above protects it. Hydration runs before
      // any listener can register, so it must not notify.
      const mirroredOrder = await readOrderFromAsyncStorage(uid);
      if (mirroredOrder !== null) {
        cache = mirroredOrder.order;
        isInitialized = true;
        hydratedFromLocal = true;
      }

      // Step 2: readiness. A mirror envelope — including one whose order is
      // null, which records a deliberate clear — means the cache already holds
      // what the app needs to render, so initialize() resolves without waiting
      // for the network: the Firestore SDK withholds the first snapshot on
      // connected-but-dead wifi until its offline timer fires. With no envelope
      // (first install / new uid) the first snapshot remains the only source of
      // truth, so we await it as before. The subscription is registered in
      // both cases; only the await is skipped.
      const hydratedFromMirror = mirroredOrder !== null;

      const firstSnapshot = new Promise<void>((resolve) => {
        let resolved = false;
        unsubscribeFn = onSnapshot(buildDocRef(db, uid), (snapshot) => {
          handleSnapshot(snapshot as { exists: () => boolean; data: () => { order: string[] | null } | undefined });
          if (!resolved) {
            resolved = true;
            resolve();
          }
        });
      });

      return hydratedFromMirror ? undefined : firstSnapshot;
    },

    unsubscribe: (): void => {
      unsubscribeFn();
    },

    loadOrder: (): string[] | null =>
      cache === null ? null : [...cache],

    saveOrder: (order: string[]): void => {
      commitLocalChange([...order]);
    },

    clearOrder: (): void => {
      commitLocalChange(null);
    },

    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};
