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
//
// Local-write watermark (fix-offline-edit-stale-server): every local write is
// stamped with a client-generated `writtenAt`, sent on the document and kept
// in the v2 mirror envelope. When a data-bearing snapshot arrives, an OLDER
// stamped document is re-pushed with the mirrored value (REPUSH) instead of
// replacing it; a newer, equal or unstamped one is adopted as before (ADOPT).
// See local-write-watermark.ts for the rule and its rationale.

import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';
import { StapleItem } from '../../domain/types';
import { StapleStorage } from '../../ports/staple-storage';
import {
  DocumentWatermark,
  UNSTAMPED,
  buildRawJsonV1Parser,
  extractWrittenAt,
  mintLocalStamp,
  observeStamp,
  rePushStamp,
  readMirrorEnvelope,
  writeMirrorEnvelope,
} from './local-write-watermark';

export type FirestoreStapleStorageOptions = {
  readonly onChange?: () => void;
};

export type FirestoreStapleStorage = StapleStorage & {
  readonly initialize: () => Promise<void>;
  readonly unsubscribe: () => void;
};

type StapleDocumentData = { readonly items?: StapleItem[]; readonly writtenAt?: number };

type DocumentSnapshot = {
  exists: () => boolean;
  data: () => StapleDocumentData | undefined;
};

const buildDocRef = (db: Firestore, uid: string) =>
  doc(db, 'users', uid, 'data', 'staples');

const persistInBackground = (
  db: Firestore,
  uid: string,
  items: StapleItem[],
  writtenAt: number
): void => {
  setDoc(buildDocRef(db, uid), { items, writtenAt });
};

// --- AsyncStorage mirror (v2 envelope, v1 fallback) ---

const isStapleItemList = (candidate: unknown): candidate is StapleItem[] =>
  Array.isArray(candidate);

// Pre-upgrade v1 mirrors hold the raw JSON array under the v1 key.
const readStapleMirror = (uid: string) =>
  readMirrorEnvelope<StapleItem[]>(uid, 'staples', buildRawJsonV1Parser(isStapleItemList), isStapleItemList);

const serializeItems = (items: StapleItem[]): string =>
  JSON.stringify(items);

export const createFirestoreStapleStorage = (
  db: Firestore,
  uid: string,
  options: FirestoreStapleStorageOptions = {}
): FirestoreStapleStorage => {
  let cache: StapleItem[] = [];
  let watermark: DocumentWatermark = UNSTAMPED;
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
    const writtenAt = mintLocalStamp(watermark);
    cache = updatedItems;
    watermark = observeStamp(watermark, writtenAt);
    persistInBackground(db, uid, cache, writtenAt);
    writeMirrorEnvelope(uid, 'staples', cache, writtenAt);
  };

  const handleSnapshot = (snapshot: DocumentSnapshot): void => {
    const data = snapshot.exists() ? snapshot.data() : undefined;
    const incomingItems: StapleItem[] | null = data?.items ?? null;
    const serverHasStaples = incomingItems !== null && incomingItems.length > 0;
    const serverWrittenAt = extractWrittenAt(data);

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
      watermark = observeStamp(watermark, serverWrittenAt);
      isInitialized = true;
      return;
    }

    // Subsequent snapshots: compare serialized state for echo detection.
    if (serializeItems(resolvedItems) === serializeItems(cache)) {
      return;
    }

    // Server data has arrived — it is authoritative for the rest of this
    // session, so the empty-snapshot guard stands down on both branches below.
    const rePushWrittenAt = serverHasStaples ? rePushStamp(watermark, serverWrittenAt) : null;
    if (rePushWrittenAt !== null) {
      // The server holds an older document than the edit in cache: push the
      // edit back with its own stamp. The echo carries that stamp and equal
      // content, so it short-circuits above and cannot loop.
      hydratedFromLocal = false;
      persistInBackground(db, uid, cache, rePushWrittenAt);
      return;
    }

    cache = resolvedItems;
    watermark = observeStamp(watermark, serverWrittenAt);
    if (serverHasStaples) {
      hydratedFromLocal = false;
      writeMirrorEnvelope(uid, 'staples', cache, serverWrittenAt);
    }
    onChange?.();
  };

  return {
    initialize: async (): Promise<void> => {
      // Step 1: hydrate from the local mirror BEFORE subscribing. If the first
      // snapshot then reports the document absent — or never arrives at all,
      // which is what connected-but-dead wifi produces — the mirrored library is
      // already readable and the guard above protects it.
      const mirror = await readStapleMirror(uid);
      if (mirror !== null) {
        cache = mirror.value;
        watermark = observeStamp(watermark, mirror.writtenAt);
        isInitialized = true;
        hydratedFromLocal = true;
      }

      // Step 2: readiness. A mirror entry — including a mirrored empty list,
      // which records a deliberate decision — means the cache already holds
      // what the app needs to render, so initialize() resolves without waiting
      // for the network: the Firestore SDK withholds the first snapshot on
      // connected-but-dead wifi until its offline timer fires. With no mirror
      // (first install / new uid) the first snapshot remains the only source of
      // truth, so initialize() awaits it. The subscription is registered in
      // both cases; only the await is skipped.
      const hydratedFromMirror = mirror !== null;

      // Settles on the first snapshot; later resolve() calls are no-ops.
      const firstSnapshot = new Promise<void>((resolve) => {
        unsubscribeFn = onSnapshot(buildDocRef(db, uid), (snapshot) => {
          handleSnapshot(snapshot as DocumentSnapshot);
          resolve();
        });
      });

      return hydratedFromMirror ? undefined : firstSnapshot;
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
